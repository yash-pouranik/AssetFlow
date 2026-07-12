import { prisma } from '../../shared/prisma/client';
import { SignupInput } from './auth.dto';

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });
  }

  async createUser(data: SignupInput & { passwordHash: string }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateRefreshToken(userId: string, token: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  async promoteRole(userId: string, role: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async saveResetOtp(email: string, otp: string, expires: Date) {
    return prisma.user.update({
      where: { email },
      data: { resetPasswordOtp: otp, resetPasswordExpires: expires }
    });
  }

  async resetPassword(email: string, passwordHash: string) {
    return prisma.user.update({
      where: { email },
      data: { 
        passwordHash, 
        resetPasswordOtp: null, 
        resetPasswordExpires: null 
      }
    });
  }
}
