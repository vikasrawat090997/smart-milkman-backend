import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
export declare class ReportsService {
    private userRepository;
    private dailyLedgerRepository;
    private paymentsLedgerRepository;
    private milkmanCustomerRepository;
    constructor(userRepository: Repository<User>, dailyLedgerRepository: Repository<DailyLedger>, paymentsLedgerRepository: Repository<PaymentsLedger>, milkmanCustomerRepository: Repository<MilkmanCustomer>);
    getMonthlyReport(milkmanId: string, monthStr: string): Promise<{
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
    getBillSummary(userId: string, milkmanId: string): Promise<{
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
    getDashboardSummary(milkmanId: string, dateStr: string): Promise<{
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
}
