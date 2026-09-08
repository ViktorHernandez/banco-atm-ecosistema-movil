import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty({ example: 'Cliente123!' })
  @IsString()
  passwordActual: string;

  @ApiProperty({ example: 'NuevaClave456!' })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(72)
  passwordNueva: string;

  @ApiProperty({
    example: 'NuevaClave456!',
    description:
      'Repeticion de la nueva contraseña. Se compara en el backend, no solo en el formulario.',
  })
  @IsString()
  passwordConfirmacion: string;
}
