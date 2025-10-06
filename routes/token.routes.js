import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { fetchTokenHandle, submitTokenHandle, userAllTokenHandle } from "../controllers/token.controller.js";


const tokenRouter = Router();
tokenRouter.post("/details", fetchTokenHandle)
tokenRouter.post("/submit", auth, submitTokenHandle)
tokenRouter.get("/all", auth, userAllTokenHandle)

export default tokenRouter;
