import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildDatabaseConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CardsModule } from './modules/cards/cards.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServicesModule } from './modules/services/services.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { LoansModule } from './modules/loans/loans.module';
import { MailModule } from './modules/mail/mail.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PocketsModule } from './modules/pockets/pockets.module';
import { PushModule } from './modules/push/push.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'corto', ttl: 1000, limit: 60 },
      { name: 'medio', ttl: 60000, limit: 800 },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildDatabaseConfig,
    }),
    MailModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    AccountsModule,
    CardsModule,
    TransactionsModule,
    NotificationsModule,
    PushModule,
    PocketsModule,
    AuditModule,
    ServicesModule,
    LoansModule,
    AssistantModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AppService,
  ],
})
export class AppModule {}
