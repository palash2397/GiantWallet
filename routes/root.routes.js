import { Router } from "express";
import userRouter from "../routes/user.routes.js";
import paymentRouter from "./payment.routes.js";

const rootRouter = Router();

rootRouter.use("/user", userRouter);
rootRouter.use("/payment", paymentRouter)

export default rootRouter;
