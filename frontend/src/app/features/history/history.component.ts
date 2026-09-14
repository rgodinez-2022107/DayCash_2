import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IncomeService } from '../../core/income/income.service';
import { ExportService } from '../../core/export/export.service';
import {
  AppTransaction,
  buildTransactions,
  categoryLabel,
  paymentLabel,
  txLabel,
  todayISO,
} from '../../core/income/transaction.model';

type TypeFilter = 'todos' | 'ingreso' | 'egreso';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  searchQuery = '';
  typeFilter: TypeFilter = 'todos';
  categoryFilter = '';
  dateFrom = '';
  dateTo = '';
  pageSize = 10;
  currentPage = 1;

  constructor(
    public income: IncomeService,
    private exportService: ExportService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // La búsqueda de la barra superior navega a /history?q=...
    this.route.queryParams.subscribe((params) => {
      const q = params['q'];
      if (q) {
        this.searchQuery = q;
        this.currentPage = 1;
      }
    });
  }

  get allTxns(): AppTransaction[] {
    return buildTransactions(
      this.income.incomeTransactions(),
      this.income.expenseTransactions()
    );
  }

  get categories(): { key: string; label: string }[] {
    const keys = new Set<string>();
    for (const e of this.income.expenseTransactions()) {
      if (e.category) keys.add(e.category);
    }
    return Array.from(keys).map((k) => ({ key: k, label: categoryLabel(k) }));
  }

  get filtered(): AppTransaction[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.allTxns.filter((t) => {
      if (this.typeFilter !== 'todos' && t.type !== this.typeFilter) return false;
      if (this.typeFilter === 'egreso' && this.categoryFilter && t.category !== this.categoryFilter) return false;
      if (this.dateFrom && t.date < this.dateFrom) return false;
      if (this.dateTo && t.date > this.dateTo) return false;
      if (q) {
        const haystack = [
          t.note ?? '',
          t.type,
          categoryLabel(t.category ?? ''),
          paymentLabel(t.paymentMethod ?? ''),
          txLabel(t.label ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pageItems(): AppTransaction[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.pageCount }, (_, i) => i + 1);
  }

  setType(type: TypeFilter): void {
    this.typeFilter = type;
    this.currentPage = 1;
  }

  setPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.pageCount);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.typeFilter = 'todos';
    this.categoryFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
  }

  async deleteTx(tx: AppTransaction): Promise<void> {
    if (tx.type === 'egreso') {
      const idx = this.income.expenseTransactions().findIndex((e) => e.id === tx.id);
      if (idx >= 0) await this.income.removeEgreso(idx);
    } else {
      const idx = this.income.incomeTransactions().findIndex((t) => t.id === tx.id);
      if (idx >= 0) await this.income.removeIncomeTransaction(idx);
    }
  }

  exportCsv(): void {
    this.exportService.downloadCsv(this.filtered, `daycash_historial_${todayISO()}`);
  }

  formatMoney(value: number): string {
    return this.income.formatMoney(value);
  }

  categoryLabel = categoryLabel;
  paymentLabel = paymentLabel;
  txLabel = txLabel;
}