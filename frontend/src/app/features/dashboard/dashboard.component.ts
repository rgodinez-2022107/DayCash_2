import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { IncomeService } from '../../core/income/income.service';
import { TransactionModalService } from '../../core/transaction-modal/transaction-modal.service';
import { GoalsSettingsComponent } from '../../shared/goals-settings/goals-settings.component';
import { buildTransactions } from '../../core/income/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, GoalsSettingsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  showGoalsSettings = false;

  constructor(
    public auth: AuthService,
    public income: IncomeService,
    private modal: TransactionModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Carga metas, categorías, transacciones e ingresos desde PostgreSQL
    this.income.loadFromApi();
  }

  get userName(): string {
    return this.auth.currentUser()?.name || this.auth.getCurrentUserEmail()?.split('@')[0] || 'Usuario';
  }

  get totalBalance(): string {
    return this.income.formatMoney(this.income.monthlyTotal);
  }

  get fixedIncomeProgress(): number {
    if (this.income.monthlyTotal <= 0) return 0;
    return Math.round((this.income.fixedIncome() / this.income.monthlyTotal) * 100);
  }

  get variableIncomeProgress(): number {
    if (this.income.monthlyTotal <= 0) return 0;
    return Math.round((this.income.variableSubtotal / this.income.monthlyTotal) * 100);
  }

  get totalExpenses(): number {
    return this.income.expenseTransactions().reduce((sum, tx) => sum + tx.amount, 0);
  }

  get netBalance(): number {
    return this.income.monthlyTotal - this.totalExpenses;
  }

  get recentTxns() {
    return buildTransactions(
      this.income.incomeTransactions(),
      this.income.expenseTransactions()
    ).slice(0, 6);
  }

  openNewIncome(): void {
    this.modal.open('ingreso');
  }

  openNewExpense(): void {
    this.modal.open('egreso');
  }

  openGoalsSettings(): void {
    this.showGoalsSettings = true;
  }

  closeGoalsSettings(): void {
    this.showGoalsSettings = false;
  }

  viewAllActivity(): void {
    this.router.navigate(['/app/history']);
  }

  viewStatistics(): void {
    this.router.navigate(['/app/statistics']);
  }
}