import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpireAt: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    otpVerifiedForResetPassword: {
      type: Boolean,
      default: false,
    },

    pin: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  // if (!this.isModified("password")) return next();
  // this.password = await bcrypt.hash(this.password, 10);

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.isModified("pin") && this.pin) {
    this.pin = await bcrypt.hash(this.pin, 5);
  }
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.isPinCorrect = async function (pin) {
  return await bcrypt.compare(pin, this.pin);
};

export const User = mongoose.model("User", userSchema);
