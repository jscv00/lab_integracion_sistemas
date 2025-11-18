const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/users/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId is a number
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: "userId must be a valid number" });
    }

    const result = await db.query(
      "SELECT id, name, phone_number FROM users WHERE id = $1",
      [userIdNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
