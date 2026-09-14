import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración centralizada de la aplicación.
 * El sistema NO tiene registro de usuarios: existe un único usuario
 * predeterminado, definido por variables de entorno.
 */
function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`[Config] Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  db: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: requireEnv('PGDATABASE', 'daycash_db'),
    user: requireEnv('PGUSER', 'postgres'),
    password: requireEnv('PGPASSWORD', ''),
  },
jwt: {
    secret: requireEnv('JWT_SECRET', 'dev_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '30m',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  admin: {
    email: requireEnv('ADMIN_EMAIL', 'admin@financeapp.com'),
    // La contraseña en texto plano se toma del .env y se convierte
    // a hash (bcrypt) al momento de registrar el usuario en la BD.
    password: requireEnv('ADMIN_PASSWORD', 'Admin123!'),
  },
};
