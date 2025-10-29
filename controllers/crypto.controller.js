import { ApiResponse } from "../utils/ApiReponse.js";
import Joi from "joi";
import { ethers } from "ethers";

export const sendCryptoController = async (req, res) => {
  try {
    const { toAddress, amount, privateKey, rpcUrl } = req.body;
    const schema = Joi.object({
      toAddress: Joi.string().required(),
      amount: Joi.number().positive().required(),
      privateKey: Joi.string().required(),
      rpcUrl: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString()),
    });

    console.log(`TX Hash:`, tx.hash);

    await tx.wait();
    console.log(`✅ Transaction Confirmed!`);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { txHash: tx.hash }, `Transaction Successful`)
      );
  } catch (error) {
    console.error(`Error while sending crypto:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const receiveCryptoController = async (req, res) => {
  try {
  } catch (error) {
    console.error(`Error while receiving crypto:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};
