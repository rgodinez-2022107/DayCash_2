import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../auth/auth.service';
import { SettingsService } from '../settings/settings.service';
import { TransactionModalService } from '../transaction-modal/transaction-modal.service';
import { IncomeService, ExpenseTransaction } from '../income/income.service';
import { AddTransactionComponent } from '../../shared/add-transaction/add-transaction.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AddTransactionComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
})
export class AppShellComponent implements OnInit, OnDestroy {
  showNotifications = false;
  searchQuery = '';
  private navSub: Subscription;

  @ViewChild('pageScroll', { static: true }) pageScroll!: ElementRef<HTMLDivElement>;

  constructor(
    public auth: AuthService,
    public settings: SettingsService,
    public income: IncomeService,
    private transactionModal: TransactionModalService,
    private router: Router
  ) {
    // Cada navegación sube el scroll al inicio: ninguna página hereda
    // la posición de la anterior (evita que se "pierda" el encabezado).
    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.pageScroll?.nativeElement.scrollTo({ left: 0, top: 0 });
      });
  }

  ngOnInit(): void {
    // Carga inicial de datos (metas, categorías, egresos e ingresos)
    this.income.loadFromApi();
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
  }

  get profile(): UserProfile | null {
    return this.auth.currentUser();
  }

  get displayName(): string {
    const p = this.profile;
    if (p?.name) return p.name;
    if (p?.email) return p.email.split('@')[0];
    return 'Usuario';
  }

  get avatarPicture(): string | null {
    return this.profile?.picture ?? null;
  }

  get initials(): string {
    const parts = this.displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? 'U';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  /** Gastos hormiga: egresos pequeños detectados para la campana. */
  get antAlertsEnabled(): boolean {
    return this.settings.preferences().antSpendingAlerts;
  }

  get antExpenses(): ExpenseTransaction[] {
    if (!this.antAlertsEnabled) return [];
    const threshold = this.settings.preferences().antThreshold;
    return this.income
      .expenseTransactions()
      .filter((e) => e.amount > 0 && e.amount <= threshold)
      .slice(0, 5);
  }

  openAddTransaction(): void {
    this.transactionModal.open('ingreso');
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  onSearchEnter(): void {
    this.router.navigate(['/app/history'], {
      queryParams: { q: this.searchQuery || null },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}