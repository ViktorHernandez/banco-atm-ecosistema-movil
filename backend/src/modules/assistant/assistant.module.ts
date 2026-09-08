import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CardsModule } from '../cards/cards.module';
import { LoansModule } from '../loans/loans.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [AccountsModule, CardsModule, LoansModule, NotificationsModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
