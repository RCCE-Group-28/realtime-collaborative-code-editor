import mongoose from "mongoose";

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI!, {
      dbName: "codeEditor",
    });
    console.log("MongoDB connected to codeEditor");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
