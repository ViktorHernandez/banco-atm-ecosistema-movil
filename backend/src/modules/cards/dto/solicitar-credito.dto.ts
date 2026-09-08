import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { NivelTarjeta } from '../enums/nivel-tarjeta.enum';

export class SolicitarCreditoDto {
  @ApiPropertyOptional({
    enum: NivelTarjeta,
    description:
      'Nivel solicitado. Si se omite, el banco asigna el mejor nivel que alcance el saldo de la cuenta.',
  })
  @IsOptional()
  @IsEnum(NivelTarjeta, { message: 'El nivel de tarjeta no es valido' })
  nivel?: NivelTarjeta;
}
