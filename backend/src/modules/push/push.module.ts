import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { DispositivoPush } from './entities/dispositivo-push.entity';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([DispositivoPush, Cuenta])],
  controllers: [PushController],
  providers: [PushService],
  exports: [TypeOrmModule, PushService],
})
export class PushModule {}
