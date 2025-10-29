import { Router } from "express";
import { swapTokenController } from "../controllers/swap.controller.js";

const swapRouter = Router();

swapRouter.get("/token", swapTokenController)




export default swapRouter;