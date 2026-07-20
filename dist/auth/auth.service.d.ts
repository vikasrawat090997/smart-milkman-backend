import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private userRepository;
    private jwtService;
    constructor(userRepository: Repository<User>, jwtService: JwtService);
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
            parentMilkmanId: string;
        }[];
    }>;
    private generateLoginResponse;
}
