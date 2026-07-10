import { Repository } from 'typeorm';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { User } from '../entities/user.entity';
import { PaymentEditHistory } from '../entities/payment-edit-history.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsService {
    private paymentsLedgerRepository;
    private userRepository;
    private paymentEditHistoryRepository;
    constructor(paymentsLedgerRepository: Repository<PaymentsLedger>, userRepository: Repository<User>, paymentEditHistoryRepository: Repository<PaymentEditHistory>);
    createPayment(recordedByUserId: string, dto: CreatePaymentDto): Promise<PaymentsLedger>;
    updatePayment(id: string, dto: {
        amountPaid?: number;
        date?: string;
        paymentMode?: string;
    }): Promise<PaymentsLedger>;
    getPaymentsForUser(userId: string): Promise<PaymentsLedger[]>;
}
