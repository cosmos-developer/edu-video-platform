import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthController } from '../auth.controller';
import { UserService } from '../../services/user.service';
import { getTestPrismaClient, setupTestDatabase, cleanupDatabase } from '../../../tests/utils/database';
import { validationErrorHandler } from '../../middleware/validation';

describe('AuthController', () => {
  let app: express.Application;
  let authController: AuthController;
  let userService: UserService;
  let prisma: ReturnType<typeof getTestPrismaClient>;

  beforeAll(async () => {
    await setupTestDatabase();
    prisma = getTestPrismaClient();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    
    // Initialize services and controllers
    userService = new UserService();
    authController = new AuthController();
    
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    
    // Setup routes
    app.post('/auth/register', authController.register);
    app.post('/auth/login', authController.login);
    app.post('/auth/logout', authController.logout);
    app.post('/auth/refresh', authController.refreshToken);
    
    // Add error handler
    app.use(validationErrorHandler);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /auth/register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'STUDENT'
    };

    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(validRegistrationData.email);
      expect(response.body.user.role).toBe(validRegistrationData.role);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistrationData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('valid email')
        })
      );
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistrationData,
          password: '12345'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'password',
          message: expect.stringContaining('password')
        })
      );
    });

    it('should reject registration with invalid role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistrationData,
          role: 'INVALID_ROLE'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'role'
        })
      );
    });

    it('should hash the password before storing', async () => {
      await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: validRegistrationData.email }
      });

      expect(user).toBeTruthy();
      expect(user?.passwordHash).toBeTruthy();
      expect(user?.passwordHash).not.toBe(validRegistrationData.password);
      
      const isValidPassword = await bcrypt.compare(
        validRegistrationData.password,
        user!.passwordHash
      );
      expect(isValidPassword).toBe(true);
    });
  });

  describe('POST /auth/login', () => {
    const userCredentials = {
      email: 'testuser@example.com',
      password: 'SecurePassword123!'
    };

    beforeEach(async () => {
      // Create a test user
      const passwordHash = await bcrypt.hash(userCredentials.password, 10);
      await prisma.user.create({
        data: {
          email: userCredentials.email,
          firstName: 'Test',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash,
          emailVerified: new Date()
        }
      });
    });

    it('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(userCredentials)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(userCredentials.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userCredentials.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      // Update user status to inactive
      await prisma.user.update({
        where: { email: userCredentials.email },
        data: { status: 'INACTIVE' }
      });

      const response = await request(app)
        .post('/auth/login')
        .send(userCredentials)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('inactive');
    });

    it('should update lastLogin timestamp on successful login', async () => {
      await request(app)
        .post('/auth/login')
        .send(userCredentials)
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { email: userCredentials.email }
      });

      expect(user?.lastLogin).toBeTruthy();
      expect(new Date(user!.lastLogin!).getTime()).toBeCloseTo(Date.now(), -2);
    });

    it('should return valid JWT tokens', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(userCredentials)
        .expect(200);

      // Verify access token
      const decodedAccess = jwt.verify(
        response.body.accessToken,
        process.env.JWT_SECRET!
      ) as any;
      expect(decodedAccess.userId).toBeTruthy();
      expect(decodedAccess.email).toBe(userCredentials.email);

      // Verify refresh token
      const decodedRefresh = jwt.verify(
        response.body.refreshToken,
        process.env.JWT_SECRET!
      ) as any;
      expect(decodedRefresh.userId).toBe(decodedAccess.userId);
      expect(decodedRefresh.type).toBe('refresh');
    });
  });

  describe('POST /auth/refresh', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and get tokens
      const user = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          firstName: 'Refresh',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Password123!', 10),
          emailVerified: new Date()
        }
      });
      
      userId = user.id;
      
      // Create refresh token
      validRefreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: validRefreshToken,
          userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(validRefreshToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject refresh with expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('expired');
    });

    it('should invalidate old refresh token after successful refresh', async () => {
      await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      // Try to use old token again
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and login to get tokens
      const user = await prisma.user.create({
        data: {
          email: 'logout@example.com',
          firstName: 'Logout',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Password123!', 10),
          emailVerified: new Date()
        }
      });

      accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    });

    it('should successfully logout user', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('success');

      // Verify refresh token is deleted
      const tokenExists = await prisma.refreshToken.findFirst({
        where: { token: refreshToken }
      });
      expect(tokenExists).toBeNull();
    });

    it('should logout even without refresh token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });
});