import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from '../config/env';
import { pool } from './pool';

/**
 * Bootstrap de la base de datos al arrancar el servidor.
 * Se conecta al servidor PostgreSQL (base 'postgres') para crear
 * la base de datos de la aplicación si aún no existe.
 */
export async function ensureDatabase(): Promise<void> {
  const adminPool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: 'postgres',
    user: config.db.user,
    password: config.db.password,
  });

  try {
    const { rowCount } = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.db.database]
    );

    if (rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${config.db.database}"`);
      console.log(`Base de datos "${config.db.database}" creada.`);
    } else {
      console.log(`Base de datos "${config.db.database}" ya existe.`);
    }
  } finally {
    await adminPool.end();
  }
}

/**
 * Aplica el esquema (tablas e índices) leyendo sql/schema.sql.
 * El esquema usa sentencias IF NOT EXISTS, por lo que es seguro
 * ejecutarlo en cada arranque.
 */
export async function applySchema(): Promise<void> {
  const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Esquema de tablas verificado.');
}