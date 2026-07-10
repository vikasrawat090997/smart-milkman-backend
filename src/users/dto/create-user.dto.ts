import { IsNotEmpty, IsString, IsEnum, IsOptional, Length, IsNumber } from 'class-validator';
import { Role } from '../../entities/user.entity';

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

  @IsNotEmpty()
  @IsNumber()
  ratePerLiter: number;

  @IsOptional()
  @IsString()
  address?: string;
}
