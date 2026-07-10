"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const daily_ledger_entity_1 = require("../entities/daily-ledger.entity");
const payments_ledger_entity_1 = require("../entities/payments-ledger.entity");
const milkman_customer_entity_1 = require("../entities/milkman-customer.entity");
let ReportsService = class ReportsService {
    userRepository;
    dailyLedgerRepository;
    paymentsLedgerRepository;
    milkmanCustomerRepository;
    constructor(userRepository, dailyLedgerRepository, paymentsLedgerRepository, milkmanCustomerRepository) {
        this.userRepository = userRepository;
        this.dailyLedgerRepository = dailyLedgerRepository;
        this.paymentsLedgerRepository = paymentsLedgerRepository;
        this.milkmanCustomerRepository = milkmanCustomerRepository;
    }
    async getMonthlyReport(milkmanId, monthStr) {
        const [yearStr, monthStr_] = monthStr.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr_, 10) - 1;
        const startDate = new Date(Date.UTC(y, m, 1));
        const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId },
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0)
            return [];
        const allUsers = await this.userRepository.find({
            where: { id: (0, typeorm_2.In)(customerIds) },
            order: { name: 'ASC' },
        });
        const mappingMap = new Map();
        const roleMap = new Map();
        mappings.forEach((m) => {
            if (m.customName) {
                mappingMap.set(m.customerId, m.customName);
            }
            roleMap.set(m.customerId, m.relationshipRole);
        });
        const users = allUsers.filter((user) => {
            if (user.role !== 'farmer' && user.role !== 'consumer' && user.role !== 'both') {
                return false;
            }
            if (user.createdAt) {
                const creationDate = new Date(user.createdAt);
                return creationDate.getTime() <= endDate.getTime();
            }
            return true;
        });
        const allLedger = await this.dailyLedgerRepository.find({
            where: { milkmanId },
        });
        const allPayments = await this.paymentsLedgerRepository.find({
            where: { recordedBy: milkmanId },
        });
        return users.map((user) => {
            const monthLedgers = allLedger.filter((item) => {
                const itemDateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split('T')[0];
                return item.userId === user.id && itemDateStr.startsWith(monthStr);
            });
            const monthPaymentsList = allPayments.filter((item) => {
                const itemDateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split('T')[0];
                return item.userId === user.id && itemDateStr.startsWith(monthStr);
            });
            const monthMilkQuantity = monthLedgers.reduce((sum, item) => sum + Number(item.quantityLiters || 0), 0);
            const monthMilkValue = monthLedgers.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
            const monthPayments = monthPaymentsList.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
            const monthNet = monthPayments - monthMilkValue;
            const userAllLedgers = allLedger.filter((item) => item.userId === user.id);
            const userAllPayments = allPayments.filter((item) => item.userId === user.id);
            const totalMilkValue = userAllLedgers.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
            const totalPayments = userAllPayments.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
            const cumulativeBalance = totalPayments - totalMilkValue;
            return {
                userId: user.id,
                name: mappingMap.get(user.id) || user.name,
                mobileNumber: user.mobileNumber,
                role: roleMap.get(user.id) || user.role,
                monthMilkQuantity,
                monthMilkValue,
                monthPayments,
                monthNet,
                totalMilkValue,
                totalPayments,
                cumulativeBalance,
            };
        });
    }
    async getBillSummary(userId, milkmanId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const mapping = await this.milkmanCustomerRepository.findOne({
            where: { milkmanId, customerId: userId },
        });
        if (mapping) {
            if (mapping.customName) {
                user.name = mapping.customName;
            }
            user.role = mapping.relationshipRole;
        }
        const ledgerEntries = await this.dailyLedgerRepository.find({
            where: { userId, milkmanId },
            order: { date: 'DESC', slot: 'DESC' },
        });
        const paymentEntries = await this.paymentsLedgerRepository.find({
            where: { userId, recordedBy: milkmanId },
            relations: { editHistory: true },
            order: { date: 'DESC' },
        });
        const totalMilkValue = ledgerEntries.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
        const totalPayments = paymentEntries.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
        const netBalance = totalMilkValue - totalPayments;
        let walletStatus = 'settled';
        if (netBalance > 0) {
            walletStatus = 'due';
        }
        else if (netBalance < 0) {
            walletStatus = 'advance';
        }
        const passbook = [];
        for (const item of ledgerEntries) {
            passbook.push({
                id: item.id,
                date: item.date,
                type: 'milk',
                slot: item.slot,
                quantity: Number(item.quantityLiters),
                rate: Number(item.rateApplied),
                amount: Number(item.totalPrice),
                description: `${item.slot.toUpperCase()} - Milk Delivery`,
                mode: null,
                ledgerType: item.type,
            });
        }
        for (const item of paymentEntries) {
            const historyLogs = item.editHistory
                ? item.editHistory.map((h) => ({
                    id: h.id,
                    oldAmount: Number(h.oldAmount),
                    newAmount: Number(h.newAmount),
                    oldDate: h.oldDate,
                    newDate: h.newDate,
                    oldPaymentMode: h.oldPaymentMode,
                    newPaymentMode: h.newPaymentMode,
                    editedAt: h.editedAt,
                })).sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime())
                : [];
            passbook.push({
                id: item.id,
                date: item.date,
                type: 'payment',
                slot: null,
                quantity: null,
                rate: null,
                amount: Number(item.amountPaid),
                description: (item.targetRole || user.role) === 'farmer'
                    ? `Given to ${user.name} (${item.paymentMode === 'cash' ? 'Cash' : 'UPI'})`
                    : `Taken from ${user.name} (${item.paymentMode === 'cash' ? 'Cash' : 'UPI'})`,
                mode: item.paymentMode,
                targetRole: item.targetRole || user.role,
                editHistory: historyLogs,
            });
        }
        passbook.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
            user: {
                id: user.id,
                name: user.name,
                mobileNumber: user.mobileNumber,
                role: user.role,
                address: user.address,
                createdAt: user.createdAt,
            },
            totalMilkValue,
            totalPayments,
            netBalance,
            walletStatus,
            balanceDisplay: `Rs. ${Math.abs(netBalance).toFixed(2)}`,
            passbook,
        };
    }
    async getDashboardSummary(milkmanId, dateStr) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId },
        });
        const mappingMap = new Map();
        mappings.forEach((m) => {
            if (m.customName) {
                mappingMap.set(m.customerId, m.customName);
            }
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0) {
            return {
                metrics: {
                    totalProcurement: 0,
                    totalRevenue: 0,
                    estimatedProfit: 0,
                    activeFarmers: 0,
                    activeConsumers: 0,
                },
                computedMetrics: {
                    todayBuyingMorningVol: 0,
                    todayBuyingEveningVol: 0,
                    todayBuyingMorningCost: 0,
                    todayBuyingEveningCost: 0,
                    todaySellingMorningVol: 0,
                    todaySellingEveningVol: 0,
                    todaySellingMorningValue: 0,
                    todaySellingEveningValue: 0,
                    todayProfitMorning: 0,
                    todayProfitEvening: 0,
                    monthBuyingMorningVol: 0,
                    monthBuyingEveningVol: 0,
                    monthBuyingMorningCost: 0,
                    monthBuyingEveningCost: 0,
                    monthSellingMorningVol: 0,
                    monthSellingEveningVol: 0,
                    monthSellingMorningValue: 0,
                    monthSellingEveningValue: 0,
                    monthProfitMorning: 0,
                    monthProfitEvening: 0,
                    todayTransactions: [],
                }
            };
        }
        const users = await this.userRepository.find({
            where: { id: (0, typeorm_2.In)(customerIds) },
            order: { name: 'ASC' }
        });
        const mappingRoleMap = new Map();
        mappings.forEach((m) => {
            mappingRoleMap.set(m.customerId, m.relationshipRole);
        });
        users.forEach((user) => {
            if (mappingRoleMap.has(user.id)) {
                user.role = mappingRoleMap.get(user.id);
            }
        });
        const farmers = users.filter(u => u.role === 'farmer' || u.role === 'both');
        const consumers = users.filter(u => u.role === 'consumer' || u.role === 'both');
        const ledgerEntries = await this.dailyLedgerRepository.find({
            where: { milkmanId }
        });
        let totalProc = 0;
        let totalRev = 0;
        ledgerEntries.forEach(item => {
            const amt = Number(item.totalPrice || 0);
            if (item.type === daily_ledger_entity_1.LedgerType.BUY) {
                totalProc += amt;
            }
            else {
                totalRev += amt;
            }
        });
        let todayBuyingMorningVol = 0;
        let todayBuyingEveningVol = 0;
        let todayBuyingMorningCost = 0;
        let todayBuyingEveningCost = 0;
        let todaySellingMorningVol = 0;
        let todaySellingEveningVol = 0;
        let todaySellingMorningValue = 0;
        let todaySellingEveningValue = 0;
        let monthBuyingMorningVol = 0;
        let monthBuyingEveningVol = 0;
        let monthBuyingMorningCost = 0;
        let monthBuyingEveningCost = 0;
        let monthSellingMorningVol = 0;
        let monthSellingEveningVol = 0;
        let monthSellingMorningValue = 0;
        let monthSellingEveningValue = 0;
        const todayUserEntries = {};
        const [targetYear, targetMonth] = dateStr.split('-');
        ledgerEntries.forEach((item) => {
            let itemDateStr = '';
            const dateVal = item.date;
            if (dateVal instanceof Date) {
                const year = dateVal.getFullYear();
                const month = String(dateVal.getMonth() + 1).padStart(2, '0');
                const day = String(dateVal.getDate()).padStart(2, '0');
                itemDateStr = `${year}-${month}-${day}`;
            }
            else if (typeof dateVal === 'string') {
                itemDateStr = dateVal.split('T')[0];
            }
            else {
                itemDateStr = new Date(dateVal).toISOString().split('T')[0];
            }
            const isToday = itemDateStr === dateStr;
            const isThisMonth = itemDateStr.startsWith(`${targetYear}-${targetMonth}`);
            const user = users.find((u) => u.id === item.userId);
            if (!user)
                return;
            const qty = Number(item.quantityLiters || 0);
            const rate = Number(item.rateApplied || 0);
            const amt = Number(item.totalPrice || 0);
            if (isToday) {
                if (!todayUserEntries[user.id]) {
                    const mappedName = mappingMap.get(user.id) || user.name;
                    todayUserEntries[user.id] = {
                        id: user.id,
                        name: mappedName,
                        role: user.role,
                        morningBuyQty: 0,
                        morningBuyRate: 0,
                        morningBuyAmt: 0,
                        morningSellQty: 0,
                        morningSellRate: 0,
                        morningSellAmt: 0,
                        eveningBuyQty: 0,
                        eveningBuyRate: 0,
                        eveningBuyAmt: 0,
                        eveningSellQty: 0,
                        eveningSellRate: 0,
                        eveningSellAmt: 0,
                    };
                }
                const tx = todayUserEntries[user.id];
                if (item.slot === 'morning') {
                    if (item.type === daily_ledger_entity_1.LedgerType.BUY) {
                        tx.morningBuyQty = qty;
                        tx.morningBuyRate = rate;
                        tx.morningBuyAmt = amt;
                    }
                    else {
                        tx.morningSellQty = qty;
                        tx.morningSellRate = rate;
                        tx.morningSellAmt = amt;
                    }
                }
                else if (item.slot === 'evening') {
                    if (item.type === daily_ledger_entity_1.LedgerType.BUY) {
                        tx.eveningBuyQty = qty;
                        tx.eveningBuyRate = rate;
                        tx.eveningBuyAmt = amt;
                    }
                    else {
                        tx.eveningSellQty = qty;
                        tx.eveningSellRate = rate;
                        tx.eveningSellAmt = amt;
                    }
                }
                if (item.type === daily_ledger_entity_1.LedgerType.BUY) {
                    if (item.slot === 'morning') {
                        todayBuyingMorningVol += qty;
                        todayBuyingMorningCost += amt;
                    }
                    else if (item.slot === 'evening') {
                        todayBuyingEveningVol += qty;
                        todayBuyingEveningCost += amt;
                    }
                }
                else {
                    if (item.slot === 'morning') {
                        todaySellingMorningVol += qty;
                        todaySellingMorningValue += amt;
                    }
                    else if (item.slot === 'evening') {
                        todaySellingEveningVol += qty;
                        todaySellingEveningValue += amt;
                    }
                }
            }
            if (isThisMonth) {
                if (item.type === daily_ledger_entity_1.LedgerType.BUY) {
                    if (item.slot === 'morning') {
                        monthBuyingMorningVol += qty;
                        monthBuyingMorningCost += amt;
                    }
                    else if (item.slot === 'evening') {
                        monthBuyingEveningVol += qty;
                        monthBuyingEveningCost += amt;
                    }
                }
                else {
                    if (item.slot === 'morning') {
                        monthSellingMorningVol += qty;
                        monthSellingMorningValue += amt;
                    }
                    else if (item.slot === 'evening') {
                        monthSellingEveningVol += qty;
                        monthSellingEveningValue += amt;
                    }
                }
            }
        });
        const transactionsList = Object.values(todayUserEntries).map((tx) => ({
            id: tx.id,
            name: tx.name,
            role: tx.role,
            morningBuyQty: tx.morningBuyQty,
            morningBuyRate: tx.morningBuyRate,
            morningBuyAmt: tx.morningBuyAmt,
            morningSellQty: tx.morningSellQty,
            morningSellRate: tx.morningSellRate,
            morningSellAmt: tx.morningSellAmt,
            eveningBuyQty: tx.eveningBuyQty,
            eveningBuyRate: tx.eveningBuyRate,
            eveningBuyAmt: tx.eveningBuyAmt,
            eveningSellQty: tx.eveningSellQty,
            eveningSellRate: tx.eveningSellRate,
            eveningSellAmt: tx.eveningSellAmt,
            totalBuyAmt: tx.morningBuyAmt + tx.eveningBuyAmt,
            totalSellAmt: tx.morningSellAmt + tx.eveningSellAmt,
        }));
        const todayProfitMorning = todaySellingMorningValue - todayBuyingMorningCost;
        const todayProfitEvening = todaySellingEveningValue - todayBuyingEveningCost;
        const monthProfitMorning = monthSellingMorningValue - monthBuyingMorningCost;
        const monthProfitEvening = monthSellingEveningValue - monthBuyingEveningCost;
        return {
            metrics: {
                totalProcurement: totalProc,
                totalRevenue: totalRev,
                estimatedProfit: totalRev - totalProc,
                activeFarmers: farmers.length,
                activeConsumers: consumers.length,
            },
            computedMetrics: {
                todayBuyingMorningVol,
                todayBuyingEveningVol,
                todayBuyingMorningCost,
                todayBuyingEveningCost,
                todaySellingMorningVol,
                todaySellingEveningVol,
                todaySellingMorningValue,
                todaySellingEveningValue,
                todayProfitMorning,
                todayProfitEvening,
                monthBuyingMorningVol,
                monthBuyingEveningVol,
                monthBuyingMorningCost,
                monthBuyingEveningCost,
                monthSellingMorningVol,
                monthSellingEveningVol,
                monthSellingMorningValue,
                monthSellingEveningValue,
                monthProfitMorning,
                monthProfitEvening,
                todayTransactions: transactionsList,
            }
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(daily_ledger_entity_1.DailyLedger)),
    __param(2, (0, typeorm_1.InjectRepository)(payments_ledger_entity_1.PaymentsLedger)),
    __param(3, (0, typeorm_1.InjectRepository)(milkman_customer_entity_1.MilkmanCustomer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map