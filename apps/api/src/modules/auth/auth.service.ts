import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { SignupInput, LoginInput, PromoteRoleInput } from './auth.dto';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import { eventBus, EVENTS } from '../../shared/events/eventBus';

export class AuthService {
  private repo = new AuthRepository();

  private generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
    const refreshToken = jwt.sign({ userId, role }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });
    return { accessToken, refreshToken };
  }

  async signup(data: SignupInput) {
    const existing = await this.repo.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.repo.createUser({ ...data, passwordHash });

    return { user, message: 'Account created successfully' };
  }

  async login(data: LoginInput) {
    const user = await this.repo.findByEmail(data.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');
    if (user.status === 'INACTIVE') throw new UnauthorizedError('Account is inactive');

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid email or password');

    const tokens = this.generateTokens(user.id, user.role);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash, refreshToken, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refresh(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; role: string };
      const user = await this.repo.findById(decoded.userId);
      if (!user) throw new UnauthorizedError('User not found');

      const tokens = this.generateTokens(decoded.userId, decoded.role);
      await this.repo.updateRefreshToken(decoded.userId, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.repo.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async promoteRole(targetUserId: string, data: PromoteRoleInput, actorId: string) {
    const user = await this.repo.findById(targetUserId);
    if (!user) throw new NotFoundError('User');

    const updated = await this.repo.promoteRole(targetUserId, data.role);

    eventBus.publish(EVENTS.ROLE_PROMOTED, {
      userId: targetUserId,
      newRole: data.role,
      promotedBy: actorId,
    });

    return updated;
  }

  async forgotPassword(email: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return { message: 'If an account exists, an OTP has been sent.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    
    await this.repo.saveResetOtp(email, otp, expires);
    
    // As per user request, log the OTP to the console instead of sending email
    console.log(`\n========================================`);
    console.log(`🔑 PASSWORD RESET OTP FOR ${email}: ${otp}`);
    console.log(`========================================\n`);

    return { message: 'If an account exists, an OTP has been sent.' };
  }

  async resetPassword(data: { email: string; otp: string; password: string }) {
    // Note: We need the full user object including OTP fields to verify,
    // so we'll fetch from prisma directly here since findByEmail might not include it if we restricted selects.
    // Actually findByEmail currently returns everything.
    const user = await this.repo.findByEmail(data.email) as any;
    
    if (!user || !user.resetPasswordOtp || !user.resetPasswordExpires) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    if (user.resetPasswordOtp !== data.otp) {
      throw new UnauthorizedError('Invalid OTP');
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      throw new UnauthorizedError('OTP has expired');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    await this.repo.resetPassword(data.email, passwordHash);

    return { message: 'Password has been reset successfully' };
  }
}
