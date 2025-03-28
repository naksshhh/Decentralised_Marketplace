const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Web3 Authentication (MetaMask)
router.post("/login", async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

  let user = await User.findOne({ walletAddress });

  if (!user) {
    user = new User({ walletAddress });
    await user.save();
  }

  res.json({ message: "Login successful", user });
});

module.exports = router;
