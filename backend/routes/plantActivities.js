const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /plant_activities
router.post('/', async (req, res) => {
  const { plant_id, activity_type, description, activity_date } = req.body;
  const result = await db.query(
    'INSERT INTO plant_activities (plant_id, activity_type, description, activity_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [plant_id, activity_type, description, activity_date]
  );
  res.status(201).json(result.rows[0]);
});

// GET /plant_activities?plant_id=...
router.get('/', async (req, res) => {
  let { plant_id } = req.query;
  let result;
  try {
    if (plant_id) {
      plant_id = parseInt(plant_id);
      if (isNaN(plant_id)) {
        return res.status(400).json({ error: 'plant_id debe ser un número' });
      }
      result = await db.query(
        'SELECT * FROM plant_activities WHERE plant_id = $1 ORDER BY activity_date DESC',
        [plant_id]
      );
    } else {
      result = await db.query(
        'SELECT * FROM plant_activities ORDER BY activity_date DESC'
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

module.exports = router; 