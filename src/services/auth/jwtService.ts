import jwt from 'jsonwebtoken';
import { environment } from '../../config/environment';
import { JWTPayload, AuthenticatedUser, AppError } from '../../types';
import { logger } from '../../utils/logger';

class JWTService {
  /**
   * Generate access token
   */
  generateAccessToken(user: AuthenticatedUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.tenantId && { tenantId: user.tenantId })
    };

    return jwt.sign(payload, environment.jwt.secret as string, {
      expiresIn: environment.jwt.expiresIn,
      issuer: 'education-platform',
      audience: 'education-platform-users',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user: AuthenticatedUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.tenantId && { tenantId: user.tenantId })
    };

    return jwt.sign(payload, environment.jwt.refreshSecret as string, {
      expiresIn: environment.jwt.refreshExpiresIn,
      issuer: 'education-platform',
      audience: 'education-platform-refresh',
    });
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(user: AuthenticatedUser): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, environment.jwt.secret as string, {
        issuer: 'education-platform',
        audience: 'education-platform-users',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401);
      } else {
        logger.error('JWT verification error:', error);
        throw new AppError('Token verification failed', 401);
      }
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, environment.jwt.refreshSecret as string, {
        issuer: 'education-platform',
        audience: 'education-platform-refresh',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      } else {
        logger.error('Refresh token verification error:', error);
        throw new AppError('Refresh token verification failed', 401);
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return null;

    return new Date(decoded.exp * 1000);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    return expiration < new Date();
  }
}

export const jwtService = new JWTService();
export default jwtService;