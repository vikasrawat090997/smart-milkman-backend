import { PaymentsLedger } from './payments-ledger.entity';
export declare class PaymentEditHistory {
    id: string;
    paymentId: string;
    oldAmount: number;
    newAmount: number;
    oldDate: Date;
    newDate: Date;
    oldPaymentMode: string;
    newPaymentMode: string;
    editedAt: Date;
    payment: PaymentsLedger;
}
