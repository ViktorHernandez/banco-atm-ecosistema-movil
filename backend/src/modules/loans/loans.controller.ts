import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  PagoMultipleDto,
  PagoPrestamoDto,
} from './dto/pago-prestamo.dto';
import { SolicitarPrestamoDto } from './dto/solicitar-prestamo.dto';
import { LoansService } from './loans.service';

@ApiTags('Prestamos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  private cuentaDe(usuario: JwtPayload): string {
    if (!usuario.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }
    return usuario.cuentaId;
  }

  @Get('condiciones')
  @ApiOperation({
    summary:
      'Condiciones de prestamo calculadas con el saldo y el nivel de tarjeta de credito del cliente',
  })
  condiciones(@CurrentUser() usuario: JwtPayload) {
    return this.loansService.condiciones(this.cuentaDe(usuario));
  }

  @Get('me')
  @ApiOperation({ summary: 'Prestamos solicitados por el cliente' })
  listar(@CurrentUser() usuario: JwtPayload) {
    return this.loansService.listarPropios(this.cuentaDe(usuario));
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Prestamos vigentes con pago pendiente' })
  pendientes(@CurrentUser() usuario: JwtPayload) {
    return this.loansService.listarPendientes(this.cuentaDe(usuario));
  }

  @Post('pagos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pago de varios prestamos en una sola operacion',
  })
  pagarVarios(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: PagoMultipleDto,
  ) {
    return this.loansService.pagarVarios(
      {
        cuentaId: this.cuentaDe(usuario),
        usuarioId: usuario.sub,
        canal: usuario.canal,
      },
      dto,
    );
  }

  @Get('simular')
  @ApiOperation({ summary: 'Calculo del pago mensual para un monto y plazo' })
  simular(
    @CurrentUser() usuario: JwtPayload,
    @Query('monto') monto: string,
    @Query('plazoMeses') plazoMeses: string,
  ) {
    const montoNumero = Number(monto);
    const plazoNumero = Number(plazoMeses);

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      throw new BadRequestException('El monto debe ser un numero mayor que cero');
    }

    if (!Number.isInteger(plazoNumero) || plazoNumero <= 0) {
      throw new BadRequestException('El plazo debe ser un numero entero de meses');
    }

    return this.loansService.simular(
      this.cuentaDe(usuario),
      montoNumero,
      plazoNumero,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle y progreso de un prestamo' })
  detalle(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.loansService.detalle(this.cuentaDe(usuario), id);
  }

  @Post(':id/pagos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pago de un prestamo' })
  pagar(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PagoPrestamoDto,
  ) {
    return this.loansService.pagar(
      {
        cuentaId: this.cuentaDe(usuario),
        usuarioId: usuario.sub,
        canal: usuario.canal,
      },
      id,
      dto,
    );
  }

  @Post('solicitar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Solicitud de prestamo. El backend valida el monto contra el limite calculado.',
  })
  solicitar(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: SolicitarPrestamoDto,
  ) {
    return this.loansService.solicitar(
      {
        cuentaId: this.cuentaDe(usuario),
        usuarioId: usuario.sub,
        canal: usuario.canal,
      },
      dto,
    );
  }
}
