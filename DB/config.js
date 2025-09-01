import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@cluster0.o2ln3ff.mongodb.net/${process.env.MONGO_DB_NAME}`
    );
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err);
    process.exit(1);
  }
};
