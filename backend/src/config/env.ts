import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '30m',
  },
  admin: {
    email: requireEnv('ADMIN_EMAIL', 'admin@financeapp.com'),
    // La contraseña en texto plano se toma del .env y se convierte
    // a hash en memoria al iniciar el servidor. Nunca se guarda
    // ni se compara en texto plano.
    passwordHash: bcrypt.hashSync(
      requireEnv('ADMIN_PASSWORD', 'Admin123!'),
      10
    ),
  },
};
