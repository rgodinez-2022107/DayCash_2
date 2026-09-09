-- ============================================================
-- Esquema de base de datos para DayCash (PostgreSQL)
-- Crear la base primero: CREATE DATABASE daycash_db;
-- ============================================================

-- Usuario único del sistema (será el usuario 'admin')
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  fixed_income NUMERIC(12,2) NOT NULL DEFAULT 15000,
  variable_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  variable_rate NUMERIC(12,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metas de ahorro (fondo de ahorro, emergencia y personalizadas)
CREATE TABLE IF NOT EXISTS metas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL DEFAULT 'personalizada', -- 'ahorro' | 'emergencia' | 'personalizada'
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  contribution NUMERIC(12,2) NOT NULL DEFAULT 0,
  target NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorias de presupuesto
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Historial de transacciones de ingreso
CREATE TABLE IF NOT EXISTS transacciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  nota TEXT,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de apoyo
CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON categorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario ON transacciones(usuario_id);