const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /plants?userId=...
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate userId is required
    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required" });
    }

    // Validate userId is a number
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: "userId must be a valid number" });
    }

    const result = await db.query(
      "SELECT * FROM plants WHERE user_id = $1 ORDER BY created_at DESC",
      [userIdNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching plants:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /plants
router.post("/", async (req, res) => {
  try {
    const { user_id, name, type, planted_at, notes } = req.body;

    // Validate required fields
    if (!user_id || !name || !type) {
      return res
        .status(400)
        .json({ error: "user_id, name, and type are required" });
    }

    const result = await db.query(
      "INSERT INTO plants (user_id, name, type, planted_at, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user_id, name, type, planted_at, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating plant:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /plants/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, planted_at, notes } = req.body;

    const result = await db.query(
      "UPDATE plants SET name=$1, type=$2, planted_at=$3, notes=$4 WHERE id=$5 RETURNING *",
      [name, type, planted_at, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating plant:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /plants/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM plants WHERE id=$1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting plant:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
