import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { AuditModule } from '../audit/audit.module';
import { Tarjeta } from '../cards/entities/tarjeta.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Transaccion } from '../transactions/entities/transaccion.entity';
import { Prestamo } from './entities/prestamo.entity';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prestamo, Cuenta, Tarjeta, Transaccion]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
