import { ethers } from "ethers";
import { Token } from "../models/token/Token.js"
import { ApiResponse } from "../utils/ApiReponse.js";
import ABI from "../Web3/ABI/tokenAbi.json"  with { type: "json" }
import Joi from "joi";



export const fetchTokenHandle = async (req, res) => {
    try {
        const { contractAddress, rpcUrl } = req.body;
        const schema = Joi.object({
            contractAddress: Joi.string().required(),
            rpcUrl: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);

        if (error)
            return res
                .status(400)
                .json({ status: false, message: error.details[0].message });

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        // console.log(`chainid -------->,`, network.chainId)

        const tokenContract = new ethers.Contract(
            contractAddress,
            ABI,
            provider
        );

        // console.log("Fetching token details from contract:", tokenContract);

        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        const number = Number(decimals);
        const chainId = String(network.chainId)


        const data = { name, symbol, number, chainId };

        // console.log(`data --------->`, data)

        return res
            .status(200)
            .json(new ApiResponse(201, data, `token details fetched successfully`));
    } catch (err) {
        console.error("Error fetching token details:", err);
        return res
            .status(500)
            .json(new ApiResponse(500, {}, `Internal Server Error`));
    }
};

export const submitTokenHandle = async (req, res) => {
    try {
        const { chainId, contractAddress, symbol, decimals, name } = req.body;

        const schema = Joi.object({
            chainId: Joi.string().required(),
            contractAddress: Joi.string().required(),
            symbol: Joi.string().required(),
            decimals: Joi.number().required(),
            name: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);

        if (error)
            return res
                .status(400)
                .json({ status: false, message: error.details[0].message });


        const token = await Token.findOne({ contractAddress: contractAddress, chainId: chainId, userId: req.user.id })

        if (token)
            return res.status(400).json(new ApiResponse(400, {}, `Token already exists`));


        const newToken = new Token({
            userId: req.user.id,
            chainId,
            contractAddress,
            name,
            decimals,
            symbol
        })


        await newToken.save();
        return res
            .status(201)
            .json(new ApiResponse(201, newToken._id, `Token details submitted successfully`));


    } catch (error) {
        console.error("Error while submitting token details:", error);
        return res
            .status(500)
            .json(new ApiResponse(500, {}, `Internal Server Error`));

    }
}


export const userAllTokenHandle = async (req, res) => {
    try {
        const tokens = await Token.find({ userId: req.user.id })
        if (!tokens || tokens.length == 0)
            return res.status(404).json(new ApiResponse(404, {}, `No tokens found`));
        return res.status(200).json(new ApiResponse(200, tokens, `Tokens fetched successfully`));


    } catch (error) {
         console.error("Error while getting all token details:", error);
        return res
            .status(500)
            .json(new ApiResponse(500, {}, `Internal Server Error`));

    }
}
