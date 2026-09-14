import { pool } from '../db/pool';

export interface UsuarioRow {
  id: number;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  nombre: string | null;
  foto: string | null;
  fixed_income: string;
  variable_hours: string;
  variable_rate: string;
}

const PROFILE_COLUMNS = 'id, email, password_hash, google_id, nombre, foto, fixed_income, variable_hours, variable_rate';

/**
 * Busca un usuario por su correo. Devuelve null si no existe.
 * Se usa en el login para comparar la contraseña contra el hash.
 */
export async function findByEmail(email: string): Promise<UsuarioRow | null> {
  const { rows } = await pool.query<UsuarioRow>(
    `SELECT ${PROFILE_COLUMNS} FROM usuarios WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Busca un usuario por su google_id. Devuelve null si no existe.
 */
export async function findByGoogleId(googleId: string): Promise<UsuarioRow | null> {
  const { rows } = await pool.query<UsuarioRow>(
    `SELECT ${PROFILE_COLUMNS} FROM usuarios WHERE google_id = $1`,
    [googleId]
  );
  return rows[0] ?? null;
}

/**
 * Crea un usuario a partir de un inicio de sesión con Google.
 * Si ya existe con ese google_id lo devuelve; si el correo ya existe
 * (sin google_id) le asocia el google_id; si no existe, lo crea.
 * Guarda el nombre y la foto de perfil que envía Google.
 */
export async function findOrCreateByGoogle(
  googleId: string,
  email: string,
  nombre?: string | null,
  foto?: string | null
): Promise<UsuarioRow> {
  const existingForGoogle = await findByGoogleId(googleId);
  if (existingForGoogle) {
    // Mantener el perfil actualizado tras cada inicio de sesión
    const { rows } = await pool.query<UsuarioRow>(
      `UPDATE usuarios SET nombre = COALESCE($2, nombre), foto = COALESCE($3, foto)
       WHERE id = $1
       RETURNING ${PROFILE_COLUMNS}`,
      [existingForGoogle.id, nombre ?? null, foto ?? null]
    );
    return rows[0];
  }

  const existingForEmail = await findByEmail(email);
  if (existingForEmail) {
    const { rows } = await pool.query<UsuarioRow>(
      `UPDATE usuarios SET google_id = $2, nombre = COALESCE($3, nombre), foto = COALESCE($4, foto)
       WHERE id = $1
       RETURNING ${PROFILE_COLUMNS}`,
      [existingForEmail.id, googleId, nombre ?? null, foto ?? null]
    );
    return rows[0];
  }

  const { rows } = await pool.query<UsuarioRow>(
    `INSERT INTO usuarios (email, google_id, password_hash, nombre, foto)
     VALUES ($2, $1, NULL, $3, $4)
     RETURNING ${PROFILE_COLUMNS}`,
    [googleId, email, nombre ?? null, foto ?? null]
  );
  return rows[0];
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

/** Devuelve la configuración de ingresos y perfil de un usuario. */
export async function findIncomeConfig(usuarioId: number): Promise<{
  fixedIncome: number;
  variableHours: number;
  variableRate: number;
  email: string;
  name: string | null;
  picture: string | null;
} | null> {
  const { rows } = await pool.query<{ fixed_income: string; variable_hours: string; variable_rate: string; email: string; nombre: string | null; foto: string | null }>(
    'SELECT fixed_income, variable_hours, variable_rate, email, nombre, foto FROM usuarios WHERE id = $1',
    [usuarioId]
  );
  if (!rows[0]) return null;
  return {
    fixedIncome: Number(rows[0].fixed_income),
    variableHours: Number(rows[0].variable_hours),
    variableRate: Number(rows[0].variable_rate),
    email: rows[0].email,
    name: rows[0].nombre,
    picture: rows[0].foto,
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