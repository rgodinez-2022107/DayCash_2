import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { IncomeService } from '../../core/income/income.service';
import { IncomeSettingsComponent } from '../../shared/income-settings/income-settings.component';
import { GoalsSettingsComponent } from '../../shared/goals-settings/goals-settings.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IncomeSettingsComponent, GoalsSettingsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  userEmail: string | null;
  userName: string = 'Usuario';

  showIncomeSettings = false;
  showGoalsSettings = false;
  balanceTrend: string = '+0.0%';

  constructor(
    private authService: AuthService,
    private router: Router,
    public income: IncomeService
  ) {
    this.userEmail = this.authService.getCurrentUserEmail();
    if (this.userEmail) {
      this.userName = this.userEmail.split('@')[0];
    }
  }

  ngOnInit(): void {
    // Carga los datos (metas, categorías, transacciones e ingresos) desde PostgreSQL
    this.income.loadFromApi();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
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
    const variableShare = (this.income.variableSubtotal / this.income.monthlyTotal) * 100;
    return Math.round(variableShare);
  }

  openIncomeSettings(): void {
    this.showIncomeSettings = true;
  }

  closeIncomeSettings(): void {
    this.showIncomeSettings = false;
  }

  openGoalsSettings(): void {
    this.showGoalsSettings = true;
  }

  closeGoalsSettings(): void {
    this.showGoalsSettings = false;
  }

  addTransaction(): void {
    console.log('Abrir modal de nueva transacción');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}