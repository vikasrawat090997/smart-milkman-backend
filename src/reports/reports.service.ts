import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { DailyLedger, LedgerType } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DailyLedger)
    private dailyLedgerRepository: Repository<DailyLedger>,
    @InjectRepository(PaymentsLedger)
    private paymentsLedgerRepository: Repository<PaymentsLedger>,
    @InjectRepository(MilkmanCustomer)
    private milkmanCustomerRepository: Repository<MilkmanCustomer>,
  ) { }

  private async getTargetMilkmanIds(milkmanId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    if (user && user.role === 'milkman' && !user.parentMilkmanId) {
      const subMilkmen = await this.userRepository.find({
        where: { parentMilkmanId: milkmanId, role: 'milkman' as any, isActive: true },
      });
      return [milkmanId, ...subMilkmen.map((u) => u.id)];
    }
    return [milkmanId];
  }

  async getMonthlyReport(milkmanId: string, monthStr: string) {
    const [yearStr, monthStr_] = monthStr.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr_, 10) - 1;
    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId: In(milkmanIds) },
    });
    const customerIds = mappings.map((m) => m.customerId);
    if (customerIds.length === 0) return [];

    const allUsers = await this.userRepository.find({
      where: { id: In(customerIds) },
      order: { name: 'ASC' },
    });

    const mappingMap = new Map<string, string>();
    const roleMap = new Map<string, string>();
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
      roleMap.set(m.customerId, m.relationshipRole);
    });

    const users = allUsers.filter((user) => {
      // Exclude self (non-customer roles)
      if (user.role !== 'farmer' && user.role !== 'consumer' && user.role !== 'both') {
        return false;
      }
      // Exclude users created after the selected report month
      if (user.createdAt) {
        const creationDate = new Date(user.createdAt);
        return creationDate.getTime() <= endDate.getTime();
      }
      return true;
    });

    const allLedger = await this.dailyLedgerRepository.find({
      where: { milkmanId: In(milkmanIds) },
    });
    const allPayments = await this.paymentsLedgerRepository.find({
      where: { recordedBy: In(milkmanIds) },
    });

    return users.map((user) => {
      // Filter logs for selected month
      const monthLedgers = allLedger.filter((item) => {
        const itemDateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split('T')[0];
        return item.userId === user.id && itemDateStr.startsWith(monthStr);
      });

      const monthPaymentsList = allPayments.filter((item) => {
        const itemDateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split('T')[0];
        return item.userId === user.id && itemDateStr.startsWith(monthStr);
      });

      // Selected month aggregates
      const monthMilkQuantity = monthLedgers.reduce((sum, item) => sum + Number(item.quantityLiters || 0), 0);
      const monthMilkValue = monthLedgers.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      const monthPayments = monthPaymentsList.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
      const monthNet = monthPayments - monthMilkValue; // +ve means Advance paid, -ve means Pending

      // All-time aggregates
      const userAllLedgers = allLedger.filter((item) => item.userId === user.id);
      const userAllPayments = allPayments.filter((item) => item.userId === user.id);

      const totalMilkValue = userAllLedgers.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      const totalPayments = userAllPayments.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
      const cumulativeBalance = totalPayments - totalMilkValue; // +ve means Advance paid, -ve means Pending

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

  async getBillSummary(userId: string, milkmanId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const mapping = await this.milkmanCustomerRepository.findOne({
      where: { customerId: userId, milkmanId: In(milkmanIds) },
    });
    if (mapping) {
      if (mapping.customName) {
        user.name = mapping.customName;
      }
      user.role = mapping.relationshipRole as any;
    }

    // Fetch all daily ledger entries for this milkman
    const ledgerEntries = await this.dailyLedgerRepository.find({
      where: { userId, milkmanId: In(milkmanIds) },
      relations: { editHistory: true },
      order: { date: 'DESC', slot: 'DESC' },
    });

    // Fetch all payments recorded by this milkman with edit history
    const paymentEntries = await this.paymentsLedgerRepository.find({
      where: { userId, recordedBy: In(milkmanIds) },
      relations: { editHistory: true },
      order: { date: 'DESC' },
    });

    // Calculate sums
    const totalMilkValue = ledgerEntries.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
    const totalPayments = paymentEntries.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
    const netBalance = totalMilkValue - totalPayments;

    let walletStatus: 'due' | 'advance' | 'settled' = 'settled';
    if (netBalance > 0) {
      walletStatus = 'due';
    } else if (netBalance < 0) {
      walletStatus = 'advance';
    }

    // Map and compile chronological passbook
    const passbook: any[] = [];

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

    // Sort passbook by date DESC
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

  async getDashboardSummary(milkmanId: string, dateStr: string) {
    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    // 1. Fetch users mapped to this milkman
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId: In(milkmanIds) },
    });
    const mappingMap = new Map<string, string>();
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
      where: { id: In(customerIds) },
      order: { name: 'ASC' }
    });

    const mappingRoleMap = new Map<string, string>();
    mappings.forEach((m) => {
      mappingRoleMap.set(m.customerId, m.relationshipRole);
    });

    users.forEach((user) => {
      if (mappingRoleMap.has(user.id)) {
        user.role = mappingRoleMap.get(user.id) as any;
      }
    });

    const farmers = users.filter(u => u.role === 'farmer' || u.role === 'both');
    const consumers = users.filter(u => u.role === 'consumer' || u.role === 'both');

    // 2. Fetch all daily ledger entries for this milkman
    const ledgerEntries = await this.dailyLedgerRepository.find({
      where: { milkmanId: In(milkmanIds) }
    });

    // Calculate all-time sums using item.type (not user.role)
    let totalProc = 0;
    let totalRev = 0;
    ledgerEntries.forEach(item => {
      const amt = Number(item.totalPrice || 0);
      if (item.type === LedgerType.BUY) {
        totalProc += amt;
      } else {
        totalRev += amt;
      }
    });

    // 4. Group calculations for the specific date
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

    const todayUserEntries: { [userId: string]: any } = {};

    const [targetYear, targetMonth] = dateStr.split('-');

    ledgerEntries.forEach((item) => {
      let itemDateStr = '';
      const dateVal = item.date as any;
      if (dateVal instanceof Date) {
        const year = dateVal.getFullYear();
        const month = String(dateVal.getMonth() + 1).padStart(2, '0');
        const day = String(dateVal.getDate()).padStart(2, '0');
        itemDateStr = `${year}-${month}-${day}`;
      } else if (typeof dateVal === 'string') {
        itemDateStr = dateVal.split('T')[0];
      } else {
        itemDateStr = new Date(dateVal).toISOString().split('T')[0];
      }

      const isToday = itemDateStr === dateStr;
      const isThisMonth = itemDateStr.startsWith(`${targetYear}-${targetMonth}`);

      const user = users.find((u) => u.id === item.userId);
      if (!user) return;

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

        if (item.type === LedgerType.BUY) {
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
          } else if (item.slot === 'evening') {
            tx.buyBreakdown[mType].eveningQty += qty;
            tx.buyBreakdown[mType].eveningVal += amt;
            tx.eveningBuyQty += qty;
            tx.eveningBuyAmt += amt;
          }
        } else {
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
          } else if (item.slot === 'evening') {
            tx.sellBreakdown[mType].eveningQty += qty;
            tx.sellBreakdown[mType].eveningVal += amt;
            tx.eveningSellQty += qty;
            tx.eveningSellAmt += amt;
          }
        }

        if (item.type === LedgerType.BUY) {
          if (item.slot === 'morning') {
            todayBuyingMorningVol += qty;
            todayBuyingMorningCost += amt;
          } else if (item.slot === 'evening') {
            todayBuyingEveningVol += qty;
            todayBuyingEveningCost += amt;
          }
        } else {
          if (item.slot === 'morning') {
            todaySellingMorningVol += qty;
            todaySellingMorningValue += amt;
          } else if (item.slot === 'evening') {
            todaySellingEveningVol += qty;
            todaySellingEveningValue += amt;
          }
        }
      }

      if (isThisMonth) {
        if (item.type === LedgerType.BUY) {
          if (item.slot === 'morning') {
            monthBuyingMorningVol += qty;
            monthBuyingMorningCost += amt;
          } else if (item.slot === 'evening') {
            monthBuyingEveningVol += qty;
            monthBuyingEveningCost += amt;
          }
        } else {
          if (item.slot === 'morning') {
            monthSellingMorningVol += qty;
            monthSellingMorningValue += amt;
          } else if (item.slot === 'evening') {
            monthSellingEveningVol += qty;
            monthSellingEveningValue += amt;
          }
        }
      }
    });

    const transactionsList = Object.values(todayUserEntries).map((tx: any) => ({
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

  async getRangeReport(milkmanId: string, startDateStr: string, endDateStr: string) {
    const [startY, startM, startD] = startDateStr.split('-').map(Number);
    const [endY, endM, endD] = endDateStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(endY, endM - 1, endD, 23, 59, 59, 999));

    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);

    // Fetch all mapped customers
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId: In(milkmanIds) },
    });
    const customerIds = mappings.map((m) => m.customerId);

    // Fetch all active sub milkmen
    const subMilkmen = await this.userRepository.find({
      where: { parentMilkmanId: milkmanId, role: 'milkman' as any }
    });
    const subMilkmanIds = subMilkmen.map(sm => sm.id);

    // All relevant users (customers + sub-milkmen)
    const allUsers = await this.userRepository.find({
      where: [
        { id: In([...customerIds, ...subMilkmanIds]) },
        { parentMilkmanId: milkmanId, role: 'milkman' as any }
      ]
    });

    const mappingMap = new Map<string, string>();
    const roleMap = new Map<string, string>();
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
      roleMap.set(m.customerId, m.relationshipRole);
    });

    // Fetch all ledger logs and payments in the date range
    const ledgerEntries = await this.dailyLedgerRepository.find({
      where: {
        milkmanId: In(milkmanIds),
        date: Between(startDateStr as any, endDateStr as any)
      }
    });

    const paymentEntries = await this.paymentsLedgerRepository.find({
      where: {
        recordedBy: In(milkmanIds),
        date: Between(startDateStr as any, endDateStr as any)
      }
    });

    // 1. Overall Milk Totals
    let totalBuyQty = 0;
    let totalBuyVal = 0;
    let totalSellQty = 0;
    let totalSellVal = 0;

    let morningBuyQty = 0;
    let eveningBuyQty = 0;
    let morningSellQty = 0;
    let eveningSellQty = 0;

    const milkTypeBreakdown: { [milkType: string]: { buyQty: number, buyVal: number, sellQty: number, sellVal: number } } = {};

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
        if (slot === 'morning') morningBuyQty += qty;
        else eveningBuyQty += qty;
      } else {
        totalSellQty += qty;
        totalSellVal += val;
        milkTypeBreakdown[milkType].sellQty += qty;
        milkTypeBreakdown[milkType].sellVal += val;
        if (slot === 'morning') morningSellQty += qty;
        else eveningSellQty += qty;
      }
    });

    // 2. Userwise Milk & Ledger Data
    const userwiseData = allUsers.filter(u => u.role !== 'milkman').map((u) => {
      const uLedgers = ledgerEntries.filter(e => e.userId === u.id);
      const uPayments = paymentEntries.filter(e => e.userId === u.id);

      const buyQty = uLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
      const buyVal = uLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
      const sellQty = uLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
      const sellVal = uLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);

      const buyBreakdown: { [milkType: string]: { qty: number; val: number } } = {};
      const sellBreakdown: { [milkType: string]: { qty: number; val: number } } = {};

      uLedgers.forEach((e) => {
        const mType = e.milkType || 'Buffalo';
        const qty = Number(e.quantityLiters || 0);
        const val = Number(e.totalPrice || 0);
        if (qty > 0) {
          if (e.type === 'buy') {
            if (!buyBreakdown[mType]) buyBreakdown[mType] = { qty: 0, val: 0 };
            buyBreakdown[mType].qty += qty;
            buyBreakdown[mType].val += val;
          } else {
            if (!sellBreakdown[mType]) sellBreakdown[mType] = { qty: 0, val: 0 };
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

    // 3. Sub-milkman Wise aggregates
    const subMilkmanwiseData = subMilkmen.map((sm) => {
      const smLedgers = ledgerEntries.filter(e => e.milkmanId === sm.id);
      const smPayments = paymentEntries.filter(e => e.recordedBy === sm.id);

      const buyQty = smLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
      const buyVal = smLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
      const sellQty = smLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
      const sellVal = smLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
      const amountPaid = smPayments.reduce((s, p) => s + Number(p.amountPaid || 0), 0);

      const customerBreakdown = allUsers.filter(u => u.role !== 'milkman').map((u) => {
        const uLedgers = smLedgers.filter(e => e.userId === u.id);
        if (uLedgers.length === 0) return null;

        const cBuyQty = uLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
        const cBuyVal = uLedgers.filter(e => e.type === 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);
        const cSellQty = uLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.quantityLiters || 0), 0);
        const cSellVal = uLedgers.filter(e => e.type !== 'buy').reduce((s, e) => s + Number(e.totalPrice || 0), 0);

        const cBuyBreakdown: { [milkType: string]: { qty: number; val: number } } = {};
        const cSellBreakdown: { [milkType: string]: { qty: number; val: number } } = {};

        uLedgers.forEach((e) => {
          const mType = e.milkType || 'Buffalo';
          const qty = Number(e.quantityLiters || 0);
          const val = Number(e.totalPrice || 0);
          if (qty > 0) {
            if (e.type === 'buy') {
              if (!cBuyBreakdown[mType]) cBuyBreakdown[mType] = { qty: 0, val: 0 };
              cBuyBreakdown[mType].qty += qty;
              cBuyBreakdown[mType].val += val;
            } else {
              if (!cSellBreakdown[mType]) cSellBreakdown[mType] = { qty: 0, val: 0 };
              cSellBreakdown[mType].qty += qty;
              cSellBreakdown[mType].val += val;
            }
          }
        });

        return {
          userId: u.id,
          name: mappingMap.get(u.id) || u.name,
          role: roleMap.get(u.id) || u.role,
          buyQty: cBuyQty,
          buyVal: cBuyVal,
          sellQty: cSellQty,
          sellVal: cSellVal,
          buyBreakdown: cBuyBreakdown,
          sellBreakdown: cSellBreakdown,
        };
      }).filter(Boolean);

      return {
        subMilkmanId: sm.id,
        name: sm.name,
        mobileNumber: sm.mobileNumber,
        buyQty,
        buyVal,
        sellQty,
        sellVal,
        amountPaid,
        customerBreakdown,
      };
    });

    // 4. Collection/Payment Report
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
        if (mode === 'cash') totalCashPaid += amt;
        else totalUpiPaid += amt;
      } else {
        if (mode === 'cash') totalCashCollected += amt;
        else totalUpiCollected += amt;
      }
    });

    // 5. Daily milk data points for trend chart
    const dailyMilkMap: { [dateStr: string]: { buyQty: number, sellQty: number } } = {};
    ledgerEntries.forEach((entry) => {
      const dateStr = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString().split('T')[0];
      const qty = Number(entry.quantityLiters || 0);

      if (!dailyMilkMap[dateStr]) {
        dailyMilkMap[dateStr] = { buyQty: 0, sellQty: 0 };
      }

      if (entry.type === 'buy') {
        dailyMilkMap[dateStr].buyQty += qty;
      } else {
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
        morning: {} as Record<string, number>,
        evening: {} as Record<string, number>
      },
      fromBuyer: {
        allTime: 0,
        morning: {} as Record<string, number>,
        evening: {} as Record<string, number>
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
        } else {
          moneyReport.toSeller.evening[milkType] = (moneyReport.toSeller.evening[milkType] || 0) + val;
        }
      } else {
        moneyReport.fromBuyer.allTime += val;
        if (slot === 'morning') {
          moneyReport.fromBuyer.morning[milkType] = (moneyReport.fromBuyer.morning[milkType] || 0) + val;
        } else {
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
}

