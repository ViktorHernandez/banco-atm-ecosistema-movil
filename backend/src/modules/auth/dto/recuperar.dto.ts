import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class SolicitarRecuperacionDto {
  @ApiProperty({ example: 'cliente@bancoatm.test' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  correo: string;

  @ApiPropertyOptional({ example: 'es', enum: ['es', 'en'] })
  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'])
  idioma?: string;
}

export class RestablecerPasswordDto {
  @ApiProperty({ example: 'cliente@bancoatm.test' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  correo: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El codigo debe tener 6 digitos' })
  codigo: string;

  @ApiProperty({ example: 'NuevaClave123!' })
  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  password: string;
}
