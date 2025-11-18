const express = require("express");
const cors = require("cors");
const plantsRoutes = require("./routes/plants.js");
const plantActivitiesRoutes = require("./routes/plantActivities.js");
const usersRoutes = require("./routes/users.js");
const pool = require("./db.js");

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test PostgreSQL connection
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "error",
      database: "disconnected",
      error: error.message,
    });
  }
});

// API routes with /api prefix
app.use("/api/plants", plantsRoutes);
app.use("/api/users", usersRoutes);

// Legacy routes without /api prefix for backward compatibility
app.use("/plants", plantsRoutes);
app.use("/plant_activities", plantActivitiesRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
