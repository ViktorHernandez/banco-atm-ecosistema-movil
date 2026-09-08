import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, finalize } from 'rxjs';

export interface EventoTiempoReal {
  tipo: string;
  datos: Record<string, unknown>;
}

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger('TiempoReal');
  private readonly canales = new Map<string, Set<Subject<EventoTiempoReal>>>();

  suscribir(cuentaId: string): Observable<EventoTiempoReal> {
    const flujo = new Subject<EventoTiempoReal>();

    if (!this.canales.has(cuentaId)) {
      this.canales.set(cuentaId, new Set());
    }
    this.canales.get(cuentaId)?.add(flujo);

    this.logger.log(
      `Sesion conectada a la cuenta ${cuentaId} (${this.conexionesDe(cuentaId)} activas)`,
    );

    return flujo.asObservable().pipe(
      finalize(() => {
        const conjunto = this.canales.get(cuentaId);
        if (!conjunto) {
          return;
        }
        conjunto.delete(flujo);
        if (conjunto.size === 0) {
          this.canales.delete(cuentaId);
        }
        this.logger.log(
          `Sesion desconectada de la cuenta ${cuentaId} (${this.conexionesDe(cuentaId)} activas)`,
        );
      }),
    );
  }

  emitir(cuentaId: string, evento: EventoTiempoReal): void {
    const conjunto = this.canales.get(cuentaId);
    if (!conjunto || conjunto.size === 0) {
      return;
    }

    conjunto.forEach((flujo) => {
      try {
        flujo.next(evento);
      } catch (error) {
        this.logger.error(
          `No se pudo emitir el evento a la cuenta ${cuentaId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
  }

  conexionesDe(cuentaId: string): number {
    return this.canales.get(cuentaId)?.size ?? 0;
  }

  totalConexiones(): number {
    let total = 0;
    this.canales.forEach((conjunto) => {
      total += conjunto.size;
    });
    return total;
  }

  onModuleDestroy(): void {
    this.canales.forEach((conjunto) => {
      conjunto.forEach((flujo) => flujo.complete());
    });
    this.canales.clear();
  }
}
