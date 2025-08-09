import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { User, UserRole } from '../types/auth';

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Mock auth store for testing
interface MockAuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  setUser: ReturnType<typeof vi.fn>;
}

const createMockAuthStore = (overrides?: Partial<MockAuthStore>): MockAuthStore => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  setUser: vi.fn(),
  ...overrides
});

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
  authStore?: Partial<MockAuthStore>;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  routerProps,
  queryClient = createTestQueryClient(),
  authStore = {}
}) => {
  // Mock the auth store
  const mockStore = createMockAuthStore(authStore);
  vi.doMock('../stores/authStore', () => ({
    useAuthStore: () => mockStore
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter {...routerProps}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
  authStore?: Partial<MockAuthStore>;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const { routerProps, queryClient, authStore, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper
      routerProps={routerProps}
      queryClient={queryClient}
      authStore={authStore}
    >
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Test user factories
export const createTestUser = (overrides?: Partial<User>): User => ({
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'STUDENT' as UserRole,
  avatar: null,
  bio: null,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  ...overrides
});

export const createTestTeacher = (overrides?: Partial<User>): User =>
  createTestUser({ role: 'TEACHER' as UserRole, ...overrides });

export const createTestStudent = (overrides?: Partial<User>): User =>
  createTestUser({ role: 'STUDENT' as UserRole, ...overrides });

export const createTestAdmin = (overrides?: Partial<User>): User =>
  createTestUser({ role: 'ADMIN' as UserRole, ...overrides });

// Mock API responses
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message: string, status = 500, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message);
      (error as any).response = { status, data: { message } };
      reject(error);
    }, delay);
  });
};

// Mock fetch responses
export const mockFetch = (data: any, options?: { status?: number; delay?: number }) => {
  const { status = 200, delay = 0 } = options || {};
  
  return vi.fn().mockImplementation(() =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(data),
          text: () => Promise.resolve(JSON.stringify(data)),
        });
      }, delay);
    })
  );
};

// Video player test utilities
export const mockVideoPlayer = {
  play: vi.fn(),
  pause: vi.fn(),
  seekTo: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(300),
  getSecondsLoaded: vi.fn().mockReturnValue(300),
};

// Form test utilities
export const fillForm = async (form: HTMLFormElement, values: Record<string, string>) => {
  const { fireEvent } = await import('@testing-library/react');
  
  Object.entries(values).forEach(([name, value]) => {
    const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (field) {
      fireEvent.change(field, { target: { value } });
    }
  });
};

// Wait for loading states
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved, screen } = await import('@testing-library/react');
  
  try {
    await waitForElementToBeRemoved(() => screen.queryByTestId('loading-spinner'), {
      timeout: 3000
    });
  } catch {
    // Loading spinner might not be present, which is fine
  }
};

// Local storage mock
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
  };
};

// Session storage mock
export const mockSessionStorage = mockLocalStorage;

// Window location mock
export const mockLocation = (url: string) => {
  delete (window as any).location;
  window.location = new URL(url) as any;
};

// Custom matchers
expect.extend({
  toHaveBeenCalledWithMatch(received: any, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some((call: any[]) => 
      call.some((arg: any) => 
        typeof expected === 'function' ? expected(arg) : arg === expected
      )
    );
    
    return {
      message: () => 
        pass 
          ? `Expected function not to have been called with matching argument`
          : `Expected function to have been called with matching argument`,
      pass
    };
  }
});

// Re-export everything from testing library
export * from '@testing-library/react';
export * from '@testing-library/user-event';

// Export custom render as default render
export { customRender as render };
export { TestWrapper, createTestQueryClient, createMockAuthStore };