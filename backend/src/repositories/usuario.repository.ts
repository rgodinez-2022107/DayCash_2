import { pool } from '../db/pool';

export interface UsuarioRow {
  id: number;
  email: string;
  password_hash: string;
  fixed_income: string;
  variable_hours: string;
  variable_rate: string;
}

/**
 * Busca un usuario por su correo. Devuelve null si no existe.
 * Se usa en el login para comparar la contraseña contra el hash.
 */
export async function findByEmail(email: string): Promise<UsuarioRow | null> {
  const { rows } = await pool.query<UsuarioRow>(
    'SELECT id, email, password_hash, fixed_income, variable_hours, variable_rate FROM usuarios WHERE email = $1',
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Crea el usuario administrador si la tabla está vacía.
 * Si ya existe un usuario con el correo, no hace nada.
 */
export async function ensureAdminExists(email: string, passwordHash: string): Promise<void> {
  await pool.query(
    `INSERT INTO usuarios (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [email, passwordHash]
  );
}

/** Devuelve la configuración de ingresos de un usuario (fijo, horas y tarifa). */
export async function findIncomeConfig(usuarioId: number): Promise<{
  fixedIncome: number;
  variableHours: number;
  variableRate: number;
} | null> {
  const { rows } = await pool.query<{ fixed_income: string; variable_hours: string; variable_rate: string }>(
    'SELECT fixed_income, variable_hours, variable_rate FROM usuarios WHERE id = $1',
    [usuarioId]
  );
  if (!rows[0]) return null;
  return {
    fixedIncome: Number(rows[0].fixed_income),
    variableHours: Number(rows[0].variable_hours),
    variableRate: Number(rows[0].variable_rate),
  };
}

/** Actualiza la configuración de ingresos de un usuario. */
export async function updateIncomeConfig(
  usuarioId: number,
  data: { fixedIncome: number; variableHours: number; variableRate: number }
): Promise<void> {
  await pool.query(
    'UPDATE usuarios SET fixed_income = $2, variable_hours = $3, variable_rate = $4 WHERE id = $1',
    [usuarioId, data.fixedIncome, data.variableHours, data.variableRate]
  );
}