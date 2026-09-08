import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ example: 'Cliente de Prueba C' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombreCompleto?: string;

  @ApiPropertyOptional({ example: 'nuevo.correo@bancoatm.test' })
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

  @ApiPropertyOptional({ example: 'Cliente123!' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  @MaxLength(72)
  password?: string;
}
