require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

const app = express();

// Configure CORS with more explicit options
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
    require('fs').mkdirSync(uploadsDir);
}

connectDB();

// Add health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Routes
app.use("/api/auth", require("./routes/Auth"));
app.use("/api/datasets", require("./routes/datasets"));
app.use("/api/security", require("./routes/security"));

// Add error handling middleware - must be after routes
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
