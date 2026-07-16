import { IsNotEmpty, IsString, IsEnum, IsOptional, Length, IsNumber, IsArray } from 'class-validator';
import { Role } from '../../entities/user.entity';
import { LedgerType } from '../../entities/daily-ledger.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  mobileNumber: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  passwordPin: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsNumber()
  ratePerLiter?: number;

  @IsOptional()
  @IsNumber()
  sellRatePerLiter?: number;

  @IsOptional()
  @IsString()
  milkType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsArray()
  rates?: Array<{
    milkType: string;
    ratePerLiter: number;
    sellRatePerLiter?: number;
  }>;
}
