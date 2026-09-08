import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { Tarjeta } from '../cards/entities/tarjeta.entity';
import { Usuario } from '../users/entities/usuario.entity';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cuenta, Tarjeta, Usuario])],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
