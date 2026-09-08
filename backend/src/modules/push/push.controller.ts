import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  BajaDispositivoDto,
  RegistrarDispositivoDto,
} from './dto/dispositivo.dto';
import { PushService } from './push.service';

@ApiTags('Notificaciones push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  private cuentaDe(usuario: JwtPayload): string {
    if (!usuario.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }
    return usuario.cuentaId;
  }

  @Get('estado')
  @ApiOperation({
    summary:
      'Indica si el servidor tiene configurado el envio push y lista los dispositivos de la cuenta',
  })
  async estado(@CurrentUser() usuario: JwtPayload) {
    return {
      disponible: this.pushService.habilitado,
      configuracion: this.pushService.diagnostico(),
      dispositivos: await this.pushService.listarDeCuenta(
        this.cuentaDe(usuario),
      ),
    };
  }

  @Post('dispositivos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Asocia el token del dispositivo movil con el usuario y la cuenta autenticados',
  })
  registrar(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: RegistrarDispositivoDto,
  ) {
    return this.pushService.registrarDispositivo(
      usuario.sub,
      usuario.cuentaId,
      dto,
    );
  }

  @Post('dispositivos/baja')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Da de baja el token del dispositivo al cerrar sesion',
  })
  baja(@CurrentUser() usuario: JwtPayload, @Body() dto: BajaDispositivoDto) {
    return this.pushService.darDeBaja(usuario.sub, dto);
  }

  @Post('prueba')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Envia una notificacion de prueba a los dispositivos de la cuenta autenticada',
  })
  async prueba(@CurrentUser() usuario: JwtPayload) {
    const entregadas = await this.pushService.enviarPrueba(
      this.cuentaDe(usuario),
    );

    return {
      disponible: this.pushService.habilitado,
      entregadas,
    };
  }
}
