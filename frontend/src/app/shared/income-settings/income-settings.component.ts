import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncomeService } from '../../core/income/income.service';

@Component({
  selector: 'app-income-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './income-settings.component.html',
  styleUrls: ['./income-settings.component.scss'],
})
export class IncomeSettingsComponent {
  @Output() close = new EventEmitter<void>();

  constructor(public income: IncomeService) {}

  onSubmit(): void {
    const total = this.income.monthlyTotal;
    const note = this.income.incomeNote().trim();
    this.income.addIncomeTransaction(total, note);
    // Guarda también los campos de ingreso fijo/variable en la BD
    this.income.saveUserConfig();
    this.onClose();
  }

  onClose(): void {
    // Persistir los cambios de ingreso aunque no se registre una transacción
    this.income.saveUserConfig();
    this.close.emit();
  }
}