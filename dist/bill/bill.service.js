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
const milkman_customer_entity_1 = require("../entities/milkman-customer.entity");
const pdfkit_1 = __importDefault(require("pdfkit"));
let BillService = class BillService {
    billLockRepository;
    userRepository;
    dailyLedgerRepository;
    paymentsLedgerRepository;
    milkmanCustomerRepository;
    constructor(billLockRepository, userRepository, dailyLedgerRepository, paymentsLedgerRepository, milkmanCustomerRepository) {
        this.billLockRepository = billLockRepository;
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
        const user = await this.userRepository.findOne({ where: { id: milkmanId } });
        const targetMilkmanId = (user && user.parentMilkmanId) ? user.parentMilkmanId : milkmanId;
        const lock = await this.billLockRepository.findOne({
            where: { monthYear, milkmanId: targetMilkmanId },
        });
        return lock ? lock.isLocked : false;
    }
    async getLocks(milkmanId) {
        return this.billLockRepository.find({
            where: { milkmanId },
        });
    }
    async generateBillPdf(res, userId, milkmanId, month, requestUserRole, targetRole) {
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const mapping = await this.milkmanCustomerRepository.findOne({
            where: { customerId: userId, milkmanId: (0, typeorm_2.In)(milkmanIds) },
        });
        const targetMilkmanId = mapping ? mapping.milkmanId : milkmanId;
        const isLocked = await this.getLockStatus(targetMilkmanId, month);
        if (!isLocked && requestUserRole !== 'milkman') {
            throw new common_1.ForbiddenException('Bill not generated yet by Milkman');
        }
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const activeLayoutRole = targetRole || (mapping ? mapping.relationshipRole : (user.role === 'both' ? 'both' : user.role));
        const [monthStr, yearStr] = month.split('-');
        const m = parseInt(monthStr, 10) - 1;
        const y = parseInt(yearStr, 10);
        const startDate = new Date(Date.UTC(y, m, 1));
        const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const ledgerEntriesRaw = await this.dailyLedgerRepository.find({
            where: { userId, milkmanId: (0, typeorm_2.In)(milkmanIds), date: (0, typeorm_2.Between)(startDate, endDate) },
            order: { date: 'ASC', slot: 'ASC' },
        });
        const paymentEntriesRaw = await this.paymentsLedgerRepository.find({
            where: { userId, recordedBy: (0, typeorm_2.In)(milkmanIds), date: (0, typeorm_2.Between)(startDate, endDate) },
            order: { date: 'ASC' },
        });
        const slateDark = '#0f172a';
        const slateLight = '#64748b';
        const borderGray = '#e2e8f0';
        const emeraldGreen = '#16a34a';
        const roseRed = '#dc2626';
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        doc.pipe(res);
        doc.fillColor(slateDark).fontSize(20).text('SMART DHUDHIYA', 50, 50, { align: 'left' });
        doc.fontSize(8).fillColor(slateLight).text('Zero-Cost Dairy Ledger & Delivery System', 50, 72);
        doc.fontSize(13).fillColor(slateDark).text('ACCOUNT STATEMENT', 380, 50, { align: 'right' });
        doc.fontSize(9).fillColor(slateLight).text(`Period: ${month}`, 380, 66, { align: 'right' });
        doc.text(`Status: ${isLocked ? 'OFFICIAL INVOICE' : 'UNLOCKED PREVIEW'}`, 380, 78, { align: 'right' });
        doc.moveTo(50, 95).lineTo(545, 95).strokeColor(borderGray).stroke();
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
            }
            else if (netOverall === 0) {
                balanceLabel = 'Account Balance';
                balanceColor = slateLight;
            }
            doc.fillColor(slateDark).text(`${balanceLabel}: `, 320, 178);
            doc.fillColor(balanceColor).text(`Rs. ${Math.abs(netOverall).toFixed(2)}`, 440, 178);
            doc.moveTo(50, 195).lineTo(545, 195).strokeColor(borderGray).stroke();
            let yPosition = 210;
            doc.fontSize(10).fillColor(slateDark).text('🌾 SELLER / PROCUREMENT MILK LEDGER', 50, yPosition);
            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
            yPosition += 5;
            doc.fontSize(8).fillColor(slateDark);
            doc.text('Date', 55, yPosition);
            doc.text('Shift', 150, yPosition);
            doc.text('Quantity (Ltr)', 250, yPosition);
            doc.text('Rate / Ltr', 350, yPosition);
            doc.text('Total (Rs.)', 460, yPosition);
            yPosition += 10;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
            yPosition += 6;
            doc.fillColor('#334155');
            if (buyEntries.length === 0) {
                doc.text('No procurement entries recorded this month.', 55, yPosition);
                yPosition += 16;
            }
            else {
                for (const entry of buyEntries) {
                    if (yPosition > 720) {
                        doc.addPage();
                        yPosition = 50;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
                        yPosition += 5;
                        doc.fontSize(8).fillColor(slateDark);
                        doc.text('Date', 55, yPosition);
                        doc.text('Shift', 150, yPosition);
                        doc.text('Quantity (Ltr)', 250, yPosition);
                        doc.text('Rate / Ltr', 350, yPosition);
                        doc.text('Total (Rs.)', 460, yPosition);
                        yPosition += 10;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
                        yPosition += 6;
                        doc.fillColor('#334155');
                    }
                    const dateStr = new Date(entry.date).toISOString().split('T')[0];
                    doc.text(dateStr, 55, yPosition);
                    doc.text(entry.slot.toUpperCase(), 150, yPosition);
                    doc.text(Number(entry.quantityLiters).toFixed(2), 250, yPosition);
                    doc.text(`Rs. ${Number(entry.rateApplied).toFixed(2)}`, 350, yPosition);
                    doc.text(`Rs. ${Number(entry.totalPrice).toFixed(2)}`, 460, yPosition);
                    yPosition += 14;
                }
            }
            yPosition += 15;
            if (yPosition > 650) {
                doc.addPage();
                yPosition = 50;
            }
            doc.fontSize(10).fillColor(slateDark).text('🥛 BUYER / DISTRIBUTION MILK LEDGER', 50, yPosition);
            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
            yPosition += 5;
            doc.fontSize(8).fillColor(slateDark);
            doc.text('Date', 55, yPosition);
            doc.text('Shift', 150, yPosition);
            doc.text('Quantity (Ltr)', 250, yPosition);
            doc.text('Rate / Ltr', 350, yPosition);
            doc.text('Total (Rs.)', 460, yPosition);
            yPosition += 10;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
            yPosition += 6;
            doc.fillColor('#334155');
            if (sellEntries.length === 0) {
                doc.text('No distribution entries recorded this month.', 55, yPosition);
                yPosition += 16;
            }
            else {
                for (const entry of sellEntries) {
                    if (yPosition > 720) {
                        doc.addPage();
                        yPosition = 50;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
                        yPosition += 5;
                        doc.fontSize(8).fillColor(slateDark);
                        doc.text('Date', 55, yPosition);
                        doc.text('Shift', 150, yPosition);
                        doc.text('Quantity (Ltr)', 250, yPosition);
                        doc.text('Rate / Ltr', 350, yPosition);
                        doc.text('Total (Rs.)', 460, yPosition);
                        yPosition += 10;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
                        yPosition += 6;
                        doc.fillColor('#334155');
                    }
                    const dateStr = new Date(entry.date).toISOString().split('T')[0];
                    doc.text(dateStr, 55, yPosition);
                    doc.text(entry.slot.toUpperCase(), 150, yPosition);
                    doc.text(Number(entry.quantityLiters).toFixed(2), 250, yPosition);
                    doc.text(`Rs. ${Number(entry.rateApplied).toFixed(2)}`, 350, yPosition);
                    doc.text(`Rs. ${Number(entry.totalPrice).toFixed(2)}`, 460, yPosition);
                    yPosition += 14;
                }
            }
            yPosition += 15;
            if (yPosition > 650) {
                doc.addPage();
                yPosition = 50;
            }
            doc.fontSize(10).fillColor(slateDark).text('💸 PAYMENTS & payouts HISTORICAL LOG', 50, yPosition);
            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
            yPosition += 5;
            doc.fontSize(8).fillColor(slateDark);
            doc.text('Date', 55, yPosition);
            doc.text('Payment Category', 150, yPosition);
            doc.text('Payment Mode', 320, yPosition);
            doc.text('Amount (Rs.)', 450, yPosition);
            yPosition += 10;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
            yPosition += 6;
            doc.fillColor('#334155');
            if (paymentEntriesRaw.length === 0) {
                doc.text('No payment history log recorded this month.', 55, yPosition);
                yPosition += 16;
            }
            else {
                for (const pay of paymentEntriesRaw) {
                    if (yPosition > 720) {
                        doc.addPage();
                        yPosition = 50;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
                        yPosition += 5;
                        doc.fontSize(8).fillColor(slateDark);
                        doc.text('Date', 55, yPosition);
                        doc.text('Payment Category', 150, yPosition);
                        doc.text('Payment Mode', 320, yPosition);
                        doc.text('Amount (Rs.)', 450, yPosition);
                        yPosition += 10;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
                        yPosition += 6;
                        doc.fillColor('#334155');
                    }
                    const payDateString = new Date(pay.date).toISOString().split('T')[0];
                    const payRole = pay.targetRole || user.role;
                    const category = payRole === 'farmer' ? 'Payout to Farmer' : 'Collection from Consumer';
                    doc.text(payDateString, 55, yPosition);
                    doc.text(category, 150, yPosition);
                    doc.text(pay.paymentMode.toUpperCase(), 320, yPosition);
                    doc.text(`Rs. ${Number(pay.amountPaid).toFixed(2)}`, 450, yPosition);
                    yPosition += 14;
                }
            }
        }
        else {
            const ledgerEntries = ledgerEntriesRaw.filter(item => {
                const isBuyType = item.type === 'buy';
                const isSellType = item.type.startsWith('sell');
                if (activeLayoutRole === 'farmer' && isSellType)
                    return false;
                if (activeLayoutRole === 'consumer' && isBuyType)
                    return false;
                return true;
            });
            const paymentEntries = paymentEntriesRaw.filter(item => {
                const pRole = item.targetRole || user.role;
                if (pRole === activeLayoutRole || pRole === 'both')
                    return true;
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
            }
            else {
                balanceLabel = monthlyNet >= 0 ? 'Due Amount (Udhari)' : 'Wallet Advance';
                highlightColor = monthlyNet >= 0 ? roseRed : emeraldGreen;
            }
            doc.fillColor(slateDark).text(`${balanceLabel}: `, 320, 156);
            doc.fillColor(highlightColor).text(`Rs. ${Math.abs(monthlyNet).toFixed(2)}`, 440, 156);
            doc.moveTo(50, 185).lineTo(545, 185).strokeColor(borderGray).stroke();
            let yPosition = 200;
            doc.fontSize(10).fillColor(slateDark).text('DAILY LEDGER ENTRIES', 50, yPosition);
            yPosition += 15;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).lineWidth(1).stroke();
            yPosition += 5;
            doc.fontSize(8).fillColor(slateDark);
            doc.text('Date', 55, yPosition);
            doc.text('Shift', 150, yPosition);
            doc.text('Quantity (Ltr)', 250, yPosition);
            doc.text('Rate / Ltr', 350, yPosition);
            doc.text('Total (Rs.)', 460, yPosition);
            yPosition += 10;
            doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
            yPosition += 6;
            doc.fillColor('#334155');
            if (ledgerEntries.length === 0) {
                doc.text('No ledger logs recorded this month.', 55, yPosition);
                yPosition += 16;
            }
            else {
                for (const entry of ledgerEntries) {
                    if (yPosition > 720) {
                        doc.addPage();
                        yPosition = 50;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
                        yPosition += 5;
                        doc.fontSize(8).fillColor(slateDark);
                        doc.text('Date', 55, yPosition);
                        doc.text('Shift', 150, yPosition);
                        doc.text('Quantity (Ltr)', 250, yPosition);
                        doc.text('Rate / Ltr', 350, yPosition);
                        doc.text('Total (Rs.)', 460, yPosition);
                        yPosition += 10;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
                        yPosition += 6;
                        doc.fillColor('#334155');
                    }
                    const dateString = new Date(entry.date).toISOString().split('T')[0];
                    doc.text(dateString, 55, yPosition);
                    doc.text(entry.slot.toUpperCase(), 150, yPosition);
                    doc.text(Number(entry.quantityLiters).toFixed(2), 250, yPosition);
                    doc.text(`Rs. ${Number(entry.rateApplied).toFixed(2)}`, 350, yPosition);
                    doc.text(`Rs. ${Number(entry.totalPrice).toFixed(2)}`, 460, yPosition);
                    yPosition += 14;
                }
            }
            if (paymentEntries.length > 0) {
                yPosition += 15;
                if (yPosition > 650) {
                    doc.addPage();
                    yPosition = 50;
                }
                doc.fontSize(10).fillColor(slateDark).text('PAYMENTS TRANSACTION HISTORY', 50, yPosition);
                yPosition += 15;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
                yPosition += 5;
                doc.fontSize(8).fillColor(slateDark);
                doc.text('Date', 55, yPosition);
                doc.text('Payment Mode', 250, yPosition);
                doc.text('Amount (Rs.)', 400, yPosition);
                yPosition += 10;
                doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
                yPosition += 6;
                doc.fillColor('#334155');
                for (const pay of paymentEntries) {
                    if (yPosition > 720) {
                        doc.addPage();
                        yPosition = 50;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(slateDark).stroke();
                        yPosition += 5;
                        doc.fontSize(8).fillColor(slateDark);
                        doc.text('Date', 55, yPosition);
                        doc.text('Payment Mode', 250, yPosition);
                        doc.text('Amount (Rs.)', 400, yPosition);
                        yPosition += 10;
                        doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderGray).stroke();
                        yPosition += 6;
                        doc.fillColor('#334155');
                    }
                    const payDateString = new Date(pay.date).toISOString().split('T')[0];
                    doc.text(payDateString, 55, yPosition);
                    doc.text(pay.paymentMode.toUpperCase(), 250, yPosition);
                    doc.text(`Rs. ${Number(pay.amountPaid).toFixed(2)}`, 400, yPosition);
                    yPosition += 14;
                }
            }
        }
        doc.fontSize(7).fillColor('#a1a1aa').text('Disclaimer: This is a digital system generated copy. No physical signature is required. All payments are verified manually by the Milkman.', 50, 775, { align: 'center', width: 495 });
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
    __param(4, (0, typeorm_1.InjectRepository)(milkman_customer_entity_1.MilkmanCustomer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BillService);
//# sourceMappingURL=bill.service.js.map