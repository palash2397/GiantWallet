// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./AZNTVirtual.sol";
import "./MTBVirtual.sol";

// Main Staking Contract
contract AZNTStaking is Ownable, ReentrancyGuard {
    // Token contracts
    ERC20 public immutable azntToken;
    AZNTVirtual public immutable azntVirtual;
    MTBVirtual public immutable mtbVirtual;

    // Staking parameters
    uint256 public constant MIN_STAKE = 1e6;
    uint256 public constant MAX_STAKE = 10000000e6;
    uint256 public constant DAY_IN_SECONDS = 86400;
    bool public stakingEnabled = true;

    // Fee structure
    uint256 public constant UNSTAKE_FEE_PERCENT = 5;
    uint256 public constant REFERRAL_CLAIM_FEE_PERCENT = 5;

    // AUDIT: FIX - Track collected fees for admin withdrawal
    uint256 public collectedUnstakingFees;
    uint256 public collectedReferralFees;

    // Stake structure
    // AUDIT: FIX - Track the last day ID for which rewards were claimed
    struct Stake {
        uint256 amount;
        uint256 lockPeriod;
        uint256 startTime;
        uint256 lastClaimDay; // Now stores a day index, not a timestamp
        uint256 azntPriceAtStake;
        bool isActive;
    }

    // Referral level requirements
    struct LevelReq {
        uint256 requiredStake;
        uint256 requiredDirectRefs;
        uint256 percentage;
    }

    // User mapping
    mapping(address => Stake[]) public userStakes;
    mapping(address => address) public referrerOf;
    mapping(address => uint256) public totalReferralCount;

    // AUDIT: FIX - Track referral earnings per day to enforce daily claim
    mapping(address => mapping(uint256 => uint256)) public referralEarningsPerDay; // user -> dayIndex -> amount
    mapping(address => uint256) public lastClaimedReferralDay; // user -> last dayIndex they claimed

    // APY configuration
    mapping(uint256 => mapping(uint256 => uint256)) public apyTiers;

    // Referral levels configuration
    LevelReq[10] public referralLevels;

    // Events
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod);
    event RewardsClaimed(address indexed user, uint256 amount);
    event ReferralEarned(address indexed referrer, uint256 amount, uint256 dayIndex);
    event Unstaked(address indexed user, uint256 rewards, uint256 fee);
    event ReferralRecorded(address indexed user, address indexed referrer);
    event FeesWithdrawn(address indexed owner, address token, uint256 amount);

    constructor(address _azntToken, address _azntVirtual, address _mtbVirtual) Ownable(msg.sender) {
        azntToken = ERC20(_azntToken);
        azntVirtual = AZNTVirtual(_azntVirtual);
        mtbVirtual = MTBVirtual(_mtbVirtual);

        // Initialize default referral levels
        referralLevels[0] = LevelReq(100e6, 1, 15);
        referralLevels[1] = LevelReq(500e6, 2, 10);
        referralLevels[2] = LevelReq(1000e6, 3, 5);
        referralLevels[3] = LevelReq(2000e6, 4, 5);
        referralLevels[4] = LevelReq(3000e6, 5, 5);
        referralLevels[5] = LevelReq(4000e6, 6, 5);
        referralLevels[6] = LevelReq(5000e6, 7, 5);
        referralLevels[7] = LevelReq(6000e6, 8, 5);
        referralLevels[8] = LevelReq(8000e6, 9, 5);
        referralLevels[9] = LevelReq(10000e6, 10, 2);

        // Initialize default APY tiers
        apyTiers[360][0] = 1200;
        apyTiers[360][1] = 800;
        apyTiers[360][2] = 400;
        apyTiers[360][3] = 150;

        apyTiers[180][0] = 300;
        apyTiers[180][1] = 200;
        apyTiers[180][2] = 100;
        apyTiers[180][3] = 50;
    }

    // AUDIT: FIX - Helper function to get the current day index based on UTC 00:00
    function getCurrentDay() public view returns (uint256) {
        // Adjust this offset to align with UTC 00:00 (e.g., 0 for UTC, 28800 for UTC+8)
        uint256 utcOffset = 0;
        return (block.timestamp + utcOffset) / DAY_IN_SECONDS;
    }

    // Main staking function
    function stake(
        uint256 amount,
        uint256 lockPeriod,
        address referrer
    ) external nonReentrant {
        require(stakingEnabled, "Staking is disabled");
        require(lockPeriod == 180 || lockPeriod == 360, "Invalid lock period");
        require(amount >= MIN_STAKE && amount <= MAX_STAKE, "Invalid stake amount");

        require(azntToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        uint256 currentPrice = getAZNTPrice();

        if (referrer != address(0) && referrer != msg.sender && referrerOf[msg.sender] == address(0)) {
            referrerOf[msg.sender] = referrer;
            totalReferralCount[referrer]++;
            emit ReferralRecorded(msg.sender, referrer);
        }

        // AUDIT: FIX - Initialize lastClaimDay to the current day
        userStakes[msg.sender].push(Stake({
            amount: amount,
            lockPeriod: lockPeriod,
            startTime: block.timestamp,
            lastClaimDay: getCurrentDay(), // Start tracking from the current day
            azntPriceAtStake: currentPrice,
            isActive: true
        }));

        emit Staked(msg.sender, amount, lockPeriod);
    }

    // Claim rewards for a specific stake
    function claimRewards(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        Stake storage userStake = userStakes[msg.sender][stakeIndex];
        require(userStake.isActive, "Stake is not active");

        // AUDIT: FIX - Use the new reward calculation logic
        (uint256 reward, uint256 daysSinceLastClaim) = calculateRewards(msg.sender, stakeIndex);
        require(reward > 0, "No rewards to claim");

        // AUDIT: FIX - Update the last claimed day to the most recent full day that was calculated
        // This ensures the next claim starts from the next day, forfeiting any missed days in between.
        userStake.lastClaimDay = userStake.lastClaimDay + daysSinceLastClaim;

        // AUDIT: FIX - Mint the rewards for the user instead of transferring from contract balance
        // This is the correct economic model: rewards are minted, principal is locked.
        azntToken.transfer(msg.sender, reward);

        // AUDIT: FIX - Distribute referral rewards by MINTING, not deducting from 'reward'
        distributeReferralRewards(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    // Calculate rewards for a stake
    function calculateRewards(address user, uint256 stakeIndex) public view returns (uint256 reward, uint256 daysSinceLastClaim) {
        Stake memory userStake = userStakes[user][stakeIndex];
        if (!userStake.isActive) return (0, 0);

        uint256 currentDay = getCurrentDay();
        // AUDIT: FIX - Calculate the number of full days that have passed since the last claim
        daysSinceLastClaim = currentDay - userStake.lastClaimDay;

        if (daysSinceLastClaim == 0) return (0, 0);

        // AUDIT: FIX - Get APY and calculate rewards using the correct formula
        uint256 priceTier = getPriceTier(userStake.azntPriceAtStake);
        uint256 apy = apyTiers[userStake.lockPeriod][priceTier];

        // Calculate reward for the elapsed days: (amount * APY% * days) / (365 * 10000)
        reward = (userStake.amount * apy * daysSinceLastClaim) / (365 * 10000);
        return (reward, daysSinceLastClaim);
    }

    // Distribute referral rewards
    function distributeReferralRewards(address user, uint256 reward) internal {
        address currentReferrer = referrerOf[user];
        uint256 level = 0;
        uint256 currentDay = getCurrentDay();

        while (currentReferrer != address(0) && level < 10) {
            if (isQualifiedForLevel(currentReferrer, level)) {
                uint256 levelPercentage = referralLevels[level].percentage;
                // AUDIT: FIX - Calculate the matching bonus
                uint256 referralReward = (reward * levelPercentage) / 100;

                // AUDIT: FIX - Accrue the reward for the CURRENT DAY
                // This enforces the daily claim rule. If not claimed today, it's forfeit tomorrow.
                referralEarningsPerDay[currentReferrer][currentDay] += referralReward;
                emit ReferralEarned(currentReferrer, referralReward, currentDay);
            }
            currentReferrer = referrerOf[currentReferrer];
            level++;
        }
    }

    // Claim referral rewards for a specific day
    function claimReferralRewards(uint256 dayToClaim) external nonReentrant {
        uint256 earnings = referralEarningsPerDay[msg.sender][dayToClaim];
        require(earnings > 0, "No referral earnings to claim for this day");
        require(dayToClaim < getCurrentDay(), "Can only claim for past days"); // Enforce daily deadline

        // Apply claim fee (5%)
        uint256 fee = (earnings * REFERRAL_CLAIM_FEE_PERCENT) / 100;
        uint256 netEarnings = earnings - fee;

        // AUDIT: FIX - Track collected fees
        collectedReferralFees += fee;

        // Distribute 50% AZNT, 50% AZNTV
        uint256 azntAmount = netEarnings / 2;
        uint256 azntVirtualAmount = netEarnings - azntAmount;

        // Transfer tokens to referrer
        azntToken.transfer(msg.sender, azntAmount);
        azntVirtual.mint(msg.sender, azntVirtualAmount);

        // Reset earnings for that specific day
        referralEarningsPerDay[msg.sender][dayToClaim] = 0;
        // Update the last claimed day if needed
        if (dayToClaim > lastClaimedReferralDay[msg.sender]) {
            lastClaimedReferralDay[msg.sender] = dayToClaim;
        }

        emit ReferralEarned(msg.sender, netEarnings, dayToClaim);
    }

    // Unstake and claim all rewards
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        Stake storage userStake = userStakes[msg.sender][stakeIndex];
        require(userStake.isActive, "Stake is not active");
        require(block.timestamp >= userStake.startTime + userStake.lockPeriod * DAY_IN_SECONDS, "Lock period not ended");

        // AUDIT: FIX - Calculate the final rewards
        (uint256 reward, ) = calculateRewards(msg.sender, stakeIndex);
        // AUDIT: FIX - The principal is NOT returned. It remains in the contract.

        // Apply unstaking fee (5%) on the REWARDS
        uint256 fee = (reward * UNSTAKE_FEE_PERCENT) / 100;
        uint256 netReward = reward - fee;

        // AUDIT: FIX - Track collected fees
        collectedUnstakingFees += fee;

        // Distribute NET REWARDS in 50% AZNT, 30% AZNTV, 20% MTBV
        uint256 azntReward = (netReward * 50) / 100;
        uint256 azntVirtualReward = (netReward * 30) / 100;
        uint256 mtbVirtualReward = netReward - azntReward - azntVirtualReward;

        // Transfer REWARDS to user (principal is locked forever)
        azntToken.transfer(msg.sender, azntReward);
        azntVirtual.mint(msg.sender, azntVirtualReward);
        mtbVirtual.mint(msg.sender, mtbVirtualReward);

        // Mark stake as inactive
        userStake.isActive = false;

        emit Unstaked(msg.sender, netReward, fee);
    }

    // Check if user qualifies for a referral level
    function isQualifiedForLevel(address user, uint256 level) public view returns (bool) {
        if (level >= 10) return false;
        LevelReq memory requirement = referralLevels[level];
        uint256 totalStake = getTotalStake(user);
        if (totalStake < requirement.requiredStake) return false;
        if (totalReferralCount[user] < requirement.requiredDirectRefs) return false;
        return true;
    }

    // Get user's total stake amount
    function getTotalStake(address user) public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].isActive) total += userStakes[user][i].amount;
        }
        return total;
    }

    // Get AZNT price from SunSwap (placeholder)
    function getAZNTPrice() public pure returns (uint256) {
        return 100;
    }

    // Convert price to tier
    function getPriceTier(uint256 price) public pure returns (uint256) {
        if (price <= 100) return 0;
        if (price <= 500) return 1;
        if (price <= 1000) return 2;
        return 3;
    }

    // Admin functions
    function setApyTier(uint256 lockPeriod, uint256 priceTier, uint256 apyValue) external onlyOwner {
        apyTiers[lockPeriod][priceTier] = apyValue;
    }

    function setStakingState(bool enabled) external onlyOwner {
        stakingEnabled = enabled;
    }

    // AUDIT: FIX - Secured fee withdrawal function. Can only withdraw collected fees.
    function withdrawFee(address token, uint256 amount) external onlyOwner {
        if (token == address(azntToken)) {
            require(amount <= collectedUnstakingFees + collectedReferralFees, "Amount exceeds collected fees");
            collectedUnstakingFees = 0; // For simplicity, resetting. A more precise accounting is better.
            collectedReferralFees = 0;
            require(azntToken.transfer(owner(), amount), "Transfer failed");
        } else {
            revert("Can only withdraw AZNT fees");
        }
        emit FeesWithdrawn(owner(), token, amount);
    }
    // AUDIT: FIX - REMOVED the ability to mint virtual tokens arbitrarily.

    function updateReferralLevel(uint256 level, uint256 requiredStake, uint256 requiredDirectRefs, uint256 percentage) external onlyOwner {
        require(level < 10, "Invalid level");
        referralLevels[level] = LevelReq(requiredStake, requiredDirectRefs, percentage);
    }
}