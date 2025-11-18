 -- Tabla de plantas
CREATE TABLE IF NOT EXISTS plants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  planted_at DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de actividades de plantas
CREATE TABLE IF NOT EXISTS plant_activities (
  id SERIAL PRIMARY KEY,
  plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
