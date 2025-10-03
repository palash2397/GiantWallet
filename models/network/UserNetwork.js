import mongoose from "mongoose";

const networkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    networkName: { type: String, required: true },
    rpcUrl: { type: String, required: true },
    chainId: { type: String, required: true },
    currencySymbol: { type: String, required: true },
    blockExplorerUrl: { type: String },
  },
  { timestamps: true }
);

export default UserNetworks = mongoose.model("UserNetwork", networkSchema);
