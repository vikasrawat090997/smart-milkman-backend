import { RatesHistory } from './rates-history.entity';
import { DailyLedger } from './daily-ledger.entity';
import { PaymentsLedger } from './payments-ledger.entity';
export declare enum Role {
    MILKMAN = "milkman",
    FARMER = "farmer",
    CONSUMER = "consumer",
    BOTH = "both"
}
export declare class User {
    id: string;
    name: string;
    mobileNumber: string;
    passwordPin: string;
    role: Role;
    isActive: boolean;
    address: string;
    milkTypes: string;
    parentMilkmanId: string;
    createdAt: Date;
    ratesHistory: RatesHistory[];
    dailyLedger: DailyLedger[];
    payments: PaymentsLedger[];
    recordedPayments: PaymentsLedger[];
}
