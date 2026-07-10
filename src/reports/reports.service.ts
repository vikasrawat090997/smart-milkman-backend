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
  ) {}

  async getMonthlyReport(milkmanId: string, monthStr: string) {
    const [yearStr, monthStr_] = monthStr.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr_, 10) - 1;
    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId },
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
      where: { milkmanId },
    });
    const allPayments = await this.paymentsLedgerRepository.find({
      where: { recordedBy: milkmanId },
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

    const mapping = await this.milkmanCustomerRepository.findOne({
      where: { milkmanId, customerId: userId },
    });
    if (mapping) {
      if (mapping.customName) {
        user.name = mapping.customName;
      }
      user.role = mapping.relationshipRole as any;
    }

    // Fetch all daily ledger entries for this milkman
    const ledgerEntries = await this.dailyLedgerRepository.find({
      where: { userId, milkmanId },
      order: { date: 'DESC', slot: 'DESC' },
    });

    // Fetch all payments recorded by this milkman with edit history
    const paymentEntries = await this.paymentsLedgerRepository.find({
      where: { userId, recordedBy: milkmanId },
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
    // 1. Fetch users mapped to this milkman
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId },
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
      where: { milkmanId }
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
          if (item.type === LedgerType.BUY) {
            tx.morningBuyQty = qty;
            tx.morningBuyRate = rate;
            tx.morningBuyAmt = amt;
          } else {
            tx.morningSellQty = qty;
            tx.morningSellRate = rate;
            tx.morningSellAmt = amt;
          }
        } else if (item.slot === 'evening') {
          if (item.type === LedgerType.BUY) {
            tx.eveningBuyQty = qty;
            tx.eveningBuyRate = rate;
            tx.eveningBuyAmt = amt;
          } else {
            tx.eveningSellQty = qty;
            tx.eveningSellRate = rate;
            tx.eveningSellAmt = amt;
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
}

