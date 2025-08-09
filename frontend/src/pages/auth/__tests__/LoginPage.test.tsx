import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/utils';
import LoginPage from '../LoginPage';
import { server } from '../../../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('LoginPage', () => {
  it('renders login form correctly', () => {
    render(<LoginPage />);
    
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
  });

  it('displays demo credentials', () => {
    render(<LoginPage />);
    
    expect(screen.getByText(/demo credentials:/i)).toBeInTheDocument();
    expect(screen.getByText(/teacher@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/student@example\.com/)).toBeInTheDocument();
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const emailField = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Try to submit without email
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
    
    // Try with invalid email
    await user.type(emailField, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates password field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const emailField = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailField, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();
    
    render(<LoginPage />, {
      authStore: { login: mockLogin }
    });
    
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailField, 'teacher@example.com');
    await user.type(passwordField, 'TestPassword123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'teacher@example.com',
        password: 'TestPassword123!'
      });
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    
    // Mock API to return error
    server.use(
      http.post('http://localhost:3000/api/auth/login', () => {
        return HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );
    
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    
    render(<LoginPage />, {
      authStore: { login: mockLogin }
    });
    
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailField, 'wrong@example.com');
    await user.type(passwordField, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    
    // Create a delayed login mock
    const mockLogin = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<LoginPage />, {
      authStore: { login: mockLogin }
    });
    
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailField, 'teacher@example.com');
    await user.type(passwordField, 'TestPassword123!');
    await user.click(submitButton);
    
    // Should show loading spinner
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('navigates to register page', async () => {
    const user = userEvent.setup();
    
    render(<LoginPage />, {
      routerProps: { initialEntries: ['/login'] }
    });
    
    const registerLink = screen.getByText(/create a new account/i);
    await user.click(registerLink);
    
    // This would be tested with actual router integration
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('handles form reset on unmount', () => {
    const { unmount } = render(<LoginPage />);
    
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    
    // Fill form
    userEvent.type(emailField, 'test@example.com');
    userEvent.type(passwordField, 'password');
    
    // Unmount component
    unmount();
    
    // Remount and verify fields are empty
    render(<LoginPage />);
    
    const newEmailField = screen.getByLabelText(/email address/i);
    const newPasswordField = screen.getByLabelText(/password/i);
    
    expect(newEmailField).toHaveValue('');
    expect(newPasswordField).toHaveValue('');
  });

  it('is accessible', () => {
    render(<LoginPage />);
    
    // Check for proper form labels
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check for proper heading hierarchy
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    
    // Check for proper button role
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Check for proper form structure
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  it('prefills form with demo credentials when clicked', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    // This would require implementing click handlers for demo credentials
    // For now, we just verify the demo credentials are displayed
    expect(screen.getByText(/teacher@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Demo123!/)).toBeInTheDocument();
  });
});