import { PaymentMode } from '../../entities/payments-ledger.entity';
export declare class CreatePaymentDto {
    userId: string;
    date: string;
    amountPaid: number;
    paymentMode: PaymentMode;
    targetRole: string;
}
