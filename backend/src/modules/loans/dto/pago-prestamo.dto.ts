import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PagoPrestamoDto {
  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico' })
  @IsPositive({ message: 'El monto debe ser mayor que cero' })
  @Max(1000000, { message: 'El monto excede el máximo permitido' })
  monto: number;
}

export class PagoMultipleItemDto {
  @ApiProperty()
  @IsUUID('4', { message: 'El identificador del préstamo no es válido' })
  prestamoId: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico' })
  @IsPositive({ message: 'El monto debe ser mayor que cero' })
  @Max(1000000, { message: 'El monto excede el máximo permitido' })
  monto?: number;
}

export class PagoMultipleDto {
  @ApiProperty({ type: [PagoMultipleItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Seleccione al menos un préstamo' })
  @ArrayMaxSize(10, { message: 'No puede pagar más de 10 préstamos a la vez' })
  @ValidateNested({ each: true })
  @Type(() => PagoMultipleItemDto)
  pagos: PagoMultipleItemDto[];
}
