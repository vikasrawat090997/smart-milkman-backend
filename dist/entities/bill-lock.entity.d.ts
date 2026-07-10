import { User } from './user.entity';
export declare class BillLock {
    id: string;
    monthYear: string;
    milkmanId: string;
    isLocked: boolean;
    lockedAt: Date;
    milkman: User;
}
