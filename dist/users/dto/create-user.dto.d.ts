import { Role } from '../../entities/user.entity';
export declare class CreateUserDto {
    name: string;
    mobileNumber: string;
    passwordPin: string;
    role: Role;
    ratePerLiter?: number;
    sellRatePerLiter?: number;
    milkType?: string;
    address?: string;
    rates?: Array<{
        milkType: string;
        ratePerLiter: number;
        sellRatePerLiter?: number;
    }>;
}
