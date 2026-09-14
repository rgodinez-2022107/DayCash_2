import { Pool } from 'pg';
import { config } from '../config/env';

/**
 * Pool de conexiones a PostgreSQL.
 * Se crea una sola vez al arrancar el servidor y se reutiliza
 * en toda la aplicación (evita abrir una conexión por consulta).
 */
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});

/**
 * Prueba la conexión a la base de datos al iniciar el servidor.
 * Devuelve un mensaje con la versión de PostgreSQL o lanza error.
 */
export async function testConnection(): Promise<string> {
  const { rows } = await pool.query('SELECT version() AS version');
  return rows[0].version;
}