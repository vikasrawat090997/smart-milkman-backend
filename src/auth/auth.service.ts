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
    const { mobileNumber, passwordPin } = loginDto;
    
    // Look up the user using TypeORM
    const user = await this.userRepository.findOne({
      where: { mobileNumber },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid mobile number or PIN');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify hashed 4-digit PIN
    const isPinValid = await bcrypt.compare(passwordPin, user.passwordPin);
    if (!isPinValid) {
      throw new UnauthorizedException('Invalid mobile number or PIN');
    }

    // Generate JWT payload
    const payload = { sub: user.id, mobileNumber: user.mobileNumber, role: user.role };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        address: user.address,
        createdAt: user.createdAt,
      },
    };
  }
}
