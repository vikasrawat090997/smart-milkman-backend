import * as express from 'express';
import { BillService } from './bill.service';
import { Role } from '../entities/user.entity';
export declare class BillController {
    private billService;
    constructor(billService: BillService);
    lockDateRange(req: any, body: {
        startDate: string;
        endDate: string;
        isLocked: boolean;
        userId?: string;
    }): Promise<import("../entities/bill-lock.entity").BillLock | {
        success: boolean;
    }>;
    getLocks(req: any, queryMilkmanId?: string): Promise<{
        id: string;
        startDate: string;
        endDate: string;
        isLocked: boolean;
        userId: string | null | undefined;
        lockedAt: Date;
    }[]>;
    downloadAllBills(req: any, res: express.Response, month?: string, startDate?: string, endDate?: string, targetRole?: string): Promise<void>;
    downloadBill(req: any, userId: string, res: express.Response, month?: string, startDate?: string, endDate?: string, queryMilkmanId?: string, targetRole?: string): Promise<void>;
    getBillData(req: any, userId: string, month?: string, startDate?: string, endDate?: string, queryMilkmanId?: string, targetRole?: string): Promise<{
        periodLabel: string;
        isLocked: boolean;
        user: {
            name: string;
            mobileNumber: string;
            address: string;
            role: Role;
        };
        activeLayoutRole: string;
        ledgerEntries: import("../entities/daily-ledger.entity").DailyLedger[];
        paymentEntries: import("../entities/payments-ledger.entity").PaymentsLedger[];
    }>;
}
