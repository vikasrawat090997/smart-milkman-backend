import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull, Not } from 'typeorm';
import { BillLock } from '../entities/bill-lock.entity';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
import PDFDocument from 'pdfkit';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(BillLock)
    private billLockRepository: Repository<BillLock>,
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

  async lockDateRange(milkmanId: string, startDateStr: string, endDateStr: string, isLocked: boolean, userId?: string) {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    const targetMilkmanId = (user && user.parentMilkmanId) ? user.parentMilkmanId : milkmanId;

    const findWhere: any = {
      startDate: startDateStr as any,
      endDate: endDateStr as any,
      milkmanId: targetMilkmanId
    };
    if (userId) {
      findWhere.userId = userId;
    } else {
      findWhere.userId = IsNull();
    }

    if (isLocked) {
      let lock = await this.billLockRepository.findOne({ where: findWhere });
      if (!lock) {
        lock = this.billLockRepository.create({
          startDate: startDateStr as any,
          endDate: endDateStr as any,
          milkmanId: targetMilkmanId,
          userId: userId || null,
          isLocked: true
        });
      }
      const saved = await this.billLockRepository.save(lock);

      // Clean up individual redundant locks for the same date range when locking globally
      if (!userId) {
        await this.billLockRepository.delete({
          startDate: startDateStr as any,
          endDate: endDateStr as any,
          milkmanId: targetMilkmanId,
          userId: Not(IsNull())
        });
      }
      return saved;
    } else {
      await this.billLockRepository.delete(findWhere);
      return { success: true };
    }
  }

  async isDateLocked(milkmanId: string, targetDateStr: string, userId?: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    const targetMilkmanId = (user && user.parentMilkmanId) ? user.parentMilkmanId : milkmanId;

    const locks = await this.billLockRepository.find({
      where: { milkmanId: targetMilkmanId, isLocked: true }
    });

    const targetDate = new Date(targetDateStr);
    return locks.some((l) => {
      if (l.userId && l.userId !== userId) {
        return false;
      }
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const targetTime = targetDate.getTime();
      return targetTime >= start.getTime() && targetTime <= end.getTime();
    });
  }

  async getLocks(milkmanId: string, callerId?: string, callerRole?: string) {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    const targetMilkmanId = (user && user.parentMilkmanId) ? user.parentMilkmanId : milkmanId;

    let callerMapping: MilkmanCustomer | null = null;
    if (callerId && callerRole !== 'milkman') {
      callerMapping = await this.milkmanCustomerRepository.findOne({
        where: { customerId: callerId, milkmanId: targetMilkmanId }
      });
    }

    const locks = await this.billLockRepository.find({
      where: { milkmanId: targetMilkmanId },
      order: { startDate: 'DESC' }
    });

    return locks
      .filter((l) => {
        if (callerId && callerRole !== 'milkman') {
          if (l.userId && l.userId !== callerId) {
            return false;
          }
          if (callerMapping && callerMapping.deactivatedAt) {
            const lockStart = new Date(l.startDate);
            const deactivated = new Date(callerMapping.deactivatedAt);
            if (lockStart.getTime() > deactivated.getTime()) {
              return false;
            }
          }
        }
        return true;
      })
      .map(l => ({
        id: l.id,
        startDate: typeof l.startDate === 'string' ? l.startDate : new Date(l.startDate).toISOString().split('T')[0],
        endDate: typeof l.endDate === 'string' ? l.endDate : new Date(l.endDate).toISOString().split('T')[0],
        isLocked: l.isLocked,
        userId: l.userId,
        lockedAt: l.lockedAt
      }));
  }

  async generateBillPdf(
    res: any,
    userId: string,
    milkmanId: string,
    dateRange: { startDate?: string; endDate?: string; month?: string },
    requestUserRole: string,
    targetRole?: string
  ) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    await this.drawSingleBillIntoDoc(doc, userId, milkmanId, dateRange, targetRole, requestUserRole);
    doc.end();
  }

  async generateAllBillsPdf(
    res: any,
    milkmanId: string,
    dateRange: { startDate?: string; endDate?: string; month?: string },
    targetRole?: string
  ) {
    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId: In(milkmanIds) }
    });
    const customerIds = mappings.map(m => m.customerId);
    if (customerIds.length === 0) {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);
      doc.text('No customers mapped.');
      doc.end();
      return;
    }

    const customers = await this.userRepository.find({
      where: { id: In(customerIds), isActive: true }
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    for (let i = 0; i < customers.length; i++) {
      if (i > 0) {
        doc.addPage();
      }
      await this.drawSingleBillIntoDoc(doc, customers[i].id, milkmanId, dateRange, targetRole, 'milkman');
    }

    doc.end();
  }

  async drawSingleBillIntoDoc(
    doc: any,
    userId: string,
    milkmanId: string,
    dateRange: { startDate?: string; endDate?: string; month?: string },
    targetRole?: string,
    requestUserRole?: string
  ) {
    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const mapping = await this.milkmanCustomerRepository.findOne({
      where: { customerId: userId, milkmanId: In(milkmanIds) },
    });
    const targetMilkmanId = mapping ? mapping.milkmanId : milkmanId;

    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;
    let isLocked = false;

    if (dateRange.startDate && dateRange.endDate) {
      startDate = new Date(dateRange.startDate + 'T00:00:00Z');
      endDate = new Date(dateRange.endDate + 'T23:59:59Z');
      periodLabel = `${dateRange.startDate} to ${dateRange.endDate}`;
      isLocked = true;
    } else if (dateRange.month) {
      const [monthStr, yearStr] = dateRange.month.split('-');
      const m = parseInt(monthStr, 10) - 1;
      const y = parseInt(yearStr, 10);
      startDate = new Date(Date.UTC(y, m, 1));
      endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      periodLabel = dateRange.month;
      isLocked = await this.isDateLocked(targetMilkmanId, `${yearStr}-${monthStr}-01`);
    } else {
      throw new NotFoundException('Either startDate/endDate or month must be provided');
    }

    if (!isLocked && requestUserRole !== 'milkman') {
      throw new ForbiddenException('Bill not generated yet by Milkman');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeLayoutRole = targetRole || (mapping ? mapping.relationshipRole : (user.role === 'both' ? 'both' : user.role));

    const ledgerEntriesRaw = await this.dailyLedgerRepository.find({
      where: { userId, milkmanId: In(milkmanIds), date: Between(startDate, endDate) },
      order: { date: 'ASC', slot: 'ASC' },
    });

    const paymentEntriesRaw = await this.paymentsLedgerRepository.find({
      where: { userId, recordedBy: In(milkmanIds), date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    const slateDark = '#0f172a';
    const slateLight = '#64748b';
    const borderGray = '#e2e8f0';
    const emeraldGreen = '#16a34a';
    const roseRed = '#dc2626';

    doc.fillColor(slateDark).fontSize(20).text('SMART DHUDHIYA', 50, 50, { align: 'left' });
    doc.fontSize(8).fillColor(slateLight).text('Zero-Cost Dairy Ledger & Delivery System', 50, 72);

    doc.fontSize(13).fillColor(slateDark).text('ACCOUNT STATEMENT', 380, 50, { align: 'right' });
    doc.fontSize(9).fillColor(slateLight).text(`Period: ${periodLabel}`, 380, 66, { align: 'right' });
    doc.text(`Status: ${isLocked ? 'OFFICIAL INVOICE' : 'UNLOCKED PREVIEW'}`, 380, 78, { align: 'right' });

    doc.moveTo(50, 95).lineTo(545, 95).strokeColor(borderGray).stroke();

    let yPosition = 200;

    if (activeLayoutRole === 'both') {
      const buyEntries = ledgerEntriesRaw.filter(item => item.type === 'buy');
      const sellEntries = ledgerEntriesRaw.filter(item => item.type.startsWith('sell'));
      const buyPayments = paymentEntriesRaw.filter(item => item.targetRole === 'farmer' || item.targetRole === 'both');
      const sellPayments = paymentEntriesRaw.filter(item => item.targetRole === 'consumer' || item.targetRole === 'both');

      const totalBuyQty = buyEntries.reduce((sum, item) => sum + Number(item.quantityLiters), 0);
      const totalBuyVal = buyEntries.reduce((sum, item) => sum + Number(item.totalPrice), 0);
      const totalBuyPaid = buyPayments.reduce((sum, item) => sum + Number(item.amountPaid), 0);

      const totalSellQty = sellEntries.reduce((sum, item) => sum + Number(item.quantityLiters), 0);
      const totalSellVal = sellEntries.reduce((sum, item) => sum + Number(item.totalPrice), 0);
      const totalSellPaid = sellPayments.reduce((sum, item) => sum + Number(item.amountPaid), 0);

      const netBuy = totalBuyVal - totalBuyPaid;
      const netSell = totalSellVal - totalSellPaid;
      const netOverall = netSell - netBuy;

      const profitLoss = totalSellVal - totalBuyVal;

      doc.fillColor(slateDark).fontSize(10).text('BILL TO:', 50, 110);
      doc.fontSize(9).text(`Customer: ${user.name}`, 50, 123);
      doc.text(`Mobile: ${user.mobileNumber}`, 50, 134);
      doc.text(`Account Type: DUAL (Seller & Buyer)`, 50, 145);
      if (user.address) {
        doc.text(`Address: ${user.address}`, 50, 156, { width: 220 });
      }

      doc.fillColor(slateDark).fontSize(10).text('SUMMARY BALANCE SHEET:', 320, 110);
      doc.fontSize(8.5);
      doc.fillColor(slateDark).text(`Total Milk Sold (Seller): `, 320, 123);
      doc.fillColor('#334155').text(`${totalBuyQty.toFixed(1)} Ltr (Rs. ${totalBuyVal.toFixed(2)})`, 440, 123);

      doc.fillColor(slateDark).text(`Total Milk Bought (Buyer): `, 320, 134);
      doc.fillColor('#334155').text(`${totalSellQty.toFixed(1)} Ltr (Rs. ${totalSellVal.toFixed(2)})`, 440, 134);

      doc.fillColor(slateDark).text(`Payouts Given (Farmer): `, 320, 145);
      doc.fillColor('#334155').text(`Rs. ${totalBuyPaid.toFixed(2)}`, 440, 145);

      doc.fillColor(slateDark).text(`Payments Collected (Consumer): `, 320, 156);
      doc.fillColor('#334155').text(`Rs. ${totalSellPaid.toFixed(2)}`, 440, 156);

      doc.fillColor(slateDark).text(`Net Surplus (Profit/Loss): `, 320, 167);
      doc.fillColor(profitLoss >= 0 ? emeraldGreen : roseRed).text(`Rs. ${profitLoss.toFixed(2)} ${profitLoss >= 0 ? '(Profit)' : '(Loss)'}`, 440, 167);

      let balanceLabel = 'Net Due to Milkman';
      let balanceColor = roseRed;
      if (netOverall < 0) {
        balanceLabel = 'Net Payout Outstanding';
        balanceColor = emeraldGreen;
      } else if (netOverall === 0) {
        balanceLabel = 'Account Balance';
        balanceColor = slateLight;
      }
      doc.fillColor(slateDark).text(`${balanceLabel}: `, 320, 178);
      doc.fillColor(balanceColor).text(`Rs. ${Math.abs(netOverall).toFixed(2)}`, 440, 178);

      doc.moveTo(50, 195).lineTo(545, 195).strokeColor(borderGray).stroke();
      yPosition = 210;
    } else {
      const ledgerEntries = ledgerEntriesRaw.filter(item => {
        const isBuyType = item.type === 'buy';
        const isSellType = item.type.startsWith('sell');
        if (activeLayoutRole === 'farmer' && isSellType) return false;
        if (activeLayoutRole === 'consumer' && isBuyType) return false;
        return true;
      });

      const paymentEntries = paymentEntriesRaw.filter(item => {
        const pRole = item.targetRole || user.role;
        if (pRole === activeLayoutRole || pRole === 'both') return true;
        return false;
      });

      const totalQty = ledgerEntries.reduce((sum, item) => sum + Number(item.quantityLiters), 0);
      const totalVal = ledgerEntries.reduce((sum, item) => sum + Number(item.totalPrice), 0);
      const totalPaid = paymentEntries.reduce((sum, item) => sum + Number(item.amountPaid), 0);
      const monthlyNet = totalVal - totalPaid;

      doc.fillColor(slateDark).fontSize(10).text('BILL TO:', 50, 110);
      doc.fontSize(9).text(`Customer: ${user.name}`, 50, 123);
      doc.text(`Mobile: ${user.mobileNumber}`, 50, 134);
      doc.text(`Account Type: ${activeLayoutRole.toUpperCase()}`, 50, 145);
      if (user.address) {
        doc.text(`Address: ${user.address}`, 50, 156, { width: 220 });
      }

      doc.fillColor(slateDark).fontSize(10).text('ACCOUNT SUMMARY:', 320, 110);
      doc.fontSize(8.5);
      doc.text(`Total Milk Volume: ${totalQty.toFixed(1)} Liters`, 320, 123);
      doc.text(`Total Milk Value: Rs. ${totalVal.toFixed(2)}`, 320, 134);
      doc.text(`Total Payments: Rs. ${totalPaid.toFixed(2)}`, 320, 145);

      let balanceLabel = 'Net Due (Udhari)';
      let highlightColor = roseRed;
      if (activeLayoutRole === 'farmer') {
        balanceLabel = monthlyNet >= 0 ? 'Payout Outstanding' : 'Advance Given';
        highlightColor = monthlyNet >= 0 ? slateDark : emeraldGreen;
      } else {
        balanceLabel = monthlyNet >= 0 ? 'Due Amount (Udhari)' : 'Wallet Advance';
        highlightColor = monthlyNet >= 0 ? roseRed : emeraldGreen;
      }
      doc.fillColor(slateDark).text(`${balanceLabel}: `, 320, 156);
      doc.fillColor(highlightColor).text(`Rs. ${Math.abs(monthlyNet).toFixed(2)}`, 440, 156);

      doc.moveTo(50, 185).lineTo(545, 185).strokeColor(borderGray).stroke();
      yPosition = 200;
    }

    const groupedMap: {
      [dateStr: string]: {
        date: string;
        buyBreakdown: { [milkType: string]: { qty: number; val: number } };
        sellBreakdown: { [milkType: string]: { qty: number; val: number } };
        paymentVal: number;
      };
    } = {};

    ledgerEntriesRaw.forEach((entry) => {
      const dateStr = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString().split('T')[0];
      if (!groupedMap[dateStr]) {
        groupedMap[dateStr] = {
          date: dateStr,
          buyBreakdown: {},
          sellBreakdown: {},
          paymentVal: 0,
        };
      }
      const qty = Number(entry.quantityLiters || 0);
      const val = Number(entry.totalPrice || 0);
      const mType = entry.milkType || 'Buffalo';
      if (qty > 0) {
        if (entry.type === 'buy') {
          if (!groupedMap[dateStr].buyBreakdown[mType]) {
            groupedMap[dateStr].buyBreakdown[mType] = { qty: 0, val: 0 };
          }
          groupedMap[dateStr].buyBreakdown[mType].qty += qty;
          groupedMap[dateStr].buyBreakdown[mType].val += val;
        } else {
          if (!groupedMap[dateStr].sellBreakdown[mType]) {
            groupedMap[dateStr].sellBreakdown[mType] = { qty: 0, val: 0 };
          }
          groupedMap[dateStr].sellBreakdown[mType].qty += qty;
          groupedMap[dateStr].sellBreakdown[mType].val += val;
        }
      }
    });

    paymentEntriesRaw.forEach((entry) => {
      const dateStr = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString().split('T')[0];
      if (!groupedMap[dateStr]) {
        groupedMap[dateStr] = {
          date: dateStr,
          buyBreakdown: {},
          sellBreakdown: {},
          paymentVal: 0,
        };
      }
      groupedMap[dateStr].paymentVal += Number(entry.amountPaid || 0);
    });

    const sortedGroupedLogs = Object.values(groupedMap).sort((a, b) => a.date.localeCompare(b.date));

    doc.fontSize(10).fillColor(slateDark).text('DAILY TRANSACTION LEDGER LOGS', 50, yPosition);
    yPosition += 15;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
    yPosition += 5;

    doc.fontSize(8).fillColor(slateDark);
    doc.text('Date', 55, yPosition);
    doc.text('Buy (Milk Type: Qty / Value)', 145, yPosition);
    doc.text('Sell (Milk Type: Qty / Value)', 310, yPosition);
    doc.text('Payments', 475, yPosition);

    yPosition += 10;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
    yPosition += 6;

    if (sortedGroupedLogs.length === 0) {
      doc.fontSize(8.5).fillColor('#64748b').text('No transaction logs recorded for this period.', 55, yPosition);
    } else {
      for (const entry of sortedGroupedLogs) {
        const buyKeys = Object.keys(entry.buyBreakdown);
        const sellKeys = Object.keys(entry.sellBreakdown);
        const linesNeeded = Math.max(buyKeys.length, sellKeys.length, 1);
        const rowHeight = linesNeeded * 12 + 10;

        if (yPosition + rowHeight > 750) {
          doc.addPage();
          yPosition = 50;
          doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
          yPosition += 5;
          doc.fontSize(8).fillColor(slateDark);
          doc.text('Date', 55, yPosition);
          doc.text('Buy (Milk Type: Qty / Value)', 145, yPosition);
          doc.text('Sell (Milk Type: Qty / Value)', 310, yPosition);
          doc.text('Payments', 475, yPosition);
          yPosition += 10;
          doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
          yPosition += 6;
        }

        doc.fontSize(8.5).fillColor('#334155');
        doc.text(entry.date, 55, yPosition);

        let buyY = yPosition;
        if (buyKeys.length === 0) {
          doc.text('-', 145, buyY);
        } else {
          buyKeys.forEach((mType) => {
            const data = entry.buyBreakdown[mType];
            doc.text(`${mType}: ${data.qty.toFixed(1)}L / Rs. ${data.val.toLocaleString()}`, 145, buyY);
            buyY += 12;
          });
        }

        let sellY = yPosition;
        if (sellKeys.length === 0) {
          doc.text('-', 310, sellY);
        } else {
          sellKeys.forEach((mType) => {
            const data = entry.sellBreakdown[mType];
            doc.text(`${mType}: ${data.qty.toFixed(1)}L / Rs. ${data.val.toLocaleString()}`, 310, sellY);
            sellY += 12;
          });
        }

        if (entry.paymentVal > 0) {
          doc.text(`Rs. ${entry.paymentVal.toLocaleString()}`, 475, yPosition);
        } else {
          doc.text('-', 475, yPosition);
        }

        yPosition += rowHeight;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).lineWidth(0.5).stroke();
        yPosition += 6;
      }
    }

    const slotSummary: {
      morning: {
        buy: { [milkType: string]: { qty: number; val: number } };
        sell: { [milkType: string]: { qty: number; val: number } };
      };
      evening: {
        buy: { [milkType: string]: { qty: number; val: number } };
        sell: { [milkType: string]: { qty: number; val: number } };
      };
    } = {
      morning: { buy: {}, sell: {} },
      evening: { buy: {}, sell: {} },
    };

    ledgerEntriesRaw.forEach((entry) => {
      const slot = (entry.slot || 'morning').toLowerCase() === 'evening' ? 'evening' : 'morning';
      const type = entry.type === 'buy' ? 'buy' : 'sell';
      const mType = entry.milkType || 'Buffalo';
      const qty = Number(entry.quantityLiters || 0);
      const val = Number(entry.totalPrice || 0);

      if (qty > 0) {
        if (!slotSummary[slot][type][mType]) {
          slotSummary[slot][type][mType] = { qty: 0, val: 0 };
        }
        slotSummary[slot][type][mType].qty += qty;
        slotSummary[slot][type][mType].val += val;
      }
    });

    yPosition += 20;
    if (yPosition > 580) {
      doc.addPage();
      yPosition = 50;
    }

    doc.fontSize(10).fillColor(slateDark).text('🥛 SHIFT-WISE & MILK-TYPE TOTALS SUMMARY', 50, yPosition);
    yPosition += 15;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
    yPosition += 8;

    doc.fontSize(9).fillColor(slateDark).text('🌅 Morning TOTALS', 55, yPosition, { underline: true });
    doc.text('🌃 Evening TOTALS', 300, yPosition, { underline: true });
    yPosition += 15;

    let mornY = yPosition;
    let eveY = yPosition;

    doc.fontSize(8.5).fillColor(slateLight).text('Buy (Procurement):', 55, mornY);
    mornY += 10;
    doc.fillColor('#334155');
    const mornBuyKeys = Object.keys(slotSummary.morning.buy);
    if (mornBuyKeys.length === 0) {
      doc.text('-', 65, mornY);
      mornY += 12;
    } else {
      mornBuyKeys.forEach((mType) => {
        const data = slotSummary.morning.buy[mType];
        doc.text(`${mType}: ${data.qty.toFixed(1)}L / Rs. ${data.val.toLocaleString()}`, 65, mornY);
        mornY += 12;
      });
    }

    mornY += 4;
    doc.fillColor(slateLight).text('Sell (Distribution):', 55, mornY);
    mornY += 10;
    doc.fillColor('#334155');
    const mornSellKeys = Object.keys(slotSummary.morning.sell);
    if (mornSellKeys.length === 0) {
      doc.text('-', 65, mornY);
      mornY += 12;
    } else {
      mornSellKeys.forEach((mType) => {
        const data = slotSummary.morning.sell[mType];
        doc.text(`${mType}: ${data.qty.toFixed(1)}L / Rs. ${data.val.toLocaleString()}`, 65, mornY);
        mornY += 12;
      });
    }

    doc.fontSize(8.5).fillColor(slateLight).text('Buy (Procurement):', 300, eveY);
    eveY += 10;
    doc.fillColor('#334155');
    const eveBuyKeys = Object.keys(slotSummary.evening.buy);
    if (eveBuyKeys.length === 0) {
      doc.text('-', 310, eveY);
      eveY += 12;
    } else {
      eveBuyKeys.forEach((mType) => {
        const data = slotSummary.evening.buy[mType];
        doc.text(`${mType}: ${data.qty.toFixed(1)}L / Rs. ${data.val.toLocaleString()}`, 310, eveY);
        eveY += 12;
      });
    }

    eveY += 4;
    doc.fillColor(slateLight).text('Sell (Distribution):', 300, eveY);
    eveY += 10;
    doc.fillColor('#334155');
    const eveSellKeys = Object.keys(slotSummary.evening.sell);
    if (eveSellKeys.length === 0) {
      doc.text('-', 310, eveY);
      eveY += 12;
    } else {
      eveSellKeys.forEach((mType) => {
        const data = slotSummary.evening.sell[mType];
        doc.text(`${mType}: ${data.qty.toFixed(1)}L / Rs. ${data.val.toLocaleString()}`, 310, eveY);
        eveY += 12;
      });
    }

    doc.fontSize(7).fillColor('#a1a1aa').text(
      'Disclaimer: This is a digital system generated copy. No physical signature is required. All payments are verified manually by the Milkman.',
      50,
      775,
      { align: 'center', width: 495 }
    );
  }

  async getBillData(
    userId: string,
    milkmanId: string,
    dateRange: { startDate?: string; endDate?: string; month?: string },
    requestUserRole: string,
    targetRole?: string
  ) {
    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const mapping = await this.milkmanCustomerRepository.findOne({
      where: { customerId: userId, milkmanId: In(milkmanIds) },
    });
    const targetMilkmanId = mapping ? mapping.milkmanId : milkmanId;

    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;
    let isLocked = false;

    if (dateRange.startDate && dateRange.endDate) {
      startDate = new Date(dateRange.startDate + 'T00:00:00Z');
      endDate = new Date(dateRange.endDate + 'T23:59:59Z');
      periodLabel = `${dateRange.startDate} to ${dateRange.endDate}`;
      isLocked = true;
    } else if (dateRange.month) {
      const [monthStr, yearStr] = dateRange.month.split('-');
      const m = parseInt(monthStr, 10) - 1;
      const y = parseInt(yearStr, 10);
      startDate = new Date(Date.UTC(y, m, 1));
      endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      periodLabel = dateRange.month;
      isLocked = await this.isDateLocked(targetMilkmanId, `${yearStr}-${monthStr}-01`);
    } else {
      throw new NotFoundException('Either startDate/endDate or month must be provided');
    }

    if (!isLocked && requestUserRole !== 'milkman') {
      throw new ForbiddenException('Bill not generated yet by Milkman');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeLayoutRole = targetRole || (mapping ? mapping.relationshipRole : (user.role === 'both' ? 'both' : user.role));

    const ledgerEntriesRaw = await this.dailyLedgerRepository.find({
      where: { userId, milkmanId: In(milkmanIds), date: Between(startDate, endDate) },
      order: { date: 'ASC', slot: 'ASC' },
    });

    const paymentEntriesRaw = await this.paymentsLedgerRepository.find({
      where: { userId, recordedBy: In(milkmanIds), date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    return {
      periodLabel,
      isLocked,
      user: {
        name: user.name,
        mobileNumber: user.mobileNumber,
        address: user.address,
        role: user.role
      },
      activeLayoutRole,
      ledgerEntries: ledgerEntriesRaw,
      paymentEntries: paymentEntriesRaw,
    };
  }
}
