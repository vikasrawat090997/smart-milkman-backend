import { Role } from '../../entities/user.entity';
export declare class CreateUserDto {
    name: string;
    mobileNumber: string;
    passwordPin: string;
    role: Role;
    ratePerLiter: number;
    address?: string;
}
