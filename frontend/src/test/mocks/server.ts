import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup mock service worker server for Node.js environment (tests)
export const server = setupServer(...handlers);

// Export handlers for individual test customization
export { handlers } from './handlers';
export * from './handlers';