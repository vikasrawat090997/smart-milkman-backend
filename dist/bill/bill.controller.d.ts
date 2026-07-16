import * as express from 'express';
import { BillService } from './bill.service';
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
}
