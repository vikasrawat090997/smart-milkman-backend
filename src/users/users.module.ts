import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RatesHistory, MilkmanCustomer])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
