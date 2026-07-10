import * as express from 'express';
import { BillService } from './bill.service';
export declare class BillController {
    private billService;
    constructor(billService: BillService);
    lockMonth(req: any, body: {
        monthYear: string;
        isLocked: boolean;
    }): Promise<import("../entities/bill-lock.entity").BillLock>;
    getLocks(req: any, queryMilkmanId?: string): Promise<import("../entities/bill-lock.entity").BillLock[]>;
    downloadBill(req: any, userId: string, res: express.Response, month: string, queryMilkmanId?: string, targetRole?: string): Promise<void>;
}
