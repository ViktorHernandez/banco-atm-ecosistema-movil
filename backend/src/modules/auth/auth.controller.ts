import {
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
import { AuthService } from './auth.service';
import { LoginAtmDto } from './dto/login-atm.dto';
import { LoginDto } from './dto/login.dto';
import { ReenviarCodigoDto } from './dto/reenviar-codigo.dto';
import { RegistroDto } from './dto/registro.dto';
import { VerificarCorreoDto } from './dto/verificar-correo.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordResetService } from './password-reset.service';
import {
  RestablecerPasswordDto,
  SolicitarRecuperacionDto,
} from './dto/recuperar.dto';

@ApiTags('Autenticacion')
@Controller('auth')
export class AuthController {
  constructor(
private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('atm/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticacion por tarjeta y PIN desde el ATM (RF-09 / HU-ATM-01)',
  })
  loginAtm(@Body() dto: LoginAtmDto) {
    return this.authService.loginAtm(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Autenticacion por credenciales para app movil, portal y administracion (RF-01 / RF-15 / HU-BE-01)',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Alta de usuario desde el portal publico. Queda pendiente de verificar el correo (RF-01).',
  })
  registrar(@Body() dto: RegistroDto) {
    return this.authService.registrar(dto);
  }

  @Post('verificar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificacion del correo con el codigo enviado al registrarse',
  })
  verificar(@Body() dto: VerificarCorreoDto) {
    return this.authService.verificarCorreo(dto);
  }

  @Post('reenviar-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenvio del codigo de verificacion' })
  reenviarCodigo(@Body() dto: ReenviarCodigoDto) {
    return this.authService.reenviarCodigo(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil de la sesion actual (RNF-03)' })
  perfil(@CurrentUser() usuario: JwtPayload) {
    return this.authService.perfil(usuario);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cierre de sesion auditado (RF-19)' })
  logout(@CurrentUser() usuario: JwtPayload) {
    return this.authService.logout(usuario);
  }

  @Post('recuperar/solicitar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Solicita un codigo temporal para restablecer la contrasena. No revela si el correo existe.',
  })
  solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    return this.passwordResetService.solicitar(dto.correo, dto.idioma);
  }

  @Post('recuperar/restablecer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Establece una contrasena nueva con el codigo temporal recibido',
  })
  restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.passwordResetService.restablecer(
      dto.correo,
      dto.codigo,
      dto.password,
    );
  }
}
