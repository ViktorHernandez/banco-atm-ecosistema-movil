import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AssistantService } from './assistant.service';
import { ConsultaDto } from './dto/consulta.dto';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

@ApiTags('Asistente')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('publico/bienvenida')
  @ApiOperation({
    summary:
      'Mensaje inicial del asistente publico. No requiere sesion y solo resuelve intenciones de alcance PUBLICO.',
  })
  bienvenidaPublica(@Query('idioma') idioma?: string) {
    return this.assistantService.responder(
      { publico: true, idioma },
      'hola',
    );
  }

  @Post('publico/consultar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Consulta al asistente publico. Nunca accede a datos de cuenta: las intenciones privadas responden pidiendo iniciar sesion.',
  })
  consultarPublico(@Body() dto: ConsultaDto) {
    return this.assistantService.responder(
      { publico: true, idioma: dto.idioma },
      dto.mensaje,
    );
  }

  @Get('bienvenida')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mensaje inicial y sugerencias del asistente' })
  bienvenida(
    @CurrentUser() usuario: JwtPayload,
    @Query('idioma') idioma?: string,
  ) {
    return this.assistantService.responder(
      {
        usuarioId: usuario.sub,
        cuentaId: usuario.cuentaId,
        rol: usuario.rol,
        idioma,
      },
      'hola',
    );
  }

  @Post('consultar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Consulta al asistente. La cuenta se toma del token, nunca del cuerpo de la peticion.',
  })
  consultar(@CurrentUser() usuario: JwtPayload, @Body() dto: ConsultaDto) {
    return this.assistantService.responder(
      {
        usuarioId: usuario.sub,
        cuentaId: usuario.cuentaId,
        rol: usuario.rol ?? RolUsuario.CLIENTE,
        idioma: dto.idioma,
      },
      dto.mensaje,
    );
  }
}
