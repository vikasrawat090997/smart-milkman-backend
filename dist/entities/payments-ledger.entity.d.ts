import { User } from './user.entity';
import { PaymentEditHistory } from './payment-edit-history.entity';
export declare enum PaymentMode {
    CASH = "cash",
    MANUAL_UPI = "manual_upi"
}
export declare class PaymentsLedger {
    id: string;
    userId: string;
    date: Date;
    amountPaid: number;
    paymentMode: PaymentMode;
    targetRole: string;
    recordedBy: string;
    user: User;
    recorder: User;
    editHistory: PaymentEditHistory[];
}
