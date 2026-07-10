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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bill_lock_entity_1 = require("../entities/bill-lock.entity");
const user_entity_1 = require("../entities/user.entity");
const daily_ledger_entity_1 = require("../entities/daily-ledger.entity");
const payments_ledger_entity_1 = require("../entities/payments-ledger.entity");
const pdfkit_1 = __importDefault(require("pdfkit"));
let BillService = class BillService {
    billLockRepository;
    userRepository;
    dailyLedgerRepository;
    paymentsLedgerRepository;
    constructor(billLockRepository, userRepository, dailyLedgerRepository, paymentsLedgerRepository) {
        this.billLockRepository = billLockRepository;
        this.userRepository = userRepository;
        this.dailyLedgerRepository = dailyLedgerRepository;
        this.paymentsLedgerRepository = paymentsLedgerRepository;
    }
    async lockMonth(milkmanId, monthYear, isLocked) {
        let lock = await this.billLockRepository.findOne({
            where: { monthYear, milkmanId },
        });
        if (lock) {
            lock.isLocked = isLocked;
        }
        else {
            lock = this.billLockRepository.create({
                monthYear,
                milkmanId,
                isLocked,
            });
        }
        return this.billLockRepository.save(lock);
    }
    async getLockStatus(milkmanId, monthYear) {
        const lock = await this.billLockRepository.findOne({
            where: { monthYear, milkmanId },
        });
        return lock ? lock.isLocked : false;
    }
    async getLocks(milkmanId) {
        return this.billLockRepository.find({
            where: { milkmanId },
        });
    }
    async generateBillPdf(res, userId, milkmanId, month, requestUserRole, targetRole) {
        const isLocked = await this.getLockStatus(milkmanId, month);
        if (!isLocked && requestUserRole !== 'milkman') {
            throw new common_1.ForbiddenException('Bill not generated yet by Milkman');
        }
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const activeLayoutRole = targetRole || (user.role === 'both' ? 'farmer' : user.role);
        const [monthStr, yearStr] = month.split('-');
        const m = parseInt(monthStr, 10) - 1;
        const y = parseInt(yearStr, 10);
        const startDate = new Date(Date.UTC(y, m, 1));
        const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const ledgerEntriesRaw = await this.dailyLedgerRepository.find({
            where: { userId, milkmanId, date: (0, typeorm_2.Between)(startDate, endDate) },
            order: { date: 'ASC', slot: 'ASC' },
        });
        const paymentEntriesRaw = await this.paymentsLedgerRepository.find({
            where: { userId, recordedBy: milkmanId, date: (0, typeorm_2.Between)(startDate, endDate) },
            order: { date: 'ASC' },
        });
        const ledgerEntries = ledgerEntriesRaw.filter(item => {
            const isBuyType = item.type.startsWith('BUY');
            const isSellType = item.type.startsWith('SELL');
            if (activeLayoutRole === 'farmer' && isBuyType)
                return false;
            if (activeLayoutRole === 'consumer' && isSellType)
                return false;
            return true;
        });
        const paymentEntries = paymentEntriesRaw.filter(item => {
            const pRole = item.targetRole || user.role;
            if (pRole === activeLayoutRole || pRole === 'both')
                return true;
            return false;
        });
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        const slateDark = '#0f172a';
        const slateLight = '#64748b';
        const borderGray = '#e2e8f0';
        doc.fillColor(slateDark).fontSize(22).text('SMART DHUDHIYA', 50, 50, { align: 'left' });
        doc.fontSize(9).fillColor(slateLight).text('Zero-Cost Milk Delivery Management System', 50, 75);
        doc.fontSize(14).fillColor(slateDark).text(`MILK BILL STATEMENT`, 400, 50, { align: 'right' });
        doc.fontSize(10).fillColor(slateLight).text(`Billing Period: ${month}`, 400, 68, { align: 'right' });
        doc.text(`Lock Status: ${isLocked ? 'LOCKED' : 'UNLOCKED / PREVIEW'}`, 400, 82, { align: 'right' });
        doc.moveTo(50, 100).lineTo(545, 100).strokeColor(borderGray).stroke();
        const totalQty = ledgerEntries.reduce((sum, item) => sum + Number(item.quantityLiters), 0);
        const totalVal = ledgerEntries.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        const totalPaid = paymentEntries.reduce((sum, item) => sum + Number(item.amountPaid), 0);
        const monthlyNet = totalVal - totalPaid;
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
        let balanceLabel = 'Net Due (Udhari)';
        let highlightColor = '#dc2626';
        if (activeLayoutRole === 'farmer') {
            balanceLabel = monthlyNet >= 0 ? 'Payout Outstanding' : 'Advance Paid';
            highlightColor = monthlyNet >= 0 ? '#0f172a' : '#16a34a';
        }
        else {
            balanceLabel = monthlyNet >= 0 ? 'Due Amount (Udhari)' : 'Wallet Advance';
            highlightColor = monthlyNet >= 0 ? '#dc2626' : '#16a34a';
        }
        doc.fillColor(slateDark).text(`${balanceLabel}: `, 330, 169);
        doc.fillColor(highlightColor).text(`Rs. ${Math.abs(monthlyNet).toFixed(2)}`, 450, 169);
        doc.moveTo(50, 205).lineTo(545, 205).strokeColor(borderGray).stroke();
        let yPosition = 220;
        doc.fontSize(11).fillColor(slateDark).text('DAILY LEDGER ENTRIES', 50, yPosition);
        yPosition += 18;
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
        doc.fillColor('#334155');
        for (const entry of ledgerEntries) {
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
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
        doc.fontSize(7).fillColor('#a1a1aa').text('Disclaimer: This is a digital system generated copy. No physical signature is required. All payments are verified manually by the Milkman.', 50, 765, { align: 'center', width: 495 });
        doc.end();
    }
};
exports.BillService = BillService;
exports.BillService = BillService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bill_lock_entity_1.BillLock)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(daily_ledger_entity_1.DailyLedger)),
    __param(3, (0, typeorm_1.InjectRepository)(payments_ledger_entity_1.PaymentsLedger)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BillService);
//# sourceMappingURL=bill.service.js.map