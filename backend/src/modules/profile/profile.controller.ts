import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { ProfileService } from './profile.service';
import { TotpService } from '../auth/totp.service';
import { ConfirmarTotpDto, DesactivarTotpDto } from './dto/totp.dto';

@ApiTags('Perfil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly totpService: TotpService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Datos del perfil propio, incluido el telefono' })
  consultar(@CurrentUser() usuario: JwtPayload) {
    return this.profileService.consultar(usuario.sub, usuario.canal);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Actualizacion de nombre, correo y telefono por el propio cliente',
  })
  actualizar(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.profileService.actualizar(usuario.sub, usuario.canal, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cambio de contrasena con confirmacion. Requiere la contrasena actual.',
  })
  cambiarPassword(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.profileService.cambiarPassword(usuario.sub, usuario.canal, dto);
  }

  @Get('me/totp')
  @ApiOperation({ summary: 'Estado del segundo factor del usuario' })
  estadoTotp(@CurrentUser() usuario: JwtPayload) {
    return this.totpService.estado(usuario.sub);
  }

  @Post('me/totp/iniciar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Genera el secreto y el codigo QR para vincular una aplicacion autenticadora',
  })
  iniciarTotp(@CurrentUser() usuario: JwtPayload) {
    return this.totpService.iniciar(usuario.sub);
  }

  @Post('me/totp/confirmar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirma el primer codigo y activa el segundo factor. Devuelve los codigos de recuperacion una sola vez.',
  })
  confirmarTotp(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: ConfirmarTotpDto,
  ) {
    return this.totpService.confirmar(usuario.sub, dto.codigo);
  }

  @Post('me/totp/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactiva el segundo factor comprobando la contrasena' })
  desactivarTotp(
    @CurrentUser() usuario: JwtPayload,
    @Body() dto: DesactivarTotpDto,
  ) {
    return this.totpService.desactivar(usuario.sub, dto.password);
  }
}
