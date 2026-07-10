import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { PaymentMode } from '../../entities/payments-ledger.entity';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  date: string; // Format: YYYY-MM-DD

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount paid must be greater than 0' })
  amountPaid: number;

  @IsNotEmpty()
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsOptional()
  @IsString()
  targetRole?: string;
}
