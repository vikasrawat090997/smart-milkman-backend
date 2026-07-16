import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private userRepository;
    constructor(userRepository: Repository<User>);
    validate(payload: {
        sub: string;
        mobileNumber: string;
    }): Promise<{
        id: string;
        name: string;
        mobileNumber: string;
        role: import("../entities/user.entity").Role;
        isActive: boolean;
        deactivatedAt?: Date | null;
        address: string;
        milkTypes: string;
        parentMilkmanId: string;
        createdAt: Date;
        ratesHistory: import("../entities/rates-history.entity").RatesHistory[];
        dailyLedger: import("../entities/daily-ledger.entity").DailyLedger[];
        payments: import("../entities/payments-ledger.entity").PaymentsLedger[];
        recordedPayments: import("../entities/payments-ledger.entity").PaymentsLedger[];
    }>;
}
export {};
