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
            createdAt: Date;
        };
    }>;
    getProfile(req: any): any;
}
