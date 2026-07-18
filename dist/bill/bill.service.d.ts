import { Repository } from 'typeorm';
import { BillLock } from '../entities/bill-lock.entity';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
export declare class BillService {
    private billLockRepository;
    private userRepository;
    private dailyLedgerRepository;
    private paymentsLedgerRepository;
    private milkmanCustomerRepository;
    constructor(billLockRepository: Repository<BillLock>, userRepository: Repository<User>, dailyLedgerRepository: Repository<DailyLedger>, paymentsLedgerRepository: Repository<PaymentsLedger>, milkmanCustomerRepository: Repository<MilkmanCustomer>);
    private getTargetMilkmanIds;
    lockDateRange(milkmanId: string, startDateStr: string, endDateStr: string, isLocked: boolean, userId?: string): Promise<BillLock | {
        success: boolean;
    }>;
    isDateLocked(milkmanId: string, targetDateStr: string, userId?: string): Promise<boolean>;
    getLocks(milkmanId: string, callerId?: string, callerRole?: string): Promise<{
        id: string;
        startDate: string;
        endDate: string;
        isLocked: boolean;
        userId: string | null | undefined;
        lockedAt: Date;
    }[]>;
    generateBillPdf(res: any, userId: string, milkmanId: string, dateRange: {
        startDate?: string;
        endDate?: string;
        month?: string;
    }, requestUserRole: string, targetRole?: string): Promise<void>;
    generateAllBillsPdf(res: any, milkmanId: string, dateRange: {
        startDate?: string;
        endDate?: string;
        month?: string;
    }, targetRole?: string): Promise<void>;
    drawSingleBillIntoDoc(doc: any, userId: string, milkmanId: string, dateRange: {
        startDate?: string;
        endDate?: string;
        month?: string;
    }, targetRole?: string, requestUserRole?: string): Promise<void>;
    getBillData(userId: string, milkmanId: string, dateRange: {
        startDate?: string;
        endDate?: string;
        month?: string;
    }, requestUserRole: string, targetRole?: string): Promise<{
        periodLabel: string;
        isLocked: boolean;
        user: {
            name: string;
            mobileNumber: string;
            address: string;
            role: import("../entities/user.entity").Role;
        };
        activeLayoutRole: string;
        ledgerEntries: DailyLedger[];
        paymentEntries: PaymentsLedger[];
    }>;
}
