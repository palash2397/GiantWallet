import { Router } from "express";
import { sendCryptoController } from "../controllers/crypto.controller.js";

const cryptoRouter = Router();

cryptoRouter.post("/send", sendCryptoController);

export default cryptoRouter;
