const mongoose = require("mongoose");

const DatasetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  ownerAddress: { type: String, required: true },
  ipfsHash: { type: String, required: true },
  metadata: { type: Object },
  isAvailable: { type: Boolean, default: true },
  uploadDate: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 0 },
  fileType: { type: String },
  fileSize: { type: Number },
  contentType: { type: String }
});

module.exports = mongoose.model("Dataset", DatasetSchema); 