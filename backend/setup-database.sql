-- Script de inicialización de la base de datos Mi Huerta
-- Ejecutar este script después de crear la base de datos

-- Eliminar tablas existentes si existen (para desarrollo)
DROP TABLE IF EXISTS plant_activities CASCADE;
DROP TABLE IF EXISTS plants CASCADE;

-- Tabla de plantas
CREATE TABLE plants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  planted_at DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de actividades de plantas
CREATE TABLE plant_activities (
  id SERIAL PRIMARY KEY,
  plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_plants_user_id ON plants(user_id);
CREATE INDEX idx_plant_activities_plant_id ON plant_activities(plant_id);
CREATE INDEX idx_plant_activities_date ON plant_activities(activity_date);

-- Insertar datos de ejemplo (opcional)
INSERT INTO plants (user_id, name, type, planted_at, notes) VALUES
  (1, 'Tomate Cherry', 'Hortaliza', '2024-01-15', 'Variedad resistente al calor'),
  (1, 'Rosa Roja', 'Flor', '2024-02-01', 'Requiere poda regular'),
  (1, 'Aguacate', 'Árbol', '2023-11-20', 'Plantado desde semilla');

INSERT INTO plant_activities (plant_id, activity_type, description, activity_date) VALUES
  (1, 'Riego', 'Riego profundo en la mañana', '2024-11-15'),
  (1, 'Fertilización', 'Fertilizante orgánico', '2024-11-10'),
  (2, 'Poda', 'Eliminación de hojas secas', '2024-11-12'),
  (3, 'Riego', 'Riego moderado', '2024-11-16');

-- Verificar que todo se creó correctamente
SELECT 'Tablas creadas exitosamente' AS status;
SELECT COUNT(*) AS total_plantas FROM plants;
SELECT COUNT(*) AS total_actividades FROM plant_activities;
