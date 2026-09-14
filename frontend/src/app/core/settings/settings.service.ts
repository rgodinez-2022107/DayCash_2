import { Injectable, signal } from '@angular/core';

/**
 * Preferencias de la aplicación.
 * La moneda está fijada a Quetzales (GTQ) por diseño de la aplicación.
 */
export interface AppPreferences {
  currency: 'GTQ';
  notificationsEnabled: boolean;
  antSpendingAlerts: boolean;
  antThreshold: number;
  theme: 'dark' | 'light';
}

const STORAGE_KEY = 'daycash_preferences';

const DEFAULT_PREFERENCES: AppPreferences = {
  currency: 'GTQ',
  notificationsEnabled: true,
  antSpendingAlerts: true,
  antThreshold: 50,
  theme: 'dark',
};

function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<AppPreferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly preferences = signal<AppPreferences>(loadPreferences());

  constructor() {
    this.applyTheme();
  }

  /** Aplica el tema en el atributo data-theme del <html>. */
  applyTheme(): void {
    document.documentElement.setAttribute(
      'data-theme',
      this.preferences().theme
    );
  }

  update(patch: Partial<AppPreferences>): void {
    const next = { ...this.preferences(), ...patch };
    this.preferences.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // almacenamiento no disponible: el cambio vive solo en memoria
    }
    this.applyTheme();
  }

  /** Quetzales guatemaltecos: moneda única de la aplicación. */
  isGTQ(): boolean {
    return this.preferences().currency === 'GTQ';
  }
}