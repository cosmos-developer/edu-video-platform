import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../test/utils';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-8', 'h-8'); // Default medium size
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('custom-class');
  });

  it('renders with custom color', () => {
    render(<LoadingSpinner className="text-red-500" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('text-red-500');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
    
    // Check for screen reader text
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('is visible and animating', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeVisible();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('renders center aligned by default', () => {
    render(<LoadingSpinner />);
    
    const container = screen.getByTestId('loading-spinner').parentElement;
    expect(container).toHaveClass('flex', 'justify-center', 'items-center');
  });

  it('can be rendered inline', () => {
    render(<LoadingSpinner inline />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).not.toHaveClass('flex', 'justify-center', 'items-center');
  });

  it('supports different themes', () => {
    const { rerender } = render(<LoadingSpinner />);
    
    // Default theme
    let spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('text-primary-600');
    
    // Light theme
    rerender(<LoadingSpinner theme="light" />);
    spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('text-white');
    
    // Dark theme
    rerender(<LoadingSpinner theme="dark" />);
    spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('text-gray-800');
  });
});