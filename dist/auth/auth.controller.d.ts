import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            mobileNumber: string;
            role: import("../entities/user.entity").Role;
            address: string;
            parentMilkmanId: string;
            createdAt: Date;
        };
    } | {
        selectRole: boolean;
        options: {
            id: string;
            name: string;
            role: import("../entities/user.entity").Role;
            mobileNumber: string;
        }[];
    }>;
    getProfile(req: any): any;
}
