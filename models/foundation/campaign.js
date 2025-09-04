import mongoose from "mongoose";

const donationCampaignSchema = new mongoose.Schema(
  {
    foundation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Foundation",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    image: { type: String }, // main banner
    raisedAmount: { type: Number, default: 0 },
    eventDate: { type: Date }, // for campaign date
    location: { type: String },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["active", "completed", "upcoming"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DonationCampaign", donationCampaignSchema);
