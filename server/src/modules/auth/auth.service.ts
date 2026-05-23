import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SystemRole } from "../../types/auth.js";
import { prisma } from "../../prisma/client.js";
import { signAccessToken, signRefreshToken } from "../../utils/tokens.js";
import { env } from "../../config/env.js";

class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function issueTokens(user: {
  id: string;
  schoolId: string;
  email: string;
  roleName: SystemRole;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const claims = {
    sub: user.id,
    schoolId: user.schoolId,
    role: user.roleName,
    email: user.email
  } as const;

  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash }
  });

  return { accessToken, refreshToken };
}

export const AuthService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      throw new AuthError("Invalid credentials", 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthError("Invalid credentials", 401);
    }

    const tokens = await issueTokens({
      id: user.id,
      schoolId: user.schoolId,
      email: user.email,
      roleName: user.role.name as SystemRole
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        fullName: user.fullName,
        schoolId: user.schoolId
      }
    };
  },

  async refresh(refreshToken: string) {
    let payload: { sub: string };

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      throw new AuthError("Invalid refresh token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }
    });

    if (!user?.refreshTokenHash) {
      throw new AuthError("Session expired", 401);
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new AuthError("Session expired", 401);
    }

    return issueTokens({
      id: user.id,
      schoolId: user.schoolId,
      email: user.email,
      roleName: user.role.name as SystemRole
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw new AuthError("User not found", 404);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      fullName: user.fullName,
      schoolId: user.schoolId,
      mfaEnabled: user.mfaEnabled
    };
  },

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null }
    });
  },

  ssoProviders() {
    return [
      { key: "azure-ad", label: "Microsoft Entra ID", configured: false },
      { key: "google", label: "Google Workspace", configured: false },
      { key: "saml", label: "SAML 2.0", configured: false }
    ];
  }
};
