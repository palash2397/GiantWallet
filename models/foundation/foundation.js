import mongoose from "mongoose";

const foundationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    logo: { type: String }, // image url
    website: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Foundation = mongoose.model("Foundation", foundationSchema);
