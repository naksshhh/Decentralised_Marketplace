const mongoose = require("mongoose");

const PurchaseSchema = new mongoose.Schema({
  buyerAddress: { type: String, required: true },
  datasetId: { type: String, required: true },
  price: { type: Number, required: true },
  transactionHash: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
});

module.exports = mongoose.model("Purchase", PurchaseSchema); 