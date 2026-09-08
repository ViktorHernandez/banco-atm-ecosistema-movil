import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class VerificarCorreoDto {
  @ApiProperty({ example: 'mariana.robles@ejemplo.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  correo: string;

  @ApiProperty({ example: '482915' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}
