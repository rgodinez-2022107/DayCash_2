import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { SettingsService } from '../../core/settings/settings.service';
import { ExportService } from '../../core/export/export.service';
import { IncomeService } from '../../core/income/income.service';
import { buildTransactions, todayISO } from '../../core/income/transaction.model';

type ServerStatus = 'checking' | 'online' | 'offline';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnDestroy {
  editingName = false;
  draftName = '';
  serverStatus: ServerStatus = 'checking';
  private healthSub: Subscription | null = null;

  environment = environment;

  constructor(
    public auth: AuthService,
    public settings: SettingsService,
    public income: IncomeService,
    private exportService: ExportService,
    private http: HttpClient
  ) {
    this.checkServer();
  }

  get prefs() {
    return this.settings.preferences();
  }

  get user() {
    return this.auth.currentUser();
  }

  startEditName(): void {
    this.draftName = this.user?.name ?? '';
    this.editingName = true;
  }

  async saveName(): Promise<void> {
    const name = this.draftName.trim();
    if (name) {
      this.auth.updateProfile({ name });
      // El perfil se persiste en la cuenta (solo si el backend lo soporta)
      try {
        await this.income.loadFromApi();
      } catch {
        // el perfil local ya quedó actualizado
      }
    }
    this.editingName = false;
  }

  cancelEditName(): void {
    this.editingName = false;
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.settings.update({ theme });
  }

  onThresholdChange(value: number): void {
    this.settings.update({ antThreshold: Math.max(0, value) });
  }

  onNotificationsChange(event: Event): void {
    this.settings.update({
      notificationsEnabled: (event.target as HTMLInputElement).checked,
    });
  }

  onAntAlertsChange(event: Event): void {
    this.settings.update({
      antSpendingAlerts: (event.target as HTMLInputElement).checked,
    });
  }

  get allTxns() {
    return buildTransactions(
      this.income.incomeTransactions(),
      this.income.expenseTransactions()
    );
  }

  exportCsv(): void {
    this.exportService.downloadCsv(
      this.allTxns,
      `daycash_historial_completo_${todayISO()}`
    );
  }

  printReport(): void {
    this.exportService.printReport(this.allTxns, 'Reporte Financiero DayCash');
  }

  resetLocalData(): void {
    const confirmed = window.confirm(
      'Esto restablece preferencias y la configuración de ingresos local (no borra tu historial). ¿Continuar?'
    );
    if (!confirmed) return;
    this.exportService.resetLocalData();
  }

  checkServer(): void {
    this.serverStatus = 'checking';
    this.healthSub?.unsubscribe();
    this.healthSub = this.http
      .get<{ status: string }>(`${environment.apiUrl}/health`)
      .subscribe({
        next: () => (this.serverStatus = 'online'),
        error: () => (this.serverStatus = 'offline'),
      });
  }

  get firstInitial(): string {
    return (this.user?.name ?? this.user?.email ?? '?').charAt(0).toUpperCase();
  }

  ngOnDestroy(): void {
    this.healthSub?.unsubscribe();
  }
}