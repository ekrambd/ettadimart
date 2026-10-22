export interface AuthUser {
  uid: string;
  email: string;
  phone?: string;
  role: string;
}

const TOKEN_KEY = 'admin_token';
const EMAIL_KEY = 'noor_admin_session_email';
const USER_KEY = 'admin_user';

type AuthListener = (user: AuthUser | null) => void;
const listeners: Set<AuthListener> = new Set();

function notifyListeners(user: AuthUser | null) {
  listeners.forEach(fn => {
    try {
      fn(user);
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
}

export const authService = {
  /**
   * Log in to admin account using phone or email and password.
   */
  async login(identifier: string, password: string): Promise<{ success: boolean; token: string; user: AuthUser }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    if (!res.ok) {
      let message = 'Login failed';
      try {
        const body = await res.json();
        message = body.message || message;
      } catch {
        // fallback
      }
      throw new Error(message);
    }

    const data = await res.json();
    const token = data.token;
    const user: AuthUser = data.user;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, user.email || identifier);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    notifyListeners(user);
    return { success: true, token, user };
  },

  /**
   * Log out from admin account.
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(USER_KEY);

    notifyListeners(null);
  },

  /**
   * Retrieve the current JWT token for API headers.
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Retrieve the current admin user info.
   */
  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Check if an active admin session is present.
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(EMAIL_KEY));
  },

  /**
   * Subscribe to auth changes (similar to Firebase onAuthStateChanged).
   */
  onAuthStateChanged(callback: AuthListener): () => void {
    listeners.add(callback);
    // Fire immediately with current state
    const currentUser = this.getUser();
    callback(currentUser);

    return () => {
      listeners.delete(callback);
    };
  }
};
