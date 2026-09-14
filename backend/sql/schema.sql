-- ============================================================
-- Esquema de base de datos para DayCash (PostgreSQL)
-- Se aplica automáticamente al arrancar el servidor (IF NOT EXISTS).
-- ============================================================

-- Usuario único del sistema (será el usuario 'admin')
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  nombre VARCHAR(255),
  foto TEXT,
  fixed_income NUMERIC(12,2) NOT NULL DEFAULT 15000,
  variable_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  variable_rate NUMERIC(12,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columnas de perfil para bases existentes (migración idempotente)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto TEXT;

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

-- Historial de egresos (gastos)
CREATE TABLE IF NOT EXISTS egresos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL,
  etiqueta VARCHAR(50),
  nota TEXT,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de apoyo
CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON categorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_egresos_usuario ON egresos(usuario_id);