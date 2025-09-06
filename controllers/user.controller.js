import { ApiResponse } from "../utils/ApiReponse.js";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { sendSms } from "../utils/twillo.js";
import { generateOtp, getExpirationTime } from "../utils/helpers.js";
import { User } from "../models/user/user.js";
import { sendOtpMail, sendOtpforgotPasswordMail } from "../utils/email.js";
import { deleteOldImages } from "../utils/helpers.js";

export const registerHandle = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const schema = Joi.object({
      fullName: Joi.string().min(3).max(30).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      password: Joi.string().min(6).required(),
    });

    const { error } = schema.validate(req.body);

    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      if (existingUser.isVerified == false) {
        const otp = generateOtp();
        existingUser.otp = otp;
        await existingUser.save();
        await sendOtpMail(existingUser.email, existingUser.fullName, otp);

        console.log(`Resend OTP ${otp} to mobile: ${phone}`);
        return res
          .status(201)
          .json(
            new ApiResponse(
              200,
              { userId: existingUser._id },
              `OTP resent to mobile`
            )
          );
      }
      let message =
        existingUser.email === email
          ? `email already exists. Please use another one`
          : `mobile number already exists. Please use another one`;
      return res.status(400).json({ status: false, message: message });
    }

    const otp = generateOtp();
    const otpExpireAt = getExpirationTime();

    const user = new User({
      fullName,
      email: email ? email.toLowerCase() : email,
      phone,
      password,
      otp,
      otpExpireAt,
    });

    let msg = `Your verification code is ${otp}. It will expire in 5 minutes. Do not share this code with anyone`;
    const smsResult = await sendSms(phone, msg);
    if (!smsResult.success)
      return res
        .status(403)
        .json(
          new ApiResponse(400, {}, `Something went wrong while sending sms`)
        );

    await sendOtpMail(fullName, otp, email);
    await user.save();

    console.log(` OTP ---------> ${otp} `);

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          {},
          `The OTP has been successfully sent to your registered email and phone number. Please check your inbox or phone messages.`
        )
      );
  } catch (error) {
    console.error(`Error while registering user:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const verifyOtpHandle = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(4).required(),
      purpose: Joi.string().valid("password", "verify").optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));
    }

    if (!user.otp || !user.otpExpireAt) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `OTP not found. Please request a new OTP.`)
        );
    }

    if (user.otp !== otp || new Date() > user.otpExpireAt) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Invalid or expired OTP.`));
    }

    // Forgot Password Flow
    if (purpose === "password") {
      user.otp = null;
      user.otpExpireAt = null;
      user.otpVerifiedForResetPassword = true;
      await user.save();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {},
            `OTP verified. You may now reset your password.`
          )
        );
    }

    // Account Verification Flow
    if (user.isVerified) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `User already verified.`));
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpireAt = null;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `User account verified successfully.`));
  } catch (error) {
    console.error(`Error while verifying OTP:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const resendOtpHandle = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required(),
      purpose: Joi.string().valid("password", "verify").optional(),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (purpose === "password") {
      const otp = await generateOtp();
      const otpExpireAt = getExpirationTime();
      user.otp = otp;
      user.otpExpireAt = otpExpireAt;
      await user.save();
      await sendOtpforgotPasswordMail(user.fullName, user.otp, user.email);

      console.log(` resend OTP ---------> ${otp} `);

      return res
        .status(200)
        .json(
          new ApiResponse(200, {}, `Password reset OTP sent successfully.`)
        );
    }

    if (user.isVerified)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `User already verified.`));

    const otp = await generateOtp();
    const otpExpireAt = getExpirationTime();
    user.otp = otp;
    user.otpExpireAt = otpExpireAt;
    await user.save();
    await sendOtpMail(user.fullName, user.otp, user.email);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `OTP resent successfully.`));
  } catch (error) {
    console.error(`Error while resending OTP:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const loginHandle = async (req, res) => {
  try {
    const { email, password } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isVerified)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `User not verified. Please verify.`));

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Invalid credentials`));
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const userData = {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isPinCreated: user.pin ? true : false,
      token: token,
    };

    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "strict",
    //   maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    // });

    return res
      .status(200)
      .json(new ApiResponse(200, userData, `User logged in successfully.`));
  } catch (error) {
    console.log(`Error while logging in user:`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const forgotPasswordHandle = async (req, res) => {
  try {
    const { email } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isVerified)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `User not verified. Please verify first.`)
        );

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    const otp = generateOtp();
    const otpExpireAt = getExpirationTime();
    user.otp = otp;
    user.otpExpireAt = otpExpireAt;
    await user.save();
    await sendOtpforgotPasswordMail(user.fullName, user.otp, user.email);
    console.log(` OTP ---------> ${otp} `);
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          {},
          `The OTP has been successfully sent to your registered email and phone number. Please check your inbox or phone messages.`
        )
      );
  } catch (error) {
    console.log(`Error while forgot password :`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const resetPasswordHandle = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      confirmPassword: Joi.string()
        .min(6)
        .required()
        .valid(Joi.ref("password"))
        .messages({
          "any.only": "Confirm password must match password",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.otpVerifiedForResetPassword)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `OTP not verified. Please verify OTP.`));

    if (!user.isVerified)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `User not verified. Please verify first.`)
        );

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    const oldPassword = await user.isPasswordCorrect(password);
    if (oldPassword)
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            `You have entered your old password. Please enter a new password.`
          )
        );

    user.password = password;
    user.otp = null;
    user.otpExpireAt = null;
    user.otpVerifiedForResetPassword = false;
    await user.save();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Password changed successfully.`));
  } catch (error) {
    console.log(`Error while changing password :`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const createPinHandle = async (req, res) => {
  try {
    const { pin, confirmPin } = req.body;
    const schema = Joi.object({
      pin: Joi.string().length(4).required(),
      confirmPin: Joi.string()
        .length(4)
        .required()
        .valid(Joi.ref("pin"))
        .messages({
          "any.only": "Confirm pin must match pin",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ email: req.user.email });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isVerified)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `User not verified. Please verify first.`)
        );

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    if (user.pin)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Pin already created.`));

    user.pin = pin;
    await user.save();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Pin created successfully.`));
  } catch (error) {
    console.log(`Error while creating pin :`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const verifyPinHandle = async (req, res) => {
  try {
    const { pin } = req.body;
    const schema = Joi.object({
      pin: Joi.string().length(4).required(),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ email: req.user.email });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    if (!user.pin)
      return res.status(400).json(new ApiResponse(400, {}, `Pin not created.`));

    const isPinCorrect = await user.isPinCorrect(pin);
    if (!isPinCorrect)
      return res.status(400).json(new ApiResponse(400, {}, `Invalid Pin`));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { id: user.id, name: user.fullName },
          `Pin verified and logged in successfully.`
        )
      );
  } catch (error) {
    console.log(`Error while verifying pin :`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const changePinHandle = async (req, res) => {
  try {
  } catch (error) {
    console.log(`Error while changing pin :`, error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const updateProfileHandle = async (req, res) => {
  try {
    const { fullName, latitude, longitude } = req.body;
    const schema = Joi.object({
      fullName: Joi.string().min(3).max(30).optional(),
      latitude: Joi.string().optional(),
      longitude: Joi.string().optional(),
    });

    // console.log("req.file -------->", req.file)
    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });

    const user = await User.findOne({ _id: req.user.id });
    // console.log("user ----->", user);
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (req.file) deleteOldImages("profile", user.avatar);

    fullName ? (user.fullName = fullName) : user.fullName;
    req.file ? (user.avatar = req.file.filename) : user.avatar;
    latitude
      ? ((user.latitude = latitude), (user.longitude = longitude))
      : user.latitude,
      user.longitude;

    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Profile updated successfully.`));
  } catch (error) {
    console.log(`Error while updating profile :`, error);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const myProfileHandle = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id }).select(
      "-password -otp -otpExpireAt -__v -createdAt -updatedAt -pin -otpVerifiedForResetPassword"
    );

    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    user.avatar = user.avatar
      ? `${process.env.BASE_URL}/profile/${user.avatar}`
      : `${process.env.DEFAULT_PROFILE_PIC}`;

    return res
      .status(200)
      .json(new ApiResponse(200, user, `Profile fetched successfully.`));
  } catch (error) {
    console.log(`Error while fetching profile :`, error);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const deleteAvatarHandle = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    if (!user.avatar)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Profile image not found.`));

    deleteOldImages("profile", user.avatar);
    user.avatar = null;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Profile image deleted successfully.`));
  } catch (error) {
    console.log(`Error while deleting profile image :`, error);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const changePasswordHandle = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const schema = Joi.object({
      oldPassword: Joi.string().min(6).required(),
      newPassword: Joi.string().min(6).required(),
      confirmPassword: Joi.string()
        .min(6)
        .required()
        .valid(Joi.ref("newPassword"))
        .messages({
          "any.only": "Confirm password must match password",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });
    const user = await User.findOne({ _id: req.user.id });

    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    if (!user.isActive)
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, `your account has been temporarily blocked.`)
        );

    const isCorrectPassword = await user.isPasswordCorrect(oldPassword);
    if (!isCorrectPassword)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Old password is incorrect.`));

    if (oldPassword === newPassword)
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            `You have entered your old password. Please enter a new password.`
          )
        );

    user.password = newPassword;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Password changed successfully.`));
  } catch (error) {
    console.log(`Error while changing password :`, error);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};
