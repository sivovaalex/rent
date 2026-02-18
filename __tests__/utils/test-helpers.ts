/// <reference types="vitest/globals" />

// ==================== REQUEST HELPERS ====================

export function createMockRequest(
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    url?: string;
  } = {}
): Request {
  const { method = 'GET', body, headers = {}, url = 'http://localhost:3000/api/test' } = options;

  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

export function createAuthenticatedRequest(
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    url?: string;
    userId?: string;
    token?: string;
  } = {}
): Request {
  const { userId = 'test-user-id', token = 'mock-jwt-token', ...rest } = options;
  const headers = { ...rest.headers };

  headers['authorization'] = `Bearer ${token}`;

  return createMockRequest({ ...rest, headers });
}

// ==================== RESPONSE HELPERS ====================

export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}

// ==================== JWT MOCK HELPERS ====================

export function mockJwtVerification(userId: string) {
  vi.mock('@/lib/jwt', () => ({
    verifyToken: vi.fn().mockResolvedValue({ userId }),
    extractTokenFromHeader: vi.fn().mockReturnValue('mock-token'),
    signToken: vi.fn().mockResolvedValue('mock-signed-token'),
  }));
}

// ==================== FETCH MOCK HELPERS ====================

export function mockFetchSuccess<T>(data: T) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
    status: 200,
  });
}

export function mockFetchError(error: string, status = 400) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error }),
    status,
  });
}

export function mockFetchNetworkError() {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
    new Error('Network error')
  );
}

// ==================== WAIT HELPERS ====================

export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}
