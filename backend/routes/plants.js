 const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /plants?user_id=...
router.get('/', async (req, res) => {
  const { user_id } = req.query;
  const result = await db.query('SELECT * FROM plants WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
  res.json(result.rows);
});

// POST /plants
router.post('/', async (req, res) => {
  const { user_id, name, type, planted_at, notes } = req.body;
  const result = await db.query(
    'INSERT INTO plants (user_id, name, type, planted_at, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [user_id, name, type, planted_at, notes]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /plants/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, planted_at, notes } = req.body;
  const result = await db.query(
    'UPDATE plants SET name=$1, type=$2, planted_at=$3, notes=$4 WHERE id=$5 RETURNING *',
    [name, type, planted_at, notes, id]
  );
  res.json(result.rows[0]);
});

// DELETE /plants/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM plants WHERE id=$1', [id]);
  res.status(204).send();
});

module.exports = router;
