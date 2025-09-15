import { Router } from "express";
import {
  createFoundationHandle,
  updateFoundationHandle,
  getFoundationHandle,
  createCampaignHandle,
  getCampaignHandle,
  deleteCampaignHandle,
  deleteFoundationHandle,
  addFaqHandle,
  deleteFaqHandle,
  getFaqHandle
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
)

adminRouter.delete("/foundation", auth, isAdmin, deleteFoundationHandle)
adminRouter.get("/foundation", getFoundationHandle)


adminRouter.post("/campaign", auth, isAdmin, setUploadPath("foundation/campaign"), upload.single("image"),createCampaignHandle)
adminRouter.get("/campaign", getCampaignHandle)
adminRouter.delete("/campaign", auth, isAdmin, deleteCampaignHandle)


adminRouter.post("/faq", auth, isAdmin, addFaqHandle)
adminRouter.get("/faq", getFaqHandle)
adminRouter.delete("/faq", auth, isAdmin, deleteFaqHandle)

export default adminRouter;
