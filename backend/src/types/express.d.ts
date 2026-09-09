export interface AuthenticatedUser {
  email: string;
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
