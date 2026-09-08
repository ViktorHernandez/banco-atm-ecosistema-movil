import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { Tarjeta } from './entities/tarjeta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tarjeta, Cuenta]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [TypeOrmModule, CardsService],
})
export class CardsModule {}
