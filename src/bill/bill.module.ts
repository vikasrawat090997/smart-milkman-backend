import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillService } from './bill.service';
import { BillController } from './bill.controller';
import { BillLock } from '../entities/bill-lock.entity';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BillLock, User, DailyLedger, PaymentsLedger])],
  providers: [BillService],
  controllers: [BillController],
  exports: [BillService],
})
export class BillModule {}
