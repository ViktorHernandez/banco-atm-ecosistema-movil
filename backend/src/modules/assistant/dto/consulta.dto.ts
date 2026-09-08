import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConsultaDto {
  @ApiProperty({ example: '¿Cuál es mi saldo?' })
  @IsString()
  @MinLength(1, { message: 'Escriba su consulta' })
  @MaxLength(400, { message: 'La consulta es demasiado larga' })
  mensaje: string;

  @ApiPropertyOptional({ example: 'es', enum: ['es', 'en'] })
  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'], { message: 'El idioma debe ser es o en' })
  idioma?: string;
}
