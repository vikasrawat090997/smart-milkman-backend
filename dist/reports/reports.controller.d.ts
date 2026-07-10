import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    getBillSummary(req: any, userId: string, queryMilkmanId?: string): Promise<{
        user: {
            id: string;
            name: string;
            mobileNumber: string;
            role: import("../entities/user.entity").Role;
            address: string;
            createdAt: Date;
        };
        totalMilkValue: number;
        totalPayments: number;
        netBalance: number;
        walletStatus: "due" | "advance" | "settled";
        balanceDisplay: string;
        passbook: any[];
    }>;
    getDashboardSummary(req: any, date: string): Promise<{
        metrics: {
            totalProcurement: number;
            totalRevenue: number;
            estimatedProfit: number;
            activeFarmers: number;
            activeConsumers: number;
        };
        computedMetrics: {
            todayBuyingMorningVol: number;
            todayBuyingEveningVol: number;
            todayBuyingMorningCost: number;
            todayBuyingEveningCost: number;
            todaySellingMorningVol: number;
            todaySellingEveningVol: number;
            todaySellingMorningValue: number;
            todaySellingEveningValue: number;
            todayProfitMorning: number;
            todayProfitEvening: number;
            monthBuyingMorningVol: number;
            monthBuyingEveningVol: number;
            monthBuyingMorningCost: number;
            monthBuyingEveningCost: number;
            monthSellingMorningVol: number;
            monthSellingEveningVol: number;
            monthSellingMorningValue: number;
            monthSellingEveningValue: number;
            monthProfitMorning: number;
            monthProfitEvening: number;
            todayTransactions: {
                id: any;
                name: any;
                role: any;
                morningBuyQty: any;
                morningBuyRate: any;
                morningBuyAmt: any;
                morningSellQty: any;
                morningSellRate: any;
                morningSellAmt: any;
                eveningBuyQty: any;
                eveningBuyRate: any;
                eveningBuyAmt: any;
                eveningSellQty: any;
                eveningSellRate: any;
                eveningSellAmt: any;
                totalBuyAmt: any;
                totalSellAmt: any;
            }[];
        };
    }>;
    getMonthlyReport(req: any, month: string): Promise<{
        userId: string;
        name: string;
        mobileNumber: string;
        role: string;
        monthMilkQuantity: number;
        monthMilkValue: number;
        monthPayments: number;
        monthNet: number;
        totalMilkValue: number;
        totalPayments: number;
        cumulativeBalance: number;
    }[]>;
}
