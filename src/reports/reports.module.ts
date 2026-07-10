import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, DailyLedger, PaymentsLedger, MilkmanCustomer])],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
