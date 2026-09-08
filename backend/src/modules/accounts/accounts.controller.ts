import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TipoTransaccion } from '../transactions/enums/tipo-transaccion.enum';
import { esFechaValida } from '../../common/utils/zona-horaria.util';
import { AccountsService, FiltrosMovimientos } from './accounts.service';

@ApiTags('Cuentas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  private cuentaDe(usuario: JwtPayload): string {
    if (!usuario.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }
    return usuario.cuentaId;
  }

  private limiteDe(limite?: string): number {
    return Number(limite) > 0 ? Math.min(Number(limite), 100) : 20;
  }

  private filtrosDe(
    desde?: string,
    hasta?: string,
    tipo?: string,
  ): FiltrosMovimientos {
    const filtros: FiltrosMovimientos = {};

    if (desde) {
      if (!esFechaValida(desde)) {
        throw new BadRequestException(
          'El parametro desde debe ser una fecha valida con formato AAAA-MM-DD',
        );
      }
      filtros.desde = desde;
    }

    if (hasta) {
      if (!esFechaValida(hasta)) {
        throw new BadRequestException(
          'El parametro hasta debe ser una fecha valida con formato AAAA-MM-DD',
        );
      }
      filtros.hasta = hasta;
    }

    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final',
      );
    }

    if (tipo) {
      const valor = tipo.toUpperCase() as TipoTransaccion;
      if (!Object.values(TipoTransaccion).includes(valor)) {
        throw new BadRequestException('El tipo de movimiento no es valido');
      }
      filtros.tipo = valor;
    }

    return filtros;
  }

  @Get()
  @ApiOperation({
    summary: 'Cuentas del usuario autenticado (RF-02 / HU-BE-02 / HU-PW-02)',
  })
  listar(@CurrentUser() usuario: JwtPayload) {
    return this.accountsService.listarPorUsuario(usuario.sub);
  }

  @Get('me')
  @ApiOperation({ summary: 'Resumen de la cuenta autenticada (RF-02 / HU-BE-02)' })
  resumen(@CurrentUser() usuario: JwtPayload) {
    return this.accountsService.resumen(this.cuentaDe(usuario));
  }

  @Get('me/saldo')
  @ApiOperation({ summary: 'Saldo disponible (RF-02 / RF-10 / HU-ATM-02)' })
  saldoPropio(@CurrentUser() usuario: JwtPayload) {
    return this.accountsService.saldo(this.cuentaDe(usuario));
  }

  @Get('me/movimientos')
  @ApiOperation({
    summary:
      'Historial de movimientos con filtros opcionales (RF-03 / HU-BE-03 / HU-PW-02 / HU-ATM-08)',
  })
  @ApiQuery({ name: 'limite', required: false, example: 20 })
  @ApiQuery({ name: 'desde', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', required: false, example: '2026-12-31' })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoTransaccion })
  movimientosPropios(
    @CurrentUser() usuario: JwtPayload,
    @Query('limite') limite?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.accountsService.movimientos(
      this.cuentaDe(usuario),
      this.limiteDe(limite),
      this.filtrosDe(desde, hasta, tipo),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Resumen de una cuenta propia (RF-02 / HU-PW-02)' })
  async resumenPorId(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.accountsService.verificarPropiedad(id, usuario.sub, usuario.rol);
    return this.accountsService.resumen(id);
  }

  @Get(':id/saldo')
  @ApiOperation({
    summary: 'Saldo de una cuenta especifica validando propiedad (RNF-03)',
  })
  async saldoPorId(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.accountsService.verificarPropiedad(id, usuario.sub, usuario.rol);
    return this.accountsService.saldo(id);
  }

  @Get(':id/movimientos')
  @ApiOperation({
    summary: 'Movimientos de una cuenta especifica (RF-03 / RF-17 / HU-PW-07)',
  })
  @ApiQuery({ name: 'limite', required: false, example: 20 })
  @ApiQuery({ name: 'desde', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', required: false, example: '2026-12-31' })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoTransaccion })
  async movimientosPorId(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limite') limite?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('tipo') tipo?: string,
  ) {
    await this.accountsService.verificarPropiedad(id, usuario.sub, usuario.rol);
    return this.accountsService.movimientos(
      id,
      this.limiteDe(limite),
      this.filtrosDe(desde, hasta, tipo),
    );
  }
}
