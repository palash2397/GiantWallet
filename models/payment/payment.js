import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentIntentId: {
      type: String, 
      required: true,
    },
    amount: {
      type: Number, 
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled"],
      default: "pending",
    },
    paymentMethod: {
      type: String, 
      default: "card",
    },
    receiptUrl: {
      type: String, 
    },
    description: {
      type: String,
    },

  },
  {
    timestamps: true,
  }
);

export const Payment =  mongoose.model("Payment", paymentSchema);