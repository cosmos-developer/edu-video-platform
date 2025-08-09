import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Mock environment variables
Object.defineProperty(window, 'ENV', {
  value: {
    API_URL: 'http://localhost:3000/api',
    NODE_ENV: 'test'
  },
  writable: true
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock HTMLMediaElement
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
});

// Mock react-player
vi.mock('react-player', () => ({
  default: vi.fn(({ onReady, onProgress, onDuration, onPlay, onPause }) => {
    // Simulate player events for testing
    if (onReady) setTimeout(() => onReady(), 100);
    if (onDuration) setTimeout(() => onDuration(300), 100);
    
    return (
      <div data-testid="react-player">
        <button onClick={() => onPlay && onPlay()} data-testid="play-button">
          Play
        </button>
        <button onClick={() => onPause && onPause()} data-testid="pause-button">
          Pause
        </button>
        <div data-testid="progress" onClick={() => onProgress && onProgress({ playedSeconds: 150, played: 0.5 })}>
          Progress
        </div>
      </div>
    );
  })
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn()
  }
}));

// Mock zustand stores
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn()
  }))
}));

// Setup MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Clean up DOM after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});