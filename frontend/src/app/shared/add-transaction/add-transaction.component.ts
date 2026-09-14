import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  TransactionModalService,
  TransactionModalKind,
} from '../../core/transaction-modal/transaction-modal.service';
import { IncomeService } from '../../core/income/income.service';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  TX_LABELS,
  categoryLabel,
  paymentLabel,
  txLabel,
} from '../../core/income/transaction.model';
import { SettingsService } from '../../core/settings/settings.service';
import { MonthlyStatsService } from '../../core/analytics/monthly-stats.service';

/**
 * Modal global para registrar cualquier movimiento.
 * Abre con el tipo preseleccionado (Ingreso/Egreso) y al confirmar
 * actualiza el estado reactivo de IncomeService: el balance,
 * el progreso de metas y la actividad reciente se refrescan de inmediato.
 */
@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
})
export class AddTransactionComponent implements OnDestroy {
  open = false;
  kind: TransactionModalKind = 'ingreso';
  saving = false;

  // Formulario de ingreso
  incomeAmount = 0;
  incomeNote = '';

  // Formulario de egreso
  expenseAmount = 0;
  selectedCategory = '';
  selectedPaymentMethod = '';
  selectedLabel = '';
  expenseNote = '';

  private sub: Subscription;

  constructor(
    public income: IncomeService,
    public settings: SettingsService,
    public monthlyStats: MonthlyStatsService,
    private modal: TransactionModalService
  ) {
    this.sub = this.modal.state.subscribe((state) => {
      this.open = state.open;
      if (state.open) {
        this.kind = state.kind;
        this.resetForms();
      }
    });
  }

  get categories(): { key: string; label: string }[] {
    return EXPENSE_CATEGORIES.map((c) => ({ key: c, label: categoryLabel(c) }));
  }

  get paymentMethods(): { key: string; label: string }[] {
    return PAYMENT_METHODS.map((m) => ({ key: m, label: paymentLabel(m) }));
  }

  get labels(): { key: string; label: string }[] {
    return TX_LABELS.map((l) => ({ key: l, label: txLabel(l) }));
  }

  /** Dinero disponible para gastar (ingresos − gastos del mes). */
  get availableBalance(): number {
    return this.monthlyStats.monthlyRestante();
  }

  /** True si el monto del egreso supera el dinero registrado. */
  get insufficientFunds(): boolean {
    return (
      this.kind === 'egreso' &&
      this.expenseAmount > this.availableBalance
    );
  }

  selectKind(kind: TransactionModalKind): void {
    this.kind = kind;
  }

  /** Al editar la config de ingreso, el monto se sugiere con el total mensual. */
  syncIncomeAmount(): void {
    this.incomeAmount = this.income.monthlyTotal;
  }

  private resetForms(): void {
    this.incomeAmount = this.income.monthlyTotal;
    this.incomeNote = '';
    this.expenseAmount = 0;
    this.selectedCategory = '';
    this.selectedPaymentMethod = '';
    this.selectedLabel = '';
    this.expenseNote = '';
    this.saving = false;
  }

  async submit(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      if (this.kind === 'ingreso') {
        if (!this.incomeAmount || this.incomeAmount <= 0) return;
        // Persistir config de ingresos y registrar el movimiento
        await this.income.saveUserConfig();
        await this.income.addIncomeTransaction(this.incomeAmount, this.incomeNote.trim());
      } else {
        if (
          !this.expenseAmount ||
          this.expenseAmount <= 0 ||
          !this.selectedCategory ||
          !this.selectedPaymentMethod
        ) {
          return;
        }
        if (this.insufficientFunds) {
          return;
        }
        await this.income.addEgreso(
          this.expenseAmount,
          this.selectedCategory,
          this.selectedPaymentMethod,
          this.selectedLabel,
          this.expenseNote.trim()
        );
      }
      this.close();
    } finally {
      this.saving = false;
    }
  }

  close(): void {
    if (this.saving) return;
    this.modal.close();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}