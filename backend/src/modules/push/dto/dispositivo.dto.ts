import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarDispositivoDto {
  @ApiProperty({ example: 'fMEP0...token-de-firebase' })
  @IsString()
  @MinLength(20, { message: 'El token del dispositivo no es válido' })
  @MaxLength(255, { message: 'El token del dispositivo es demasiado largo' })
  token: string;

  @ApiPropertyOptional({ example: 'android', enum: ['android', 'ios'] })
  @IsOptional()
  @IsString()
  @IsIn(['android', 'ios'], { message: 'La plataforma no es válida' })
  plataforma?: string;

  @ApiPropertyOptional({ example: 'es', enum: ['es', 'en'] })
  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'], { message: 'El idioma no es válido' })
  idioma?: string;

  @ApiPropertyOptional({ example: 'Pixel 7' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelo?: string;
}

export class BajaDispositivoDto {
  @ApiProperty({ example: 'fMEP0...token-de-firebase' })
  @IsString()
  @MinLength(20, { message: 'El token del dispositivo no es válido' })
  @MaxLength(255, { message: 'El token del dispositivo es demasiado largo' })
  token: string;
}
