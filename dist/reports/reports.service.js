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
    async getTargetMilkmanIds(milkmanId) {
        const user = await this.userRepository.findOne({ where: { id: milkmanId } });
        if (user && user.role === 'milkman' && !user.parentMilkmanId) {
            const subMilkmen = await this.userRepository.find({
                where: { parentMilkmanId: milkmanId, role: 'milkman', isActive: true },
            });
            return [milkmanId, ...subMilkmen.map((u) => u.id)];
        }
        return [milkmanId];
    }
    async getMonthlyReport(milkmanId, monthStr) {
        const [yearStr, monthStr_] = monthStr.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr_, 10) - 1;
        const startDate = new Date(Date.UTC(y, m, 1));
        const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId: (0, typeorm_2.In)(milkmanIds) },
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
            where: { milkmanId: (0, typeorm_2.In)(milkmanIds) },
        });
        const allPayments = await this.paymentsLedgerRepository.find({
            where: { recordedBy: (0, typeorm_2.In)(milkmanIds) },
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
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const mapping = await this.milkmanCustomerRepository.findOne({
            where: { customerId: userId, milkmanId: (0, typeorm_2.In)(milkmanIds) },
        });
        if (mapping) {
            if (mapping.customName) {
                user.name = mapping.customName;
            }
            user.role = mapping.relationshipRole;
        }
        const ledgerEntries = await this.dailyLedgerRepository.find({
            where: { userId, milkmanId: (0, typeorm_2.In)(milkmanIds) },
            relations: { editHistory: true },
            order: { date: 'DESC', slot: 'DESC' },
        });
        const paymentEntries = await this.paymentsLedgerRepository.find({
            where: { userId, recordedBy: (0, typeorm_2.In)(milkmanIds) },
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
            const historyLogs = item.editHistory
                ? item.editHistory.map((h) => ({
                    id: h.id,
                    oldQuantity: Number(h.oldQuantity),
                    newQuantity: Number(h.newQuantity),
                    oldRate: Number(h.oldRate),
                    newRate: Number(h.newRate),
                    editedAt: h.editedAt,
                })).sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime())
                : [];
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
                milkType: item.milkType,
                editHistory: historyLogs,
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
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId: (0, typeorm_2.In)(milkmanIds) },
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
            where: { milkmanId: (0, typeorm_2.In)(milkmanIds) }
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
                        buyBreakdown: {},
                        sellBreakdown: {},
                        morningBuyQty: 0,
                        morningBuyAmt: 0,
                        morningSellQty: 0,
                        morningSellAmt: 0,
                        eveningBuyQty: 0,
                        eveningBuyAmt: 0,
                        eveningSellQty: 0,
                        eveningSellAmt: 0,
                    };
                }
                const tx = todayUserEntries[user.id];
                const mType = item.milkType || 'Buffalo';
                if (item.type === daily_ledger_entity_1.LedgerType.BUY) {
                    if (!tx.buyBreakdown[mType]) {
                        tx.buyBreakdown[mType] = { qty: 0, val: 0, morningQty: 0, morningVal: 0, eveningQty: 0, eveningVal: 0 };
                    }
                    tx.buyBreakdown[mType].qty += qty;
                    tx.buyBreakdown[mType].val += amt;
                    if (item.slot === 'morning') {
                        tx.buyBreakdown[mType].morningQty += qty;
                        tx.buyBreakdown[mType].morningVal += amt;
                        tx.morningBuyQty += qty;
                        tx.morningBuyAmt += amt;
                    }
                    else if (item.slot === 'evening') {
                        tx.buyBreakdown[mType].eveningQty += qty;
                        tx.buyBreakdown[mType].eveningVal += amt;
                        tx.eveningBuyQty += qty;
                        tx.eveningBuyAmt += amt;
                    }
                }
                else {
                    if (!tx.sellBreakdown[mType]) {
                        tx.sellBreakdown[mType] = { qty: 0, val: 0, morningQty: 0, morningVal: 0, eveningQty: 0, eveningVal: 0 };
                    }
                    tx.sellBreakdown[mType].qty += qty;
                    tx.sellBreakdown[mType].val += amt;
                    if (item.slot === 'morning') {
                        tx.sellBreakdown[mType].morningQty += qty;
                        tx.sellBreakdown[mType].morningVal += amt;
                        tx.morningSellQty += qty;
                        tx.morningSellAmt += amt;
                    }
                    else if (item.slot === 'evening') {
                        tx.sellBreakdown[mType].eveningQty += qty;
                        tx.sellBreakdown[mType].eveningVal += amt;
                        tx.eveningSellQty += qty;
                        tx.eveningSellAmt += amt;
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
            buyBreakdown: tx.buyBreakdown,
            sellBreakdown: tx.sellBreakdown,
            morningBuyQty: tx.morningBuyQty,
            morningBuyAmt: tx.morningBuyAmt,
            morningSellQty: tx.morningSellQty,
            morningSellAmt: tx.morningSellAmt,
            eveningBuyQty: tx.eveningBuyQty,
            eveningBuyAmt: tx.eveningBuyAmt,
            eveningSellQty: tx.eveningSellQty,
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
    async getRangeReport(milkmanId, startDateStr, endDateStr) {
        const [startY, startM, startD] = startDateStr.split('-').map(Number);
        const [endY, endM, endD] = endDateStr.split('-').map(Number);
        const startDate = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endY, endM - 1, endD, 23, 59, 59, 999));
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId: (0, typeorm_2.In)(milkmanIds) },
        });
        const customerIds = mappings.map((m) => m.customerId);
        const subMilkmen = await this.userRepository.find({
            where: { parentMilkmanId: milkmanId, role: 'milkman' }
        });
        const subMilkmanIds = subMilkmen.map(sm => sm.id);
        const allUsers = await this.userRepository.find({
            where: [
                { id: (0, typeorm_2.In)([...customerIds, ...subMilkmanIds]) },
                { parentMilkmanId: milkmanId, role: 'milkman' }
            ]
        });
        const mappingMap = new Map();
        const roleMap = new Map();
        mappings.forEach((m) => {
            if (m.customName) {
                mappingMap.set(m.customerId, m.customName);
            }
            roleMap.set(m.customerId, m.relationshipRole);
        });
        const ledgerEntries = await this.dailyLedgerRepository.find({
            where: {
                milkmanId: (0, typeorm_2.In)(milkmanIds),
                date: (0, typeorm_2.Between)(startDateStr, endDateStr)
            }
        });
        const paymentEntries = await this.paymentsLedgerRepository.find({
            where: {
                recordedBy: (0, typeorm_2.In)(milkmanIds),
                date: (0, typeorm_2.Between)(startDateStr, endDateStr)
            }
        });
        let totalBuyQty = 0;
        let totalBuyVal = 0;
        let totalSellQty = 0;
        let totalSellVal = 0;
        let morningBuyQty = 0;
        let eveningBuyQty = 0;
        let morningSellQty = 0;
        let eveningSellQty = 0;
        const milkTypeBreakdown = {};
        ledgerEntries.forEach((entry) => {
            const qty = Number(entry.quantityLiters || 0);
            const val = Number(entry.totalPrice || 0);
            const milkType = entry.milkType || 'Buffalo';
            const slot = entry.slot || 'morning';
            if (!milkTypeBreakdown[milkType]) {
                milkTypeBreakdown[milkType] = { buyQty: 0, buyVal: 0, sellQty: 0, sellVal: 0 };
            }
            if (entry.type === 'buy') {
                totalBuyQty += qty;
                totalBuyVal += val;
                milkTypeBreakdown[milkType].buyQty += qty;
                milkTypeBreakdown[milkType].buyVal += val;
                if (slot === 'morning')
                    morningBuyQty += qty;
                else
                    eveningBuyQty += qty;
            }
            else {
                totalSellQty += qty;
                totalSellVal += val;
                milkTypeBreakdown[milkType].sellQty += qty;
                milkTypeBreakdown[milkType].sellVal += val;
                if (slot === 'morning')
                    morningSellQty += qty;
                else
                    eveningSellQty += qty;
            }
        });
        const userwiseData = allUsers.filter(u => u.role !== 'milkman').map((u) => {
            const uLedgers = ledgerEntries.filter(e => e.userId === u.id);
            const uPayments = paymentEntries.filter(e => e.userId === u.id);
            const buyQty = uLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
            const buyVal = uLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
            const sellQty = uLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
            const sellVal = uLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
            const buyBreakdown = {};
            const sellBreakdown = {};
            uLedgers.forEach((e) => {
                const mType = e.milkType || 'Buffalo';
                const qty = Number(e.quantityLiters || 0);
                const val = Number(e.totalPrice || 0);
                if (qty > 0) {
                    if (e.type === 'buy') {
                        if (!buyBreakdown[mType])
                            buyBreakdown[mType] = { qty: 0, val: 0 };
                        buyBreakdown[mType].qty += qty;
                        buyBreakdown[mType].val += val;
                    }
                    else {
                        if (!sellBreakdown[mType])
                            sellBreakdown[mType] = { qty: 0, val: 0 };
                        sellBreakdown[mType].qty += qty;
                        sellBreakdown[mType].val += val;
                    }
                }
            });
            const amountPaid = uPayments.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
            const amountPaidFarmer = uPayments.filter(p => (p.targetRole || u.role) === 'farmer').reduce((s, p) => s + Number(p.amountPaid || 0), 0);
            const amountPaidConsumer = uPayments.filter(p => (p.targetRole || u.role) === 'consumer').reduce((s, p) => s + Number(p.amountPaid || 0), 0);
            return {
                userId: u.id,
                name: mappingMap.get(u.id) || u.name,
                mobileNumber: u.mobileNumber,
                role: roleMap.get(u.id) || u.role,
                buyQty,
                buyVal,
                sellQty,
                sellVal,
                buyBreakdown,
                sellBreakdown,
                amountPaid,
                amountPaidFarmer,
                amountPaidConsumer,
            };
        });
        const subMilkmanwiseData = subMilkmen.map((sm) => {
            const smLedgers = ledgerEntries.filter(e => e.milkmanId === sm.id);
            const smPayments = paymentEntries.filter(e => e.recordedBy === sm.id);
            const buyQty = smLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
            const buyVal = smLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
            const sellQty = smLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
            const sellVal = smLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
            const amountPaid = smPayments.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
            return {
                subMilkmanId: sm.id,
                name: sm.name,
                mobileNumber: sm.mobileNumber,
                buyQty,
                buyVal,
                sellQty,
                sellVal,
                amountPaid,
            };
        });
        let totalCashCollected = 0;
        let totalUpiCollected = 0;
        let totalCashPaid = 0;
        let totalUpiPaid = 0;
        paymentEntries.forEach((pay) => {
            const amt = Number(pay.amountPaid || 0);
            const mode = pay.paymentMode || 'cash';
            const targetUser = allUsers.find(u => u.id === pay.userId);
            const isFarmer = pay.targetRole
                ? (pay.targetRole === 'farmer')
                : targetUser
                    ? (roleMap.get(pay.userId) === 'farmer' || targetUser.role === 'farmer' || targetUser.role === 'both')
                    : false;
            if (isFarmer) {
                if (mode === 'cash')
                    totalCashPaid += amt;
                else
                    totalUpiPaid += amt;
            }
            else {
                if (mode === 'cash')
                    totalCashCollected += amt;
                else
                    totalUpiCollected += amt;
            }
        });
        const dailyMilkMap = {};
        ledgerEntries.forEach((entry) => {
            const dateStr = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString().split('T')[0];
            const qty = Number(entry.quantityLiters || 0);
            if (!dailyMilkMap[dateStr]) {
                dailyMilkMap[dateStr] = { buyQty: 0, sellQty: 0 };
            }
            if (entry.type === 'buy') {
                dailyMilkMap[dateStr].buyQty += qty;
            }
            else {
                dailyMilkMap[dateStr].sellQty += qty;
            }
        });
        const dailyMilkReport = Object.entries(dailyMilkMap).map(([date, data]) => ({
            date,
            buyQty: data.buyQty,
            sellQty: data.sellQty
        })).sort((a, b) => a.date.localeCompare(b.date));
        const moneyReport = {
            toSeller: {
                allTime: 0,
                morning: {},
                evening: {}
            },
            fromBuyer: {
                allTime: 0,
                morning: {},
                evening: {}
            }
        };
        ledgerEntries.forEach((entry) => {
            const val = Number(entry.totalPrice || 0);
            const slot = entry.slot || 'morning';
            const rawMilkType = entry.milkType || 'Buffalo';
            const milkType = rawMilkType.charAt(0).toUpperCase() + rawMilkType.slice(1).toLowerCase();
            if (entry.type === 'buy') {
                moneyReport.toSeller.allTime += val;
                if (slot === 'morning') {
                    moneyReport.toSeller.morning[milkType] = (moneyReport.toSeller.morning[milkType] || 0) + val;
                }
                else {
                    moneyReport.toSeller.evening[milkType] = (moneyReport.toSeller.evening[milkType] || 0) + val;
                }
            }
            else {
                moneyReport.fromBuyer.allTime += val;
                if (slot === 'morning') {
                    moneyReport.fromBuyer.morning[milkType] = (moneyReport.fromBuyer.morning[milkType] || 0) + val;
                }
                else {
                    moneyReport.fromBuyer.evening[milkType] = (moneyReport.fromBuyer.evening[milkType] || 0) + val;
                }
            }
        });
        return {
            overview: {
                totalBuyQty,
                totalBuyVal,
                totalSellQty,
                totalSellVal,
                morningBuyQty,
                eveningBuyQty,
                morningSellQty,
                eveningSellQty,
                totalCashCollected,
                totalUpiCollected,
                totalCashPaid,
                totalUpiPaid,
            },
            milkTypeBreakdown,
            userwiseReport: userwiseData,
            subMilkmanReport: subMilkmanwiseData,
            dailyMilkReport,
            moneyReport,
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