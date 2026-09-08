import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable, interval, map, merge } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MarcarLeidasDto } from './dto/marcar-leidas.dto';
import { NotificationsService } from './notifications.service';
import { RealtimeService } from './realtime.service';

interface MensajeSse {
  data: string;
  type?: string;
  id?: string;
  retry?: number;
}

@ApiTags('Notificaciones')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private cuentaDe(usuario: JwtPayload): string {
    if (!usuario.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }
    return usuario.cuentaId;
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Notificaciones de la cuenta autenticada (RF-08 / HU-BE-07)',
  })
  listarPropias(
    @CurrentUser() usuario: JwtPayload,
    @Query('limite') limite?: string,
  ) {
    const take = Number(limite) > 0 ? Math.min(Number(limite), 100) : 50;
    return this.notificationsService.listarPorCuenta(
      this.cuentaDe(usuario),
      take,
    );
  }

  @Get('me/resumen')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Conteo de notificaciones sin leer' })
  resumen(@CurrentUser() usuario: JwtPayload) {
    return this.notificationsService.resumen(this.cuentaDe(usuario));
  }

  @Patch(':id/leida')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Marca una notificacion como leida' })
  marcarLeida(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.marcarLeida(this.cuentaDe(usuario), id);
  }

  @Post('me/leidas')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Marca como leidas varias notificaciones' })
  marcarVariasLeidas(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: MarcarLeidasDto,
  ) {
    return this.notificationsService.marcarVariasLeidas(
      this.cuentaDe(usuario),
      dto.identificadores,
    );
  }

  @Sse('stream')
  @ApiOperation({
    summary:
      'Canal de eventos en tiempo real. EventSource no admite cabeceras, por eso el token viaja como parametro.',
  })
  stream(@Query('token') token?: string): Observable<MensajeSse> {
    if (!token) {
      throw new UnauthorizedException('Token de acceso no proporcionado');
    }

    let carga: JwtPayload;
    try {
      carga = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de acceso invalido o vencido');
    }

    if (!carga.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }

    const eventos = this.realtimeService.suscribir(carga.cuentaId).pipe(
      map((evento) => ({
        type: evento.tipo,
        data: JSON.stringify(evento.datos),
        retry: 5000,
      })),
    );

    const latido = interval(25000).pipe(
      map(() => ({
        type: 'latido',
        data: JSON.stringify({ momento: new Date().toISOString() }),
        retry: 5000,
      })),
    );

    return merge(eventos, latido);
  }
}
