import { ApiResponse } from "../utils/ApiReponse.js";

import { Payment } from "../models/payment/payment.js";

import Stripe from "stripe";
import Joi from "joi";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentHandle = async (req, res) => {
  try {
    const { amount, description, paymentMethodType } = req.body;
    const userId = req.user.id;

    const schema = Joi.object({
      amount: Joi.number().min(1).required(),
      description: Joi.string().max(255).optional(),
      paymentMethodType: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);

    if (error) return res.status(400).json({ error: error.details[0].message });
    const methodTypes = paymentMethodType ? [paymentMethodType] : ["card"];
 

    // 1️⃣ Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // convert to cents
      currency: "usd",
      description: description || "Payment",
      metadata: { userId },
      payment_method_types: methodTypes,
    });

    // 2️⃣ Save to DB (status = pending until webhook updates it)
    await Payment.create({
      userId,
      amount,
      currency: "usd",
      description: description || "Payment",
      status: "pending",
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      paymentMethod: methodTypes[0],
    });

    // 3️⃣ Send clientSecret to frontend
    res.status(201).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });

    return res.status(201).json(new ApiResponse(201, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }, `Payment Intent created successfully`))
  } catch (error) {
    console.error("Create Payment Error:", error.message);
    return res.status(500).json(new ApiResponse(500,{}, `Internal server error`))
  }
};

export const stripeWebhookHandle = async (req, res) => {
  try {
    // Get Stripe signature from headers
    const sig = req.headers["stripe-signature"];
    console.log(
      "Webhook raw body type:",
      typeof req.body,
      Buffer.isBuffer(req.body)
    );

    let event;
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body, // raw body (make sure express.json() is not used here)
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(401).send(`Webhook Error: ${err.message}`);
    }

    // Handle event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        await Payment.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          {
            status: "succeeded",
            receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null,
            paymentMethod: paymentIntent.payment_method_types[0] || "card",
            description: paymentIntent.description || "",
          }
        );
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;

        await Payment.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          { status: "failed" }
        );
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;

        await Payment.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          { status: "canceled" }
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
    
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
