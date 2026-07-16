export declare class UpdateUserDto {
    name?: string;
    mobileNumber?: string;
    passwordPin?: string;
    isActive?: boolean;
    address?: string;
    role?: string;
    milkType?: string;
    rates?: Array<{
        milkType: string;
        ratePerLiter: number;
        sellRatePerLiter?: number;
    }>;
}
