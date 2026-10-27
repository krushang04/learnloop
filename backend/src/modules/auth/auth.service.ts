import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { UsersService } from 'src/modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';

export interface AuthResult {
  accessToken: string;
  expiresIn: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // One generic message for "no such user" and "wrong password" — telling
    // them apart would let anyone enumerate registered emails.
    const passwordMatches = user
      ? await this.usersService.comparePassword(dto.password, user.password)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    return this.issueToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  /** Public signup. Always creates a learner; admins are created by seed only. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: UserRole.LEARNER,
    });

    return this.issueToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  async profile(current: AuthUser) {
    const user = await this.usersService.findByIdOrFail(current.id);
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private issueToken(user: AuthResult['user']): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: this.config.get<string>('jwt.expiresIn')!,
      user,
    };
  }
}
