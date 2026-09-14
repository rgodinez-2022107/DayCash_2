import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncomeService } from '../../core/income/income.service';
import { MonthlyStatsService } from '../../core/analytics/monthly-stats.service';
import { MonthlyFlowChartComponent } from '../../shared/charts/monthly-flow-chart.component';
import { ExpensePieChartComponent } from '../../shared/charts/expense-pie-chart.component';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, MonthlyFlowChartComponent, ExpensePieChartComponent],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent {
  constructor(
    public monthlyStats: MonthlyStatsService,
    public income: IncomeService
  ) {}

  formatMoney(value: number): string {
    return this.income.formatMoney(value);
  }
}