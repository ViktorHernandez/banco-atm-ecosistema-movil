import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ActualizarApartadoDto,
  CrearApartadoDto,
  MovimientoApartadoDto,
} from './dto/apartado.dto';
import { ContextoApartado, PocketsService } from './pockets.service';

@ApiTags('Apartados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pockets')
export class PocketsController {
  constructor(private readonly pocketsService: PocketsService) {}

  private contexto(usuario: JwtPayload): ContextoApartado {
    if (!usuario.cuentaId) {
      throw new BadRequestException('La sesion no tiene una cuenta asociada');
    }
    return {
      cuentaId: usuario.cuentaId,
      usuarioId: usuario.sub,
      canal: usuario.canal,
    };
  }

  @Get('me')
  @ApiOperation({
    summary:
      'Apartados de la cuenta autenticada con el saldo disponible y el total guardado',
  })
  listar(@CurrentUser() usuario: JwtPayload) {
    return this.pocketsService.listar(this.contexto(usuario).cuentaId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un apartado nuevo para la cuenta' })
  crear(@CurrentUser() usuario: JwtPayload, @Body() dto: CrearApartadoDto) {
    return this.pocketsService.crear(this.contexto(usuario), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un apartado propio' })
  detalle(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.pocketsService.detalle(this.contexto(usuario).cuentaId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza el nombre, la meta o el icono' })
  actualizar(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarApartadoDto,
  ) {
    return this.pocketsService.actualizar(this.contexto(usuario), id, dto);
  }

  @Post(':id/apartar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Traspasa dinero del saldo disponible hacia el apartado',
  })
  apartar(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MovimientoApartadoDto,
  ) {
    return this.pocketsService.apartar(this.contexto(usuario), id, dto);
  }

  @Post(':id/devolver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Devuelve dinero del apartado al saldo disponible de la cuenta',
  })
  devolver(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MovimientoApartadoDto,
  ) {
    return this.pocketsService.devolver(this.contexto(usuario), id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cierra el apartado y devuelve el dinero guardado al saldo',
  })
  eliminar(
    @CurrentUser() usuario: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.pocketsService.eliminar(this.contexto(usuario), id);
  }
}
