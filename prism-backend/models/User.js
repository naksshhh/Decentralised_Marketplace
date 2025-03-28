const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  username: { type: String },
  email: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
