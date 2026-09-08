import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ReenviarCodigoDto {
  @ApiProperty({ example: 'mariana.robles@ejemplo.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  correo: string;
}
