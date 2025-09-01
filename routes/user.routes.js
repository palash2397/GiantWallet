import { Router } from "express";
import {
  registerHandle,
  verifyOtpHandle,
  resendOtpHandle,
  loginHandle,
  forgotPasswordHandle,
  resetPasswordHandle,
  createPinHandle,
  verifyPinHandle,
} from "../controllers/user.controller.js";
import { auth } from "../middlewares/auth.js";

const userRouter = Router();

userRouter.post("/register", registerHandle);
userRouter.post("/verify-otp", verifyOtpHandle);
userRouter.post("/resend-otp", resendOtpHandle);
userRouter.post("/login", loginHandle);
userRouter.post("/forgot-password", forgotPasswordHandle);
userRouter.post("/reset-password", resetPasswordHandle);
userRouter.post("/create-pin", auth, createPinHandle)
userRouter.post("/verify-pin", auth, verifyPinHandle)


export default userRouter;
