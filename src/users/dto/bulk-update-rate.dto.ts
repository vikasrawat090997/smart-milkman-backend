import { IsNotEmpty, IsEnum, IsNumber, IsString } from 'class-validator';
import { Role } from '../../entities/user.entity';

export class BulkUpdateRateDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @IsNotEmpty()
  @IsNumber()
  ratePerLiter: number;

  @IsNotEmpty()
  @IsString()
  startDate: string; // Format: YYYY-MM-DD
}
