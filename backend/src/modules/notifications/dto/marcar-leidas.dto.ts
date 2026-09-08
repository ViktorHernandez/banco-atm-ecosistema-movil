import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class MarcarLeidasDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Identificadores a marcar. Si se omite, se marcan todas las pendientes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true, message: 'Identificador de notificacion invalido' })
  identificadores?: string[];
}
