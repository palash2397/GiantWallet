import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    //   networkId: { type: mongoose.Schema.Types.ObjectId, ref: "Network", required: true },
    chainId: { type: String, required: true },
    contractAddress: { type: String, required: true },
    symbol: { type: String, required: true },
    decimals: { type: Number, default: 18 },
    name: { type: String },
  },
  { timestamps: true }
);

export const Token = mongoose.model("Token", tokenSchema);
