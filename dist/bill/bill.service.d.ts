import { Repository } from 'typeorm';
import { BillLock } from '../entities/bill-lock.entity';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
export declare class BillService {
    private billLockRepository;
    private userRepository;
    private dailyLedgerRepository;
    private paymentsLedgerRepository;
    constructor(billLockRepository: Repository<BillLock>, userRepository: Repository<User>, dailyLedgerRepository: Repository<DailyLedger>, paymentsLedgerRepository: Repository<PaymentsLedger>);
    lockMonth(milkmanId: string, monthYear: string, isLocked: boolean): Promise<BillLock>;
    getLockStatus(milkmanId: string, monthYear: string): Promise<boolean>;
    getLocks(milkmanId: string): Promise<BillLock[]>;
    generateBillPdf(res: any, userId: string, milkmanId: string, month: string, requestUserRole: string, targetRole?: string): Promise<void>;
}
