import { ApiResponse } from "../utils/ApiReponse.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { User } from "../models/user/user.js";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuthSignupHandle = async (req, res) => {
  try {
    const idToken = req.params.id;
    const schema = Joi.object({
      idToken: Joi.string().required(),
    });
    const { error } = schema.validate({ idToken });
    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log("ticket --------->", ticket)

    const payload = ticket.getPayload();
    console.log("payload --------->", payload)
    const { sub: googleId, email } = payload;

    let user = await User.findOne({ email });
    if (user && user.provider === "local") {
      return res
        .status(401)
        .json(
          new ApiResponse(
            400,
            {},
            "Email already registered with local signup."
          )
        );
    }

    user = await User.create({
      email: email,
      googleId: googleId,
      provider: "google",
      isVerified: true,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { id: user._id, email: user.email },
          `google signup  successful`
        )
      );
  } catch (error) {
    console.log(`Error while signup with google: ${error.message}`);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const googleAuthLoginHandle = async (req, res) => {
  try {
    const idToken = req.params.id;
    const schema = Joi.object({
      idToken: Joi.string().required(),
    });
    const { error } = schema.validate({ idToken });
    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    const user = await User.findOne({ email: email, provider: "google" });
    if (!user)
      return res
        .status(404)
        .json(
          new ApiResponse(404, {}, `User not found, please register first`)
        );

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      token: token,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, userData, `google login  successful`));

    return res.status(200).json;
  } catch (error) {
    console.log(`Error while login with google: ${error.message}`);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, `Internal server error`));
  }
};
