import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';
import { findByEmail, findOrCreateByGoogle } from '../repositories/usuario.repository';

interface LoginBody {
  email?: string;
  password?: string;
}

interface GoogleLoginBody {
  credential?: string;
}

const googleClient = new OAuth2Client(config.google.clientId);

/**
 * POST /api/auth/login
 * Valida las credenciales contra el usuario almacenado en PostgreSQL
 * y devuelve un JWT si son correctas. No existe endpoint de registro:
 * el usuario administrador se crea automáticamente al iniciar el servidor.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginBody;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Debe proporcionar correo y contraseña.',
    });
    return;
  }

  const usuario = await findByEmail(email.trim().toLowerCase());
  if (!usuario || !usuario.password_hash) {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas.',
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, usuario.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas.',
    });
    return;
  }

  const token = jwt.sign({ email: usuario.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);

  res.status(200).json({
    success: true,
    message: 'Inicio de sesión exitoso.',
    token,
    user: {
      email: usuario.email,
      userId: usuario.id,
    },
  });
}

/**
 * GET /api/auth/me
 * Ruta protegida de ejemplo: devuelve los datos del usuario autenticado
 * a partir del token JWT verificado por el middleware.
 */
export function me(req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    user: req.user,
  });
}

/**
 * POST /api/auth/google
 * Recibe el credential (ID token) de Google Identity Services,
 * lo verifica contra Google y crea o recupera el usuario en PostgreSQL.
 * Devuelve el JWT de la aplicación junto al usuario.
 */
export async function googleLogin(req: Request, res: Response): Promise<void> {
  const { credential } = req.body as GoogleLoginBody;

  if (!credential) {
    res.status(400).json({
      success: false,
      message: 'Falta la credencial de Google.',
    });
    return;
  }

  if (!config.google.clientId) {
    res.status(500).json({
      success: false,
      message: 'Autenticación con Google no configurada en el servidor.',
    });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      res.status(401).json({
        success: false,
        message: 'Cuenta de Google inválida.',
      });
      return;
    }

    const usuario = await findOrCreateByGoogle(payload.sub, payload.email);

    const token = jwt.sign({ email: usuario.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión con Google exitoso.',
      token,
      user: {
        email: usuario.email,
        userId: usuario.id,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token de Google inválido o expirado.',
    });
  }
}
