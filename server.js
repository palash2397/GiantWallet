import express from "express"
import morgan from "morgan";
import { connectDB } from "./DB/config.js";
import cors from "cors"
import "dotenv/config.js"


const app = express();
const port = process.env.PORT 

connectDB();

import { stripeWebhookHandle } from "./controllers/payment.controller.js";
app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandle
);

app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cors({
    origin: process.env.CORS_ORIGIN 
}))


import rootRouter from "./routes/root.routes.js"
app.use("/api/v1", rootRouter)




app.get("/", (req, res)=>{
    res.send("Hello World")
})


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})