import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ConfirmarTotpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El codigo debe tener 6 digitos' })
  codigo: string;
}

export class DesactivarTotpDto {
  @ApiProperty({ example: 'Cliente123!' })
  @IsString()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  password: string;
}
