import { User } from './user.entity';
export declare class BillLock {
    id: string;
    startDate: Date;
    endDate: Date;
    milkmanId: string;
    userId?: string | null;
    isLocked: boolean;
    lockedAt: Date;
    milkman: User;
}
