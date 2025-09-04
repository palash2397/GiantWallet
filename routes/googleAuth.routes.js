import { Router } from "express";
import {
  googleAuthLoginHandle,
  googleAuthSignupHandle,
} from "../controllers/googleAuth.controller.js";

const goggleAuthRouter = Router();

goggleAuthRouter.post("/user/register/:id", googleAuthSignupHandle);
goggleAuthRouter.post("/user/login/:id", googleAuthLoginHandle);

export default goggleAuthRouter;
