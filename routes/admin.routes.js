import { Router } from "express";
import {
  createFoundationHandle,
  updateFoundationHandle,
  getFoundationHandle,
  createCampaignHandle
} from "../controllers/admin.controller.js";
import { auth, isAdmin } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";
import { setUploadPath } from "../utils/helpers.js";

const adminRouter = Router();

adminRouter.post(
  "/create-foundation",
  auth,
  isAdmin,
  setUploadPath("foundation/logo"),
  upload.single("logo"),
  createFoundationHandle
);

adminRouter.patch(
  "/update-foundation",
  auth,
  isAdmin,
  setUploadPath("foundation/logo"),
  upload.single("logo"),
  updateFoundationHandle
);

adminRouter.get("/foundation", auth, isAdmin, getFoundationHandle)
adminRouter.post("/create-campaign", auth, isAdmin, setUploadPath("foundation/campaign"), createCampaignHandle)

export default adminRouter;
