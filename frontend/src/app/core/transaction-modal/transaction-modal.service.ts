import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TransactionModalKind = 'ingreso' | 'egreso';

export interface TransactionModalState {
  open: boolean;
  kind: TransactionModalKind;
}

/**
 * Control global del modal "Agregar Transacción".
 * Cualquier parte de la app (sidebar, accesos rápidos, vistas)
 * puede abrir el mismo modal unificado preseleccionando el tipo.
 */
@Injectable({ providedIn: 'root' })
export class TransactionModalService {
  private readonly state$ = new BehaviorSubject<TransactionModalState>({
    open: false,
    kind: 'ingreso',
  });

  readonly state = this.state$.asObservable();

  open(kind: TransactionModalKind = 'ingreso'): void {
    this.state$.next({ open: true, kind });
  }

  close(): void {
    this.state$.next({ ...this.state$.value, open: false });
  }
}