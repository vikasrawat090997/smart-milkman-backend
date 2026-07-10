import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BillLock } from '../entities/bill-lock.entity';
import { User } from '../entities/user.entity';
import { DailyLedger } from '../entities/daily-ledger.entity';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
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
  ) {}

  async lockMonth(milkmanId: string, monthYear: string, isLocked: boolean) {
    let lock = await this.billLockRepository.findOne({
      where: { monthYear, milkmanId },
    });
    if (lock) {
      lock.isLocked = isLocked;
    } else {
      lock = this.billLockRepository.create({
        monthYear,
        milkmanId,
        isLocked,
      });
    }
    return this.billLockRepository.save(lock);
  }

  async getLockStatus(milkmanId: string, monthYear: string): Promise<boolean> {
    const lock = await this.billLockRepository.findOne({
      where: { monthYear, milkmanId },
    });
    return lock ? lock.isLocked : false;
  }

  async getLocks(milkmanId: string) {
    return this.billLockRepository.find({
      where: { milkmanId },
    });
  }

  async generateBillPdf(res: any, userId: string, milkmanId: string, month: string, requestUserRole: string, targetRole?: string) {
    // 1. Verify lock status
    const isLocked = await this.getLockStatus(milkmanId, month);
    
    // Non-milkman roles can ONLY download locked bills
    if (!isLocked && requestUserRole !== 'milkman') {
      throw new ForbiddenException('Bill not generated yet by Milkman');
    }

    // 2. Fetch User details
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeLayoutRole = targetRole || (user.role === 'both' ? 'farmer' : user.role);

    // 3. Parse month string MM-YYYY to date ranges
    const [monthStr, yearStr] = month.split('-');
    const m = parseInt(monthStr, 10) - 1;
    const y = parseInt(yearStr, 10);
    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

    // Fetch ledger logs inside the month for this milkman
    const ledgerEntriesRaw = await this.dailyLedgerRepository.find({
      where: { userId, milkmanId, date: Between(startDate, endDate) },
      order: { date: 'ASC', slot: 'ASC' },
    });

    // Fetch payments inside the month recorded by this milkman
    const paymentEntriesRaw = await this.paymentsLedgerRepository.find({
      where: { userId, recordedBy: milkmanId, date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    const ledgerEntries = ledgerEntriesRaw.filter(item => {
      const isBuyType = item.type.startsWith('BUY');
      const isSellType = item.type.startsWith('SELL');
      if (activeLayoutRole === 'farmer' && isBuyType) return false;
      if (activeLayoutRole === 'consumer' && isSellType) return false;
      return true;
    });

    const paymentEntries = paymentEntriesRaw.filter(item => {
      const pRole = item.targetRole || user.role;
      if (pRole === activeLayoutRole || pRole === 'both') return true;
      return false;
    });

    // 4. Instantiate PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Pipe output to the HTTP response stream directly
    doc.pipe(res);

    // Document styling parameters
    const slateDark = '#0f172a';
    const slateLight = '#64748b';
    const borderGray = '#e2e8f0';

    // Invoice Header
    doc.fillColor(slateDark).fontSize(22).text('SMART DHUDHIYA', 50, 50, { align: 'left' });
    doc.fontSize(9).fillColor(slateLight).text('Zero-Cost Milk Delivery Management System', 50, 75);
    
    doc.fontSize(14).fillColor(slateDark).text(`MILK BILL STATEMENT`, 400, 50, { align: 'right' });
    doc.fontSize(10).fillColor(slateLight).text(`Billing Period: ${month}`, 400, 68, { align: 'right' });
    doc.text(`Lock Status: ${isLocked ? 'LOCKED' : 'UNLOCKED / PREVIEW'}`, 400, 82, { align: 'right' });

    // Top border line
    doc.moveTo(50, 100).lineTo(545, 100).strokeColor(borderGray).stroke();

    // Calculate invoice totals
    const totalQty = ledgerEntries.reduce((sum, item) => sum + Number(item.quantityLiters), 0);
    const totalVal = ledgerEntries.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const totalPaid = paymentEntries.reduce((sum, item) => sum + Number(item.amountPaid), 0);
    const monthlyNet = totalVal - totalPaid;

    // Billing and Summary block
    doc.fillColor(slateDark).fontSize(11).text('BILL TO:', 50, 115);
    doc.fontSize(9).text(`Name: ${user.name}`, 50, 130);
    doc.text(`Mobile: ${user.mobileNumber}`, 50, 143);
    doc.text(`Role: ${activeLayoutRole.toUpperCase()}`, 50, 156);
    if (user.address) {
      doc.text(`Address: ${user.address}`, 50, 169, { width: 220 });
    }

    doc.fillColor(slateDark).fontSize(11).text('ACCOUNT SUMMARY:', 330, 115);
    doc.fontSize(9).text(`Total Milk Volume: ${totalQty.toFixed(2)} Liters`, 330, 130);
    doc.text(`Total Value: Rs. ${totalVal.toFixed(2)}`, 330, 143);
    doc.text(`Total Paid/Received: Rs. ${totalPaid.toFixed(2)}`, 330, 156);
    
    // Highlight balance due/advance
    let balanceLabel = 'Net Due (Udhari)';
    let highlightColor = '#dc2626'; // red
    if (activeLayoutRole === 'farmer') {
      balanceLabel = monthlyNet >= 0 ? 'Payout Outstanding' : 'Advance Paid';
      highlightColor = monthlyNet >= 0 ? '#0f172a' : '#16a34a';
    } else {
      // consumer
      balanceLabel = monthlyNet >= 0 ? 'Due Amount (Udhari)' : 'Wallet Advance';
      highlightColor = monthlyNet >= 0 ? '#dc2626' : '#16a34a';
    }
    doc.fillColor(slateDark).text(`${balanceLabel}: `, 330, 169);
    doc.fillColor(highlightColor).text(`Rs. ${Math.abs(monthlyNet).toFixed(2)}`, 450, 169);

    // Divider
    doc.moveTo(50, 205).lineTo(545, 205).strokeColor(borderGray).stroke();

    // Table of Milk Deliveries
    let yPosition = 220;
    doc.fontSize(11).fillColor(slateDark).text('DAILY LEDGER ENTRIES', 50, yPosition);
    yPosition += 18;

    // Draw header row
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
    yPosition += 6;
    doc.fontSize(9).fillColor(slateDark);
    doc.text('Date', 55, yPosition);
    doc.text('Shift', 150, yPosition);
    doc.text('Quantity (Ltr)', 250, yPosition);
    doc.text('Rate / Ltr', 350, yPosition);
    doc.text('Total (Rs.)', 460, yPosition);
    yPosition += 12;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
    yPosition += 8;

    // Entries rows
    doc.fillColor('#334155');
    for (const entry of ledgerEntries) {
      if (yPosition > 720) {
        doc.addPage();
        yPosition = 50;
        
        // Redraw table headers on new page
        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
        yPosition += 6;
        doc.fontSize(9).fillColor(slateDark);
        doc.text('Date', 55, yPosition);
        doc.text('Shift', 150, yPosition);
        doc.text('Quantity (Ltr)', 250, yPosition);
        doc.text('Rate / Ltr', 350, yPosition);
        doc.text('Total (Rs.)', 460, yPosition);
        yPosition += 12;
        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
        yPosition += 8;
        doc.fillColor('#334155');
      }

      const dateString = new Date(entry.date).toISOString().split('T')[0];
      doc.text(dateString, 55, yPosition);
      doc.text(entry.slot.toUpperCase(), 150, yPosition);
      doc.text(Number(entry.quantityLiters).toFixed(2), 250, yPosition);
      doc.text(`Rs. ${Number(entry.rateApplied).toFixed(2)}`, 350, yPosition);
      doc.text(`Rs. ${Number(entry.totalPrice).toFixed(2)}`, 460, yPosition);

      yPosition += 16;
    }

    // Table of Payments
    if (paymentEntries.length > 0) {
      yPosition += 20;
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      doc.fontSize(11).fillColor(slateDark).text('PAYMENTS TRANSACTION HISTORY', 50, yPosition);
      yPosition += 18;

      doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
      yPosition += 6;
      doc.fontSize(9).fillColor(slateDark);
      doc.text('Date', 55, yPosition);
      doc.text('Payment Mode', 250, yPosition);
      doc.text('Amount Received / Paid (Rs.)', 400, yPosition);
      yPosition += 12;
      doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
      yPosition += 8;

      doc.fillColor('#334155');
      for (const pay of paymentEntries) {
        if (yPosition > 720) {
          doc.addPage();
          yPosition = 50;
          
          doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
          yPosition += 6;
          doc.fontSize(9).fillColor(slateDark);
          doc.text('Date', 55, yPosition);
          doc.text('Payment Mode', 250, yPosition);
          doc.text('Amount Received / Paid (Rs.)', 400, yPosition);
          yPosition += 12;
          doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
          yPosition += 8;
          doc.fillColor('#334155');
        }

        const payDateString = new Date(pay.date).toISOString().split('T')[0];
        doc.text(payDateString, 55, yPosition);
        doc.text(pay.paymentMode.toUpperCase(), 250, yPosition);
        doc.text(`Rs. ${Number(pay.amountPaid).toFixed(2)}`, 400, yPosition);

        yPosition += 16;
      }
    }

    // Static warning note/footer at the bottom of the last page
    doc.fontSize(7).fillColor('#a1a1aa').text(
      'Disclaimer: This is a digital system generated copy. No physical signature is required. All payments are verified manually by the Milkman.',
      50,
      765,
      { align: 'center', width: 495 }
    );

    doc.end();
  }
}
