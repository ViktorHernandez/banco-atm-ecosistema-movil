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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CardsService } from './cards.service';
import { CambiarPinDto } from './dto/cambiar-pin.dto';
import { SolicitarCreditoDto } from './dto/solicitar-credito.dto';

@ApiTags('Tarjetas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  private cuentaDe(usuario: JwtPayload): string {
    if (!usuario.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }
    return usuario.cuentaId;
  }

  @Get('me')
  @ApiOperation({
    summary: 'Tarjeta de debito del cliente (HU-BE-06). Lo usa el ATM.',
  })
  consultar(@CurrentUser() usuario: JwtPayload) {
    return this.cardsService.consultarPropia(this.cuentaDe(usuario));
  }

  @Get('me/todas')
  @ApiOperation({
    summary: 'Todas las tarjetas del cliente, de debito y de credito (RF-06)',
  })
  listar(@CurrentUser() usuario: JwtPayload) {
    return this.cardsService.listarPropias(this.cuentaDe(usuario));
  }

  @Get(':id/detalle')
  @ApiOperation({
    summary:
      'Datos completos de una tarjeta propia. Solo el titular autenticado puede consultarla.',
  })
  detalle(@CurrentUser() usuario: JwtPayload, @Param('id') id: string) {
    return this.cardsService.detallePropia(this.cuentaDe(usuario), id);
  }

  @Get('credito/catalogo')
  @ApiOperation({
    summary:
      'Catalogo de tarjetas de credito evaluado contra el saldo real de la cuenta',
  })
  catalogoCredito(@CurrentUser() usuario: JwtPayload) {
    return this.cardsService.catalogoCredito(this.cuentaDe(usuario));
  }

  @Post('credito/solicitar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Solicitud de tarjeta de credito. Se aprueba o rechaza segun la liquidez de la cuenta.',
  })
  solicitarCredito(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: SolicitarCreditoDto,
  ) {
    return this.cardsService.solicitarCredito(
      this.cuentaDe(usuario),
      usuario.sub,
      usuario.canal,
      dto,
    );
  }

  @Post('me/bloquear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloqueo de la tarjeta de debito (RF-06)' })
  bloquear(@CurrentUser() usuario: JwtPayload) {
    return this.cardsService.bloquearPropia(
      this.cuentaDe(usuario),
      usuario.sub,
      usuario.canal,
    );
  }

  @Post('me/desbloquear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desbloqueo de la tarjeta de debito (RF-07)' })
  desbloquear(@CurrentUser() usuario: JwtPayload) {
    return this.cardsService.desbloquearPropia(
      this.cuentaDe(usuario),
      usuario.sub,
      usuario.canal,
    );
  }

  @Post(':id/bloquear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloqueo de una tarjeta concreta del cliente (RF-06)' })
  bloquearPorId(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.cardsService.bloquearPropia(
      this.cuentaDe(usuario),
      usuario.sub,
      usuario.canal,
      id,
    );
  }

  @Post(':id/desbloquear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desbloqueo de una tarjeta concreta del cliente (RF-07)',
  })
  desbloquearPorId(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.cardsService.desbloquearPropia(
      this.cuentaDe(usuario),
      usuario.sub,
      usuario.canal,
      id,
    );
  }

  @Post('me/cambiar-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambio de PIN desde el ATM (HU-ATM-10)' })
  cambiarPin(@CurrentUser() usuario: JwtPayload, @Body() dto: CambiarPinDto) {
    return this.cardsService.cambiarPin(
      this.cuentaDe(usuario),
      usuario.sub,
      usuario.canal,
      dto,
    );
  }
}
