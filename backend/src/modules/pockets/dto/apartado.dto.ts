import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const ICONOS_APARTADO = [
  'ahorro',
  'viaje',
  'hogar',
  'salud',
  'educacion',
  'emergencia',
  'auto',
  'regalo',
];

export class CrearApartadoDto {
  @ApiProperty({ example: 'Fondo de emergencia' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  @Matches(/^[\p{L}\p{N} .,'#&/-]+$/u, {
    message: 'El nombre contiene caracteres no permitidos',
  })
  nombre: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La meta debe ser numérica' })
  @IsPositive({ message: 'La meta debe ser mayor a cero' })
  metaMonto?: number;

  @ApiPropertyOptional({ example: 'emergencia', enum: ICONOS_APARTADO })
  @IsOptional()
  @IsString()
  @IsIn(ICONOS_APARTADO, { message: 'El icono seleccionado no es válido' })
  icono?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico' })
  @IsPositive({ message: 'El monto inicial debe ser mayor a cero' })
  montoInicial?: number;
}

export class ActualizarApartadoDto {
  @ApiPropertyOptional({ example: 'Vacaciones' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  @Matches(/^[\p{L}\p{N} .,'#&/-]+$/u, {
    message: 'El nombre contiene caracteres no permitidos',
  })
  nombre?: string;

  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La meta debe ser numérica' })
  @IsPositive({ message: 'La meta debe ser mayor a cero' })
  metaMonto?: number;

  @ApiPropertyOptional({ example: 'viaje', enum: ICONOS_APARTADO })
  @IsOptional()
  @IsString()
  @IsIn(ICONOS_APARTADO, { message: 'El icono seleccionado no es válido' })
  icono?: string;
}

export class MovimientoApartadoDto {
  @ApiProperty({ example: 250 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico' })
  @IsPositive({ message: 'El monto debe ser mayor a cero' })
  monto: number;
}
