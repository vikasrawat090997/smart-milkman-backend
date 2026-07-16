import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { mobileNumber, passwordPin, role } = loginDto;
    
    // Find all users matching the mobile number
    const users = await this.userRepository.find({
      where: { mobileNumber },
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid mobile number or PIN');
    }

    const activeUsers = users.filter(u => u.isActive);
    if (activeUsers.length === 0) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify hashed PIN against matching active accounts
    const matchingUsers: User[] = [];
    for (const u of activeUsers) {
      const isPinValid = await bcrypt.compare(passwordPin, u.passwordPin);
      if (isPinValid) {
        matchingUsers.push(u);
      }
    }

    if (matchingUsers.length === 0) {
      throw new UnauthorizedException('Invalid mobile number or PIN');
    }

    // If multiple active users match the PIN:
    if (matchingUsers.length > 1) {
      if (role) {
        const chosenUser = matchingUsers.find(u => u.role === role);
        if (chosenUser) {
          return this.generateLoginResponse(chosenUser);
        }
      }
      return {
        selectRole: true,
        options: matchingUsers.map(u => ({
          id: u.id,
          name: u.name,
          role: u.role,
          mobileNumber: u.mobileNumber,
        })),
      };
    }

    // Exactly one matching account
    return this.generateLoginResponse(matchingUsers[0]);
  }

  private generateLoginResponse(user: User) {
    const payload = { sub: user.id, mobileNumber: user.mobileNumber, role: user.role };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        address: user.address,
        parentMilkmanId: user.parentMilkmanId,
        createdAt: user.createdAt,
      },
    };
  }
}
