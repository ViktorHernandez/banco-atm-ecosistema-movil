import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: 'Mariana Robles Cadena' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(150)
  nombreCompleto?: string;

  @ApiPropertyOptional({ example: 'mariana.robles@ejemplo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  correo?: string;

  @ApiPropertyOptional({ example: '5629727628' })
  @IsOptional()
  @IsString()
  @Matches(/^[\d\s()+-]{10,20}$/, {
    message: 'El teléfono debe tener entre 10 y 20 dígitos',
  })
  telefono?: string;
}
