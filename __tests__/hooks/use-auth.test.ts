/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth, getAuthHeaders } from '@/hooks/use-auth';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('useAuth', () => {
  const mockUser = {
    _id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+79001234567',
    role: 'renter' as const,
    rating: 5.0,
    isVerified: false,
    verificationStatus: 'not_verified' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAuthHeaders', () => {
    it('should return headers without auth when no token', () => {
      const headers = getAuthHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should return headers with Bearer token when token exists', () => {
      localStorage.setItem('auth_token', 'test-token');
      const headers = getAuthHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('initialization', () => {
    it('should have no user when localStorage is empty', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toBeNull();
    });

    it('should load user from localStorage', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', mockToken);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toEqual(mockUser);
    });

    it('should handle invalid JSON in localStorage', async () => {
      localStorage.setItem('user', 'invalid-json');
      localStorage.setItem('auth_token', mockToken);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUser).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('handleLogin', () => {
    it('should login successfully with valid credentials', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, token: mockToken }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleLogin('test@example.com', 'password123');
      });

      expect(success!).toBe(true);
      expect(result.current.currentUser).toEqual(mockUser);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
    });

    it('should handle login failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleLogin('test@example.com', 'wrong-password');
      });

      expect(success!).toBe(false);
      expect(result.current.currentUser).toBeNull();
      expect(result.current.authAlert).toEqual({
        message: 'Invalid credentials',
        type: 'error',
      });
    });

    it('should handle network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleLogin('test@example.com', 'password123');
      });

      expect(success!).toBe(false);
      expect(result.current.authAlert?.type).toBe('error');
    });
  });

  describe('handleRegister', () => {
    const registerData = {
      name: 'New User',
      email: 'new@example.com',
      phone: '+79009876543',
      password: 'password123',
      role: 'renter' as const,
    };

    it('should register successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, token: mockToken }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleRegister(registerData);
      });

      expect(success!).toBe(true);
      expect(result.current.currentUser).toEqual(mockUser);
    });

    it('should handle registration failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already exists' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleRegister(registerData);
      });

      expect(success!).toBe(false);
      expect(result.current.authAlert?.message).toBe('Email already exists');
    });
  });

  describe('handleLogout', () => {
    it('should clear user and redirect to home', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', mockToken);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.currentUser).toEqual(mockUser);
      });

      act(() => {
        result.current.handleLogout();
      });

      expect(result.current.currentUser).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('handleRoleChange', () => {
    it('should update role successfully', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', mockToken);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const mockOnShowAlert = vi.fn();
      const { result } = renderHook(() => useAuth({ onShowAlert: mockOnShowAlert }));

      await waitFor(() => {
        expect(result.current.currentUser).toEqual(mockUser);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleRoleChange('owner');
      });

      expect(success!).toBe(true);
      expect(result.current.currentUser?.role).toBe('owner');
      expect(mockOnShowAlert).toHaveBeenCalledWith('Роль успешно изменена!');
    });

    it('should return false if no user logged in', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.handleRoleChange('owner');
      });

      expect(success!).toBe(false);
    });
  });

  describe('auth modal controls', () => {
    it('should open and close auth modal', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.showAuth).toBe(false);

      act(() => {
        result.current.openAuth();
      });

      expect(result.current.showAuth).toBe(true);

      act(() => {
        result.current.closeAuth();
      });

      expect(result.current.showAuth).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update current user and localStorage', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newUser = { ...mockUser, name: 'Updated Name' };

      act(() => {
        result.current.updateUser(newUser);
      });

      expect(result.current.currentUser).toEqual(newUser);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(newUser);
    });
  });
});
