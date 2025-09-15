import { Router } from "express";

import { createPaymentHandle } from "../controllers/payment.controller.js";
import { auth } from "../middlewares/auth.js";

const paymentRouter = Router();
paymentRouter.post("/create-payment", auth, createPaymentHandle)


export default paymentRouter;