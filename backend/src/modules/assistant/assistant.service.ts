import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { AccountsService } from '../accounts/accounts.service';
import { CardsService } from '../cards/cards.service';
import { LoansService } from '../loans/loans.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizarZona } from '../../common/utils/zona-horaria.util';
import {
  Accion,
  AccionDefinida,
  ALCANCE_POR_ROL,
  ALCANCE_PUBLICO,
  AlcanceIntencion,
} from './data/base-conocimiento';
import {
  IdiomaAsistente,
  LOCALE_POR_IDIOMA,
  normalizarIdioma,
  texto,
} from './data/textos-asistente';
import { intencionesFueraDeAlcance, reconocer } from './motor/intenciones';

export interface ContextoAsistente {
  usuarioId?: string;
  cuentaId?: string;
  rol?: RolUsuario;
  nombre?: string;
  idioma?: string;
  publico?: boolean;
}

export interface RespuestaAsistente {
  intencion: string;
  respuesta: string;
  acciones: Accion[];
  sugerencias: string[];
  requiereCuenta: boolean;
  requiereSesion: boolean;
  idioma: IdiomaAsistente;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger('Asistente');

  constructor(
    private readonly accountsService: AccountsService,
    private readonly cardsService: CardsService,
    private readonly loansService: LoansService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  private get zona(): string {
    return normalizarZona(this.configService.get<string>('APP_TIMEZONE'));
  }

  private dinero(valor: number, idioma: IdiomaAsistente): string {
    return Number(valor).toLocaleString(LOCALE_POR_IDIOMA[idioma], {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  }

  private fecha(
    valor: Date | string | null | undefined,
    idioma: IdiomaAsistente,
  ): string {
    if (!valor) {
      return '—';
    }
    return new Date(valor).toLocaleDateString(LOCALE_POR_IDIOMA[idioma], {
      timeZone: this.zona,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private traducirAcciones(
    acciones: AccionDefinida[],
    idioma: IdiomaAsistente,
  ): Accion[] {
    return acciones.map((accion) => ({
      etiqueta: texto(accion.clave, idioma),
      ruta: accion.ruta,
    }));
  }

  private traducirSugerencias(
    claves: string[],
    idioma: IdiomaAsistente,
  ): string[] {
    return claves.map((clave) => texto(clave, idioma));
  }

  private sugerenciasPara(
    contexto: ContextoAsistente,
    idioma: IdiomaAsistente,
  ): string[] {
    if (contexto.publico) {
      return this.traducirSugerencias(
        [
          'sugerencia.publico.cuenta',
          'sugerencia.publico.seguridad',
          'sugerencia.publico.atm',
        ],
        idioma,
      );
    }

    if (contexto.rol === RolUsuario.ADMINISTRADOR) {
      return this.traducirSugerencias(
        [
          'sugerencia.admin.alta',
          'sugerencia.admin.auditoria',
          'sugerencia.admin.reporte',
        ],
        idioma,
      );
    }

    return this.traducirSugerencias(
      ['sugerencia.saldo', 'sugerencia.prestamos', 'sugerencia.transferir'],
      idioma,
    );
  }

  private alcancesDe(contexto: ContextoAsistente): AlcanceIntencion[] {
    if (contexto.publico || !contexto.rol) {
      return ALCANCE_PUBLICO;
    }
    return ALCANCE_POR_ROL[contexto.rol] ?? ALCANCE_PUBLICO;
  }

  async responder(
    contexto: ContextoAsistente,
    mensaje: string,
  ): Promise<RespuestaAsistente> {
    const idioma = normalizarIdioma(contexto.idioma);
    const alcances = this.alcancesDe(contexto);
    const coincidencia = reconocer(mensaje, alcances);

    if (!coincidencia) {
      const otroAlcance = intencionesFueraDeAlcance(mensaje, alcances);

      if (otroAlcance) {
        if (contexto.publico) {
          return {
            intencion: 'requiere_sesion',
            respuesta: texto('fuera_alcance.publico', idioma),
            acciones: this.traducirAcciones(
              [{ clave: 'accion.acceder', ruta: '/login' }],
              idioma,
            ),
            sugerencias: this.sugerenciasPara(contexto, idioma),
            requiereCuenta: false,
            requiereSesion: true,
            idioma,
          };
        }

        const esAdmin = contexto.rol === RolUsuario.ADMINISTRADOR;

        return {
          intencion: 'fuera_de_alcance',
          respuesta: texto(
            esAdmin ? 'fuera_alcance.admin' : 'fuera_alcance.cliente',
            idioma,
          ),
          acciones: this.traducirAcciones(
            esAdmin
              ? [{ clave: 'accion.admin.usuarios', ruta: '/admin/usuarios' }]
              : [{ clave: 'accion.contacto', ruta: '/contacto' }],
            idioma,
          ),
          sugerencias: this.sugerenciasPara(contexto, idioma),
          requiereCuenta: false,
          requiereSesion: false,
          idioma,
        };
      }

      return {
        intencion: 'desconocida',
        respuesta: texto(
          contexto.publico ? 'desconocida.publica' : 'desconocida',
          idioma,
        ),
        acciones: this.traducirAcciones(
          contexto.publico
            ? [{ clave: 'accion.acceder', ruta: '/login' }]
            : [{ clave: 'accion.contacto', ruta: '/contacto' }],
          idioma,
        ),
        sugerencias: this.sugerenciasPara(contexto, idioma),
        requiereCuenta: false,
        requiereSesion: false,
        idioma,
      };
    }

    const intencion = coincidencia.intencion;

    if (intencion.alcance === 'CUENTA' && !contexto.cuentaId) {
      return {
        intencion: intencion.clave,
        respuesta: texto(
          contexto.publico ? 'requiere_sesion' : 'requiere_cuenta',
          idioma,
        ),
        acciones: this.traducirAcciones(
          contexto.publico
            ? [{ clave: 'accion.acceder', ruta: '/login' }]
            : [{ clave: 'accion.contacto', ruta: '/contacto' }],
          idioma,
        ),
        sugerencias: this.sugerenciasPara(contexto, idioma),
        requiereCuenta: !contexto.publico,
        requiereSesion: Boolean(contexto.publico),
        idioma,
      };
    }

    const base = {
      intencion: intencion.clave,
      acciones: this.traducirAcciones(intencion.acciones ?? [], idioma),
      sugerencias: intencion.sugerencias
        ? this.traducirSugerencias(intencion.sugerencias, idioma)
        : this.sugerenciasPara(contexto, idioma),
      requiereCuenta: false,
      requiereSesion: false,
      idioma,
    };

    try {
      const respuesta = await this.construir(intencion.clave, contexto, idioma);
      return { ...base, ...respuesta };
    } catch (error) {
      this.logger.error(
        `No fue posible resolver la intencion ${intencion.clave}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { ...base, respuesta: texto('error_consulta', idioma) };
    }
  }

  private async construir(
    clave: string,
    contexto: ContextoAsistente,
    idioma: IdiomaAsistente,
  ): Promise<Partial<RespuestaAsistente> & { respuesta: string }> {
    const cuentaId = contexto.cuentaId as string;
    const nombre = contexto.nombre ? contexto.nombre.split(' ')[0] : '';
    const sinCuenta = !cuentaId;

    switch (clave) {
      case 'saludo':
        if (contexto.publico) {
          return { respuesta: texto('saludo.publico', idioma) };
        }
        return {
          respuesta: nombre
            ? texto('saludo.con_nombre', idioma, { nombre })
            : texto('saludo.sin_nombre', idioma),
        };

      case 'despedida':
        return { respuesta: texto('despedida', idioma) };

      case 'capacidades':
        if (contexto.publico) {
          return { respuesta: texto('capacidades.publico', idioma) };
        }
        return {
          respuesta: texto(
            contexto.rol === RolUsuario.ADMINISTRADOR
              ? 'capacidades.admin'
              : 'capacidades.cliente',
            idioma,
          ),
        };

      case 'servicios_banco':
        return { respuesta: texto('servicios_banco', idioma) };

      case 'cuenta_apertura':
        return { respuesta: texto('cuenta_apertura', idioma) };

      case 'saldo': {
        const saldo = await this.accountsService.saldo(cuentaId);
        return {
          respuesta: texto('saldo', idioma, {
            monto: this.dinero(saldo.saldo, idioma),
            cuenta: saldo.numeroCuenta,
          }),
        };
      }

      case 'movimientos': {
        const movimientos = await this.accountsService.movimientos(cuentaId, 3);

        if (!movimientos.length) {
          return { respuesta: texto('movimientos.vacio', idioma) };
        }

        const resumen = movimientos
          .map((movimiento) =>
            texto('movimientos.linea', idioma, {
              fecha: this.fecha(movimiento.fecha, idioma),
              tipo: texto(`tipo.${movimiento.tipo}`, idioma),
              monto: this.dinero(movimiento.monto, idioma),
            }),
          )
          .join('; ');

        return { respuesta: texto('movimientos.detalle', idioma, { resumen }) };
      }

      case 'prestamos_estado': {
        const pendientes = await this.loansService.listarPendientes(cuentaId);

        if (!pendientes.length) {
          return {
            respuesta: texto('prestamos.sin_pendientes', idioma),
            acciones: this.traducirAcciones(
              [{ clave: 'accion.prestamos', ruta: '/prestamos' }],
              idioma,
            ),
          };
        }

        const detalle = pendientes
          .map((prestamo) =>
            texto('prestamos.linea', idioma, {
              folio: prestamo.folio,
              liquidacion: this.dinero(prestamo.montoLiquidacion, idioma),
              minimo: this.dinero(prestamo.pagoMinimo, idioma),
              fecha: this.fecha(prestamo.proximoPagoEn, idioma),
              hechos: prestamo.pagosRealizados,
              plazo: prestamo.plazoMeses,
            }),
          )
          .join('. ');

        return {
          respuesta: texto('prestamos.detalle', idioma, {
            cantidad: pendientes.length,
            palabra: texto(
              pendientes.length === 1
                ? 'prestamos.palabra.singular'
                : 'prestamos.palabra.plural',
              idioma,
            ),
            detalle,
          }),
        };
      }

      case 'prestamos_solicitar': {
        const condiciones = await this.loansService.condiciones(cuentaId);

        if (!condiciones.elegible) {
          return {
            respuesta: texto('prestamos.no_elegible', idioma, {
              motivos: condiciones.motivos.join(' '),
            }),
          };
        }

        return {
          respuesta: texto('prestamos.condiciones', idioma, {
            minimo: this.dinero(condiciones.montoMinimo, idioma),
            maximo: this.dinero(condiciones.montoMaximo, idioma),
            tasa: condiciones.tasaAnual,
            saldo: this.dinero(condiciones.saldoDisponible, idioma),
            perfil: condiciones.nombrePerfil,
          }),
        };
      }

      case 'prestamos_pagar': {
        const pendientes = await this.loansService.listarPendientes(cuentaId);

        if (!pendientes.length) {
          return {
            respuesta: texto('prestamos.pagar.sin_pendientes', idioma),
            acciones: this.traducirAcciones(
              [{ clave: 'accion.prestamos', ruta: '/prestamos' }],
              idioma,
            ),
          };
        }

        const total = pendientes.reduce(
          (suma, prestamo) => suma + prestamo.pagoMinimo,
          0,
        );

        return {
          respuesta: texto('prestamos.pagar.detalle', idioma, {
            total: this.dinero(Math.round(total * 100) / 100, idioma),
          }),
        };
      }

      case 'tarjetas_propias': {
        const tarjetas = await this.cardsService.listarPropias(cuentaId);

        if (!tarjetas.length) {
          return { respuesta: texto('tarjetas.sin_tarjetas', idioma) };
        }

        const detalle = tarjetas
          .map((tarjeta) => {
            const tipo =
              tarjeta.tipo === 'CREDITO'
                ? texto('tarjetas.tipo.credito', idioma, {
                    nivel: tarjeta.nombreNivel ?? '',
                  }).trim()
                : texto('tarjetas.tipo.debito', idioma);
            const credito =
              tarjeta.tipo === 'CREDITO' && tarjeta.creditoDisponible !== null
                ? texto('tarjetas.credito_disponible', idioma, {
                    monto: this.dinero(tarjeta.creditoDisponible, idioma),
                  })
                : '';
            return texto('tarjetas.linea', idioma, {
              numero: tarjeta.numeroTarjeta,
              tipo,
              estado: texto(`tarjetas.estado.${tarjeta.estado}`, idioma),
              credito,
            });
          })
          .join('; ');

        return {
          respuesta: texto('tarjetas.detalle', idioma, {
            cantidad: tarjetas.length,
            palabra: texto(
              tarjetas.length === 1
                ? 'tarjetas.palabra.singular'
                : 'tarjetas.palabra.plural',
              idioma,
            ),
            detalle,
          }),
        };
      }

      case 'tarjetas_catalogo': {
        if (sinCuenta) {
          return { respuesta: texto('tarjetas.catalogo.publico', idioma) };
        }

        const catalogo = await this.cardsService.catalogoCredito(cuentaId);
        const niveles = catalogo.niveles
          .map((nivel) =>
            texto('tarjetas.catalogo.nivel', idioma, {
              nombre: nivel.nombre,
              minimo: this.dinero(nivel.saldoMinimo, idioma),
            }),
          )
          .join(', ');

        const recomendacion = catalogo.nivelRecomendado
          ? texto('tarjetas.catalogo.recomendada', idioma, {
              nombre:
                catalogo.niveles.find((nivel) => nivel.recomendada)?.nombre ??
                '',
            })
          : texto('tarjetas.catalogo.sin_recomendacion', idioma);

        return {
          respuesta: texto('tarjetas.catalogo', idioma, {
            niveles,
            recomendacion,
          }),
        };
      }

      case 'tarjeta_bloqueo': {
        if (sinCuenta) {
          return { respuesta: texto('tarjeta.bloqueo.publico', idioma) };
        }

        const tarjetas = await this.cardsService.listarPropias(cuentaId);
        const bloqueadas = tarjetas.filter(
          (tarjeta) => tarjeta.estado === 'BLOQUEADA',
        );

        if (!bloqueadas.length) {
          return { respuesta: texto('tarjeta.sin_bloqueo', idioma) };
        }

        const detalle = bloqueadas
          .map((tarjeta) =>
            texto('tarjeta.bloqueo.linea', idioma, {
              numero: tarjeta.numeroTarjeta,
              motivo: texto(
                `tarjeta.motivo.${tarjeta.motivoBloqueo ?? 'ADMINISTRADOR'}`,
                idioma,
              ),
            }),
          )
          .join('. ');

        return { respuesta: `${detalle}.` };
      }

      case 'transferencia':
        return { respuesta: texto('transferencia', idioma) };

      case 'pago_servicios':
        return { respuesta: texto('pago_servicios', idioma) };

      case 'pin':
        return { respuesta: texto('pin', idioma) };

      case 'password':
        return { respuesta: texto('password', idioma) };

      case 'notificaciones': {
        if (sinCuenta) {
          return { respuesta: texto('notificaciones.publico', idioma) };
        }

        const resumen = await this.notificationsService.resumen(cuentaId);

        if (!resumen.noLeidas) {
          return {
            respuesta: texto('notificaciones.sin_pendientes', idioma, {
              total: resumen.total,
            }),
          };
        }

        return {
          respuesta: texto('notificaciones.con_pendientes', idioma, {
            noLeidas: resumen.noLeidas,
            palabra: texto(
              resumen.noLeidas === 1
                ? 'notificaciones.palabra.singular'
                : 'notificaciones.palabra.plural',
              idioma,
            ),
            total: resumen.total,
          }),
        };
      }

      case 'retiro_deposito':
        return { respuesta: texto('retiro_deposito', idioma) };

      case 'atm':
        return { respuesta: texto('atm', idioma) };

      case 'seguridad':
        return { respuesta: texto('seguridad', idioma) };

      case 'contacto':
        return { respuesta: texto('contacto', idioma) };

      case 'idioma':
        return { respuesta: texto('idioma', idioma) };

      case 'accesibilidad':
        return { respuesta: texto('accesibilidad', idioma) };

      case 'admin_usuarios':
        return { respuesta: texto('admin_usuarios', idioma) };

      case 'admin_auditoria':
        return { respuesta: texto('admin_auditoria', idioma) };

      case 'admin_reportes':
        return { respuesta: texto('admin_reportes', idioma) };

      default:
        return { respuesta: texto('desconocida', idioma) };
    }
  }
}
