import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RolUsuario } from '../../users/enums/rol-usuario.enum';

export class CambiarRolDto {
  @ApiProperty({ enum: RolUsuario, example: RolUsuario.ADMINISTRADOR })
  @IsEnum(RolUsuario, { message: 'El rol indicado no es valido' })
  rol: RolUsuario;
}
