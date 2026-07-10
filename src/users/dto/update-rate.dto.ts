import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UpdateRateDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  ratePerLiter: number;

  @IsNotEmpty()
  @IsString()
  startDate: string; // Format: YYYY-MM-DD
}
