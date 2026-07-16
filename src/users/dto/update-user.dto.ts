import { IsOptional, IsString, IsBoolean, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  passwordPin?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  milkType?: string;

  @IsOptional()
  rates?: Array<{
    milkType: string;
    ratePerLiter: number;
    sellRatePerLiter?: number;
  }>;
}
