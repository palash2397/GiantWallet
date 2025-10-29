import { Router } from "express";
import userRouter from "../routes/user.routes.js";
import paymentRouter from "./payment.routes.js";
import adminRouter from "./admin.routes.js";
import goggleAuthRouter from "./googleAuth.routes.js";
import tokenRouter from "./token.routes.js"; 
import swapRouter from "./swap.routes.js";   
import cryptoRouter from "./crypto.routes.js";    

const rootRouter = Router();

rootRouter.use("/user", userRouter);
rootRouter.use("/payment", paymentRouter)
rootRouter.use("/admin", adminRouter)
rootRouter.use("/google-auth", goggleAuthRouter)
rootRouter.use("/token", tokenRouter)
rootRouter.use("/swap", swapRouter)
rootRouter.use("/crypto", cryptoRouter)


export default rootRouter;
