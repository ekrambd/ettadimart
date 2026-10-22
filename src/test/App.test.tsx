import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock the heavy components so we can test the App shell
vi.mock('../components/LoginPage', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../components/AdminDashboard', () => ({ default: () => <div data-testid="admin-dashboard">Admin Dashboard</div> }));
vi.mock('../components/BookLandingPage', () => ({ default: () => <div data-testid="book-landing-page">Book Landing Page</div> }));
vi.mock('../components/FantineStorePage', () => ({ default: () => <div data-testid="fantine-store-page">Ecom Store Page</div> }));

describe('App component', () => {
  it('renders storefront page immediately without blocking spinner', async () => {
    render(<App />);
    expect(await screen.findByTestId('fantine-store-page')).toBeInTheDocument();
  });
});
