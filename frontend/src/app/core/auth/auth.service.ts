// frontend/src/app/core/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { SessionModalService } from './session-modal.service';

export const TOKEN_KEY = 'finance_app_token';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: { email: string };
}

interface DecodedToken {
  email: string;
  exp: number;
  iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private http: HttpClient,
    private sessionModalService: SessionModalService
  ) {
    const token = this.getToken();
    if (token) {
      if (this.isTokenExpired(token)) {
        this.handleExpiration();
      } else {
        this.scheduleExpirationTimer(token);
      }
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          if (response?.token) {
            this.setToken(response.token);
            this.scheduleExpirationTimer(response.token);
          }
        })
      );
  }

  googleLogin(credential: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/google`, { credential })
      .pipe(
        tap((response) => {
          if (response?.token) {
            this.setToken(response.token);
            this.scheduleExpirationTimer(response.token);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.clearExpirationTimer();
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    return !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return decoded.exp <= nowInSeconds;
    } catch {
      return true;
    }
  }

  getCurrentUserEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.email;
    } catch {
      return null;
    }
  }

  private scheduleExpirationTimer(token: string): void {
    this.clearExpirationTimer();

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const nowMs = Date.now();
      const expirationMs = decoded.exp * 1000;
      const delayMs = expirationMs - nowMs;

      if (delayMs <= 0) {
        this.handleExpiration();
        return;
      }

      this.expirationTimer = setTimeout(() => {
        this.handleExpiration();
      }, delayMs);
    } catch {
      this.handleExpiration();
    }
  }

  private clearExpirationTimer(): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  private handleExpiration(): void {
    this.logout();
    this.sessionModalService.show();
  }
}