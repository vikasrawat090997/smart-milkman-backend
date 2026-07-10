import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LedgerModule } from './ledger/ledger.module';
import { PaymentsModule } from './payments/payments.module';
import { BillModule } from './bill/bill.module';
import { ReportsModule } from './reports/reports.module';
import { User } from './entities/user.entity';
import { RatesHistory } from './entities/rates-history.entity';
import { DailyLedger } from './entities/daily-ledger.entity';
import { PaymentsLedger } from './entities/payments-ledger.entity';
import { BillLock } from './entities/bill-lock.entity';
import { PaymentEditHistory } from './entities/payment-edit-history.entity';
import { MilkmanCustomer } from './entities/milkman-customer.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      url: process.env.DATABASE_URL || 'mysql://root@localhost:3306/smart_dhudhiya',
      entities: [User, RatesHistory, DailyLedger, PaymentsLedger, BillLock, PaymentEditHistory, MilkmanCustomer],
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    LedgerModule,
    PaymentsModule,
    BillModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
