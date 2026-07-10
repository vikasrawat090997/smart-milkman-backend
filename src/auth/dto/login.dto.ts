import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  passwordPin: string;
}
