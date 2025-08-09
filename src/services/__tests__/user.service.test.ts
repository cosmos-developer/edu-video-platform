import bcrypt from 'bcrypt';
import { UserService } from '../user.service';
import { getTestPrismaClient, setupTestDatabase, cleanupDatabase } from '../../../tests/utils/database';
import { User, UserRole, UserStatus } from '@prisma/client';

describe('UserService', () => {
  let userService: UserService;
  let prisma: ReturnType<typeof getTestPrismaClient>;

  beforeAll(async () => {
    await setupTestDatabase();
    prisma = getTestPrismaClient();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    userService = new UserService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'STUDENT' as UserRole
    };

    it('should create a new user with valid data', async () => {
      const user = await userService.createUser(validUserData);

      expect(user).toBeDefined();
      expect(user.id).toBeTruthy();
      expect(user.email).toBe(validUserData.email);
      expect(user.firstName).toBe(validUserData.firstName);
      expect(user.lastName).toBe(validUserData.lastName);
      expect(user.role).toBe(validUserData.role);
      expect(user.status).toBe('ACTIVE');
    });

    it('should hash the password before storing', async () => {
      const user = await userService.createUser(validUserData);
      
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(dbUser?.passwordHash).toBeTruthy();
      expect(dbUser?.passwordHash).not.toBe(validUserData.password);
      
      const isValidPassword = await bcrypt.compare(
        validUserData.password,
        dbUser!.passwordHash
      );
      expect(isValidPassword).toBe(true);
    });

    it('should throw error when creating user with duplicate email', async () => {
      await userService.createUser(validUserData);
      
      await expect(userService.createUser(validUserData))
        .rejects
        .toThrow('already exists');
    });

    it('should create user preferences automatically', async () => {
      const user = await userService.createUser(validUserData);
      
      const preferences = await prisma.userPreference.findUnique({
        where: { userId: user.id }
      });

      expect(preferences).toBeDefined();
      expect(preferences?.userId).toBe(user.id);
      expect(preferences?.theme).toBe('light');
      expect(preferences?.language).toBe('en');
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...validUserData,
        email: 'invalid-email'
      };

      await expect(userService.createUser(invalidData))
        .rejects
        .toThrow('Invalid email');
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: '12345'
      };

      await expect(userService.createUser(weakPasswordData))
        .rejects
        .toThrow('Password must be at least');
    });

    it('should sanitize input data', async () => {
      const unsafeData = {
        ...validUserData,
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  NewUser@Example.Com  '
      };

      const user = await userService.createUser(unsafeData);
      
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.email).toBe('newuser@example.com');
    });
  });

  describe('getUserById', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'getuser@example.com',
          firstName: 'Get',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Password123!', 10)
        }
      });
    });

    it('should retrieve user by valid ID', async () => {
      const user = await userService.getUserById(testUser.id);

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.email).toBe(testUser.email);
    });

    it('should return null for non-existent ID', async () => {
      const user = await userService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });

    it('should not include password hash in response', async () => {
      const user = await userService.getUserById(testUser.id);
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should include user preferences if requested', async () => {
      await prisma.userPreference.create({
        data: {
          userId: testUser.id,
          theme: 'dark',
          language: 'en'
        }
      });

      const user = await userService.getUserById(testUser.id, {
        includePreferences: true
      });

      expect(user?.preferences).toBeDefined();
      expect(user?.preferences?.theme).toBe('dark');
    });
  });

  describe('getUserByEmail', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'finduser@example.com',
          firstName: 'Find',
          lastName: 'User',
          role: 'TEACHER',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Password123!', 10)
        }
      });
    });

    it('should retrieve user by email', async () => {
      const user = await userService.getUserByEmail(testUser.email);

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.email).toBe(testUser.email);
    });

    it('should be case-insensitive for email', async () => {
      const user = await userService.getUserByEmail('FindUser@Example.Com');
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
    });

    it('should return null for non-existent email', async () => {
      const user = await userService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'updateuser@example.com',
          firstName: 'Update',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Password123!', 10)
        }
      });
    });

    it('should update user profile information', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'New bio text'
      };

      const updatedUser = await userService.updateUser(testUser.id, updates);

      expect(updatedUser.firstName).toBe(updates.firstName);
      expect(updatedUser.lastName).toBe(updates.lastName);
      expect(updatedUser.bio).toBe(updates.bio);
    });

    it('should not allow email update through regular update', async () => {
      const updates = {
        email: 'newemail@example.com'
      };

      const updatedUser = await userService.updateUser(testUser.id, updates);
      expect(updatedUser.email).toBe(testUser.email);
    });

    it('should update password with proper hashing', async () => {
      const newPassword = 'NewSecurePassword123!';
      
      const updatedUser = await userService.updateUser(testUser.id, {
        password: newPassword
      });

      const dbUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      const isValidPassword = await bcrypt.compare(
        newPassword,
        dbUser!.passwordHash
      );
      expect(isValidPassword).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.updateUser('non-existent-id', { firstName: 'Test' })
      ).rejects.toThrow('User not found');
    });

    it('should track updatedAt timestamp', async () => {
      const originalUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await userService.updateUser(testUser.id, { firstName: 'Updated' });
      
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(updatedUser!.updatedAt.getTime()).toBeGreaterThan(
        originalUser!.updatedAt.getTime()
      );
    });
  });

  describe('deleteUser', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'deleteuser@example.com',
          firstName: 'Delete',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Password123!', 10)
        }
      });
    });

    it('should soft delete user by default', async () => {
      await userService.deleteUser(testUser.id);

      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(user).toBeDefined();
      expect(user?.status).toBe('DELETED');
      expect(user?.deletedAt).toBeTruthy();
    });

    it('should hard delete user when specified', async () => {
      await userService.deleteUser(testUser.id, { hardDelete: true });

      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(user).toBeNull();
    });

    it('should cascade delete related data on hard delete', async () => {
      // Create related data
      await prisma.userPreference.create({
        data: { userId: testUser.id }
      });

      await userService.deleteUser(testUser.id, { hardDelete: true });

      const preferences = await prisma.userPreference.findUnique({
        where: { userId: testUser.id }
      });

      expect(preferences).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.deleteUser('non-existent-id')
      ).rejects.toThrow('User not found');
    });
  });

  describe('validateCredentials', () => {
    let testUser: User;
    const password = 'ValidPassword123!';

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'validate@example.com',
          firstName: 'Validate',
          lastName: 'User',
          role: 'STUDENT',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash(password, 10),
          emailVerified: new Date()
        }
      });
    });

    it('should validate correct credentials', async () => {
      const isValid = await userService.validateCredentials(
        testUser.email,
        password
      );

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await userService.validateCredentials(
        testUser.email,
        'WrongPassword123!'
      );

      expect(isValid).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const isValid = await userService.validateCredentials(
        'nonexistent@example.com',
        password
      );

      expect(isValid).toBe(false);
    });

    it('should reject inactive user', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { status: 'INACTIVE' }
      });

      const isValid = await userService.validateCredentials(
        testUser.email,
        password
      );

      expect(isValid).toBe(false);
    });

    it('should reject unverified email', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { emailVerified: null }
      });

      const isValid = await userService.validateCredentials(
        testUser.email,
        password
      );

      expect(isValid).toBe(false);
    });
  });

  describe('getUsersByRole', () => {
    beforeEach(async () => {
      // Create multiple users with different roles
      await prisma.user.createMany({
        data: [
          {
            email: 'student1@example.com',
            firstName: 'Student',
            lastName: 'One',
            role: 'STUDENT',
            status: 'ACTIVE',
            passwordHash: await bcrypt.hash('Password123!', 10)
          },
          {
            email: 'student2@example.com',
            firstName: 'Student',
            lastName: 'Two',
            role: 'STUDENT',
            status: 'ACTIVE',
            passwordHash: await bcrypt.hash('Password123!', 10)
          },
          {
            email: 'teacher1@example.com',
            firstName: 'Teacher',
            lastName: 'One',
            role: 'TEACHER',
            status: 'ACTIVE',
            passwordHash: await bcrypt.hash('Password123!', 10)
          }
        ]
      });
    });

    it('should retrieve all users with specific role', async () => {
      const students = await userService.getUsersByRole('STUDENT');

      expect(students).toHaveLength(2);
      expect(students.every(u => u.role === 'STUDENT')).toBe(true);
    });

    it('should support pagination', async () => {
      const firstPage = await userService.getUsersByRole('STUDENT', {
        skip: 0,
        take: 1
      });

      expect(firstPage).toHaveLength(1);

      const secondPage = await userService.getUsersByRole('STUDENT', {
        skip: 1,
        take: 1
      });

      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    it('should filter by status', async () => {
      await prisma.user.update({
        where: { email: 'student1@example.com' },
        data: { status: 'INACTIVE' }
      });

      const activeStudents = await userService.getUsersByRole('STUDENT', {
        status: 'ACTIVE'
      });

      expect(activeStudents).toHaveLength(1);
      expect(activeStudents[0].email).toBe('student2@example.com');
    });
  });
});