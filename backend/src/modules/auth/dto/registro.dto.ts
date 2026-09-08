import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @ApiProperty({ example: 'Mariana Robles Cadena' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(150)
  nombreCompleto: string;

  @ApiProperty({ example: 'mariana.robles@ejemplo.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  correo: string;

  @ApiProperty({ example: '5629727628' })
  @IsString()
  @Matches(/^[\d\s()+-]{10,20}$/, {
    message: 'El teléfono debe tener entre 10 y 20 dígitos',
  })
  telefono: string;

  @ApiProperty({ example: 'Cliente123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password: string;
}
