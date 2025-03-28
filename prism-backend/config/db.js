const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI; // Load MongoDB URI
    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
