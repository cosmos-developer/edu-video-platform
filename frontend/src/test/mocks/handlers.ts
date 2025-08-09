import { http, HttpResponse } from 'msw';
import { User, LoginCredentials, RegisterData } from '../../types/auth';
import { createTestUser, createTestTeacher, createTestStudent } from '../utils';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock users database
const mockUsers: User[] = [
  createTestTeacher({ 
    id: 'teacher-1', 
    email: 'teacher@example.com',
    firstName: 'John',
    lastName: 'Teacher'
  }),
  createTestStudent({ 
    id: 'student-1', 
    email: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Student'
  }),
];

// Mock tokens
const generateMockToken = (userId: string) => `mock-jwt-token-${userId}`;

export const handlers = [
  // Authentication endpoints
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as RegisterData;
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === body.email);
    if (existingUser) {
      return HttpResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = createTestUser({
      id: `user-${mockUsers.length + 1}`,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role
    });
    
    mockUsers.push(newUser);

    return HttpResponse.json({
      user: newUser,
      accessToken: generateMockToken(newUser.id),
      refreshToken: `refresh-${newUser.id}`
    }, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as LoginCredentials;
    
    // Find user by email
    const user = mockUsers.find(u => u.email === body.email);
    if (!user || body.password !== 'TestPassword123!') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user,
      accessToken: generateMockToken(user.id),
      refreshToken: `refresh-${user.id}`
    });
  }),

  http.post(`${API_BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refreshToken: string };
    
    if (!body.refreshToken || !body.refreshToken.startsWith('refresh-')) {
      return HttpResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const userId = body.refreshToken.replace('refresh-', '');
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      return HttpResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      accessToken: generateMockToken(userId),
      refreshToken: `refresh-${userId}-new`
    });
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // User endpoints
  http.get(`${API_BASE_URL}/users/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-jwt-token-', '');
    const user = mockUsers.find(u => u.id === userId);

    if (!user) {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(user);
  }),

  // Lessons endpoints
  http.get(`${API_BASE_URL}/lessons`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search');

    // Mock lessons data
    let lessons = [
      {
        id: '1',
        title: 'Introduction to React',
        description: 'Learn the basics of React framework',
        thumbnail: 'https://example.com/thumb1.jpg',
        duration: 1800,
        difficulty: 'beginner',
        tags: ['react', 'javascript'],
        createdBy: mockUsers[0],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        id: '2',
        title: 'Advanced TypeScript',
        description: 'Master advanced TypeScript concepts',
        thumbnail: 'https://example.com/thumb2.jpg',
        duration: 2400,
        difficulty: 'advanced',
        tags: ['typescript', 'javascript'],
        createdBy: mockUsers[0],
        createdAt: '2023-01-02T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z'
      }
    ];

    // Apply search filter
    if (search) {
      lessons = lessons.filter(lesson => 
        lesson.title.toLowerCase().includes(search.toLowerCase()) ||
        lesson.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLessons = lessons.slice(startIndex, endIndex);

    return HttpResponse.json({
      lessons: paginatedLessons,
      pagination: {
        page,
        limit,
        total: lessons.length,
        totalPages: Math.ceil(lessons.length / limit)
      }
    });
  }),

  http.get(`${API_BASE_URL}/lessons/:id`, ({ params }) => {
    const lessonId = params.id as string;
    
    const lesson = {
      id: lessonId,
      title: 'Introduction to React',
      description: 'Learn the basics of React framework',
      thumbnail: 'https://example.com/thumb1.jpg',
      duration: 1800,
      difficulty: 'beginner',
      tags: ['react', 'javascript'],
      objectives: ['Learn JSX', 'Understand components', 'Master hooks'],
      createdBy: mockUsers[0],
      videoGroups: [
        {
          id: 'vg-1',
          title: 'Getting Started',
          videos: [
            {
              id: 'video-1',
              title: 'What is React?',
              duration: 300,
              thumbnail: 'https://example.com/video-thumb1.jpg',
              url: 'https://example.com/video1.mp4'
            }
          ]
        }
      ],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };

    return HttpResponse.json(lesson);
  }),

  // Video endpoints
  http.get(`${API_BASE_URL}/videos/:id`, ({ params }) => {
    const videoId = params.id as string;
    
    const video = {
      id: videoId,
      title: 'What is React?',
      description: 'Introduction to React framework',
      duration: 300,
      url: 'https://example.com/video1.mp4',
      thumbnail: 'https://example.com/video-thumb1.jpg',
      milestones: [
        {
          id: 'milestone-1',
          type: 'QUIZ',
          timestamp: 30,
          title: 'Quick Check',
          questions: [
            {
              id: 'q1',
              type: 'MULTIPLE_CHOICE',
              question: 'What is React?',
              options: ['Library', 'Framework', 'Language', 'Database'],
              correctAnswer: 'Library'
            }
          ]
        }
      ],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };

    return HttpResponse.json(video);
  }),

  // Progress endpoints
  http.get(`${API_BASE_URL}/progress/lessons/:id`, ({ params }) => {
    const lessonId = params.id as string;
    
    return HttpResponse.json({
      lessonId,
      progress: 0.65,
      completedVideos: 2,
      totalVideos: 5,
      watchTime: 1200,
      lastAccessedAt: '2023-01-03T10:00:00.000Z'
    });
  }),

  http.post(`${API_BASE_URL}/sessions/start`, async ({ request }) => {
    const body = await request.json() as { videoId: string };
    
    return HttpResponse.json({
      sessionId: `session-${Date.now()}`,
      videoId: body.videoId,
      startTime: new Date().toISOString()
    }, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/sessions/:id/progress`, async ({ params, request }) => {
    const sessionId = params.id as string;
    const body = await request.json() as { currentTime: number; totalWatchTime: number };
    
    return HttpResponse.json({
      sessionId,
      currentTime: body.currentTime,
      totalWatchTime: body.totalWatchTime,
      updatedAt: new Date().toISOString()
    });
  }),

  // Questions and answers
  http.post(`${API_BASE_URL}/answers`, async ({ request }) => {
    const body = await request.json() as { questionId: string; answer: string; milestoneId: string };
    
    // Simple correct/incorrect logic for testing
    const isCorrect = body.answer === 'Library';
    
    return HttpResponse.json({
      id: `answer-${Date.now()}`,
      questionId: body.questionId,
      milestoneId: body.milestoneId,
      isCorrect,
      score: isCorrect ? 10 : 0,
      explanation: isCorrect 
        ? 'Correct! React is a JavaScript library.'
        : 'Incorrect. React is a JavaScript library, not a framework.',
      submittedAt: new Date().toISOString()
    }, { status: 201 });
  }),

  // Error handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  })
];

// Additional handlers for specific test scenarios
export const errorHandlers = [
  // Server error scenarios
  http.post(`${API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  // Network error scenarios
  http.get(`${API_BASE_URL}/lessons`, () => {
    return HttpResponse.error();
  }),
];

// Delayed response handlers for loading state testing
export const delayedHandlers = [
  http.get(`${API_BASE_URL}/lessons`, async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return HttpResponse.json({ lessons: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  }),
];