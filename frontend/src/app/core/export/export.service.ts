import { Injectable } from '@angular/core';
import { AppTransaction, categoryLabel, paymentLabel, txLabel } from '../income/transaction.model';
import { IncomeService } from '../income/income.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Servicio de exportación y mantenimiento de datos.
 * Genera CSV para Excel y un reporte imprimible (PDF mediante
 * el diálogo de impresión del navegador) a partir del historial
 * unificado de transacciones.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor(
    private income: IncomeService,
    private settings: SettingsService
  ) {}

  private formatMoney(value: number): string {
    return this.income.formatMoney(value);
  }

  private headerRow(): string[] {
    return ['Fecha', 'Tipo', 'Categoría', 'Método de pago', 'Etiqueta', 'Comentario', 'Monto (Q)'];
  }

  private toRow(t: AppTransaction): string[] {
    return [
      t.date,
      t.type === 'ingreso' ? 'Ingreso' : 'Egreso',
      t.type === 'egreso' ? categoryLabel(t.category ?? '') : '',
      t.type === 'egreso' ? paymentLabel(t.paymentMethod ?? '') : '',
      t.type === 'egreso' ? txLabel(t.label ?? '') : '',
      t.note ?? '',
      t.amount.toFixed(2),
    ];
  }

  private escapeCsv(value: string): string {
    if (/[",;\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /** Descarga el historial completo como CSV (compatible con Excel). */
  downloadCsv(txns: AppTransaction[], filename: string): void {
    const rows = [this.headerRow(), ...txns.map((t) => this.toRow(t))];
    const csv = rows.map((r) => r.map((c) => this.escapeCsv(c)).join(',')).join('\r\n');
    // BOM para que Excel respete los acentos y la "Q"
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre un reporte imprimible en una ventana nueva y lanza el dialogo
   * de impresión (permite guardar como PDF desde el navegador).
   */
  printReport(txns: AppTransaction[], title: string): void {
    const totalIncome = txns
      .filter((t) => t.type === 'ingreso')
      .reduce((a, t) => a + t.amount, 0);
    const totalExpense = txns
      .filter((t) => t.type === 'egreso')
      .reduce((a, t) => a + t.amount, 0);

    const rowsHtml = txns
      .map(
        (t) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
          <td>${t.type === 'egreso' ? categoryLabel(t.category ?? '') : ''}</td>
          <td>${t.type === 'egreso' ? paymentLabel(t.paymentMethod ?? '') : ''}</td>
          <td>${t.type === 'egreso' ? txLabel(t.label ?? '') : ''}</td>
          <td>${(t.note ?? '').replace(/</g, '&lt;')}</td>
          <td style="text-align:right">Q&nbsp;${t.amount.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${title} - DayCash</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0b192c; padding: 24px; }
  h1 { color: #0b192c; font-size: 20px; margin: 0 0 4px; }
  .sub { color: #667; font-size: 12px; margin-bottom: 18px; }
  .summary { display: flex; gap: 24px; margin-bottom: 18px; }
  .summary div { border: 1px solid #d5dbe4; border-radius: 8px; padding: 10px 16px; }
  .summary b { font-size: 18px; color: #df7f0b; display: block; }
  .summary span { font-size: 11px; color: #667; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d5dbe4; padding: 7px 9px; font-size: 12px; text-align: left; }
  th { background: #112240; color: #fff; }
  tr:nth-child(even) { background: #f4f6fa; }
  .footer { margin-top: 16px; font-size: 10px; color: #8892b0; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">Generado el ${new Date().toLocaleString('es-GT')} &middot; DayCash Finance</div>
  <div class="summary">
    <div><span>Ingresos</span><b>Q&nbsp;${totalIncome.toFixed(2)}</b></div>
    <div><span>Egresos</span><b>Q&nbsp;${totalExpense.toFixed(2)}</b></div>
    <div><span>Balance neto</span><b>Q&nbsp;${(totalIncome - totalExpense).toFixed(2)}</b></div>
  </div>
  <table>
    <thead>
      <tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Método</th><th>Etiqueta</th><th>Comentario</th><th>Monto</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">${this.settings.preferences().currency} &middot; DayCash &middot; ${txns.length} movimientos</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=680');
    if (!win) {
      alert('Permite las ventanas emergentes para exportar el reporte.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  /**
   * Restablece los datos locales de la sesión: preferencias y
   * configuración de ingresos, sin cerrar la sesión ni borrar la BD.
   */
  resetLocalData(): void {
    localStorage.removeItem('daycash_preferences');
    this.settings.preferences.set({
      currency: 'GTQ',
      notificationsEnabled: true,
      antSpendingAlerts: true,
      antThreshold: 50,
      theme: 'dark',
    });
    this.settings.applyTheme();
    this.income.fixedIncome.set(15000);
    this.income.variableHours.set(0);
    this.income.variableRate.set(100);
    this.income.incomeNote.set('');
    void this.income.saveUserConfig();
    void this.income.loadFromApi();
  }
}