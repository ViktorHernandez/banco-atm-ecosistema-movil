import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class SolicitarPrestamoDto {
  @ApiProperty({ example: 10000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico' })
  @IsPositive({ message: 'El monto debe ser mayor que cero' })
  @Max(1000000, { message: 'El monto solicitado excede el máximo del banco' })
  monto: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt({ message: 'El plazo debe ser un número entero de meses' })
  @Min(1, { message: 'El plazo debe ser de al menos un mes' })
  @Max(120, { message: 'El plazo no puede superar los 120 meses' })
  plazoMeses?: number;
}
