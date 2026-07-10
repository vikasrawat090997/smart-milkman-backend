import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { LedgerType } from '../../entities/daily-ledger.entity';

export class UpdateRateDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  ratePerLiter: number;

  @IsNotEmpty()
  @IsString()
  startDate: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsEnum(LedgerType)
  rateType?: LedgerType;
}
