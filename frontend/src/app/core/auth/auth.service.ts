// frontend/src/app/core/auth/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, lastValueFrom, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { SessionModalService } from './session-modal.service';

export const TOKEN_KEY = 'finance_app_token';
export const USER_PROFILE_KEY = 'finance_app_user';

/**
 * Configuración de la sesión deslizante:
 * la sesión NO vence 30 min después de iniciar sesión, sino 30 minutos
 * después de la última interacción del usuario. Mientras el usuario
 * interactúa con la app, el token se renueva de forma transparente
 * antes de que expire.
 */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const SESSION_CHECK_MS = 15 * 1000; // revisa la vigencia cada 15 segundos
const REFRESH_AHEAD_MS = 2 * 60 * 1000; // renueva cuando quedan < 2 minutos

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  email: string;
  name?: string | null;
  picture?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserProfile & { userId?: number };
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

  /** Perfil del usuario autenticado (correo, nombre y foto de Google). */
  readonly currentUser = signal<UserProfile | null>(null);

  // --- Sesión deslizante (última interacción) ---
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private listenersAttached = false;
  private idleCheckStarted = false;
  private lastActivity = Date.now();
  private refreshInFlight: Promise<void> | null = null;

  private readonly ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'wheel',
  ] as const;

  constructor(
    private http: HttpClient,
    private sessionModalService: SessionModalService
  ) {
    this.currentUser.set(this.loadProfile());
    const token = this.getToken();
    if (token) {
      if (this.isTokenExpired(token)) {
        this.handleExpiration();
      } else {
        this.scheduleExpirationTimer(token);
        this.activateSession();
      }
    }
  }

  private loadProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_PROFILE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed && typeof parsed.email === 'string') return parsed;
      return null;
    } catch {
      return null;
    }
  }

  private saveProfile(profile: UserProfile | null): void {
    this.currentUser.set(profile);
    if (profile) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  }

  /** Actualiza el perfil local (p. ej. tras refrescar desde /usuario). */
  updateProfile(patch: Partial<UserProfile>): void {
    const current = this.currentUser() ?? { email: this.getCurrentUserEmail() ?? '' };
    this.saveProfile({ ...current, ...patch });
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          if (response?.token) {
            this.setToken(response.token);
            this.saveProfile({
              email: response.user?.email,
              name: response.user?.name,
              picture: response.user?.picture,
            });
            this.scheduleExpirationTimer(response.token);
            this.activateSession();
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
            this.saveProfile({
              email: response.user?.email,
              name: response.user?.name,
              picture: response.user?.picture,
            });
            this.scheduleExpirationTimer(response.token);
            this.activateSession();
          }
        })
      );
  }

  /**
   * Renueva el JWT actual por uno nuevo (servidor firma otro token con
   * 30 min de vigencia). Solo se usa mientras hay interacción activa y
   * al token aún no le ocurre nada: al renovarse, el contador de la
   * sesión vuelve a empezar desde la última interacción.
   */
  refreshToken(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, null);
  }

  // ===== Sesión deslizante: vida útil desde la última interacción =====

  private activateSession(): void {
    this.lastActivity = Date.now();
    this.attachActivityListeners();
    this.startIdleCheck();
  }

  private attachActivityListeners(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;
    for (const event of this.ACTIVITY_EVENTS) {
      window.addEventListener(event, this.onActivity, { passive: true });
    }
  }

  private readonly onActivity = (): void => {
    this.lastActivity = Date.now();
  };

  private startIdleCheck(): void {
    if (this.idleCheckStarted) return;
    this.idleCheckStarted = true;
    this.idleTimer = setInterval(() => {
      void this.checkSessionLiveness();
    }, SESSION_CHECK_MS);
  }

  private stopIdleCheck(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
      this.idleCheckStarted = false;
    }
  }

  /**
   * Decide en cada tick si la sesión sigue viva:
   * - Lleva más de 30 min sin interacción → cierra sesión.
   * - El token vence pronto y el usuario es activo → lo renueva en silencio.
   */
  private async checkSessionLiveness(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    if (!this.isAuthenticated()) {
      this.handleExpiration();
      return;
    }

    const idle = Date.now() - this.lastActivity;
    if (idle >= IDLE_TIMEOUT_MS) {
      this.handleExpiration();
      return;
    }

    const remaining = this.msToExpiry(token);
    if (remaining !== null && remaining <= REFRESH_AHEAD_MS) {
      await this.tryRefresh();
    }
  }

  private msToExpiry(token: string): number | null {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.exp * 1000 - Date.now();
    } catch {
      return null;
    }
  }

  /** Renueva el token sin interrumpir al usuario; ignora errores transitorios. */
  private async tryRefresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = lastValueFrom(this.refreshToken())
      .then((response) => {
        if (response?.token) {
          this.setToken(response.token);
          this.saveProfile({
            email: response.user?.email,
            name: response.user?.name,
            picture: response.user?.picture,
          });
          this.scheduleExpirationTimer(response.token);
        }
      })
      .catch(() => {
        // La próxima verificación (o un 401 real) resolverá la sesión.
      })
      .finally(() => {
        this.refreshInFlight = null;
      });
    return this.refreshInFlight;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.saveProfile(null);
    this.clearExpirationTimer();
    this.stopIdleCheck();
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