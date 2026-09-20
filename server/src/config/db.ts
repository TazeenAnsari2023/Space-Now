import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    if (!connectionPromise) {
      connectionPromise = mongoose.connect(process.env.MONGO_URI as string);
    }

    await connectionPromise;
    console.log("MongoDB connected");
    return mongoose;
  } catch (error) {
    connectionPromise = null;
    console.error("MongoDB connection failed", error);
    throw error;
  }
};

export default connectDB;
