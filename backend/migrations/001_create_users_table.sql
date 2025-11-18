-- Migration: Create users table
-- This migration adds the users table to support the weather alerts integration

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample users for testing
INSERT INTO users (name, email, phone_number) VALUES
  ('Juan Pérez', 'juan@example.com', '+34612345678'),
  ('María García', 'maria@example.com', '+34623456789'),
  ('Carlos López', 'carlos@example.com', NULL)
ON CONFLICT (email) DO NOTHING;
