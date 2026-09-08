import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Apartado } from './entities/apartado.entity';
import { PocketsController } from './pockets.controller';
import { PocketsService } from './pockets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Apartado]),
    AccountsModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [PocketsController],
  providers: [PocketsService],
  exports: [TypeOrmModule, PocketsService],
})
export class PocketsModule {}
