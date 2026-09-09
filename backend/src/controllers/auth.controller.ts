import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { findByEmail } from '../repositories/usuario.repository';

interface LoginBody {
  email?: string;
  password?: string;
}

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
  if (!usuario) {
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
