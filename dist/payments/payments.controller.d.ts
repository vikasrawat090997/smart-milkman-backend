import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    createPayment(req: any, dto: CreatePaymentDto): Promise<import("../entities/payments-ledger.entity").PaymentsLedger>;
    updatePayment(id: string, dto: {
        amountPaid?: number;
        date?: string;
        paymentMode?: string;
    }): Promise<import("../entities/payments-ledger.entity").PaymentsLedger>;
    getPaymentsForUser(userId: string): Promise<import("../entities/payments-ledger.entity").PaymentsLedger[]>;
}
