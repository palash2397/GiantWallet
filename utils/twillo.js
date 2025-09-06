import twilio from "twilio";


// console.log("TWILIO_ACCOUNT_SID  -------->", process.env.TWILIO_ACCOUNT_SID)
// console.log("TWILIO_AUTH_TOKEN  -------->",  process.env.TWILIO_AUTH_TOKEN)


const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSms = async (to, msg) => {
  try {
    const res = await client.messages.create({
      body: msg,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+918830109846",
    });

    return { success: true, sid: res.sid };
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return { success: false, error: error.message };
  }
};


