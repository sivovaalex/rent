/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock('@/lib/supabase/storage', () => ({
  uploadBase64File: vi.fn(),
  BUCKETS: { DOCUMENTS: 'documents' },
  generateFilePath: vi.fn(() => 'verification/user-1/12345_1234.jpg'),
}));

import { POST } from '@/app/api/auth/upload-document/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { uploadBase64File } from '@/lib/supabase/storage';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function mockAuth(userId: string) {
  (extractTokenFromHeader as any).mockReturnValue('mock-token');
  (verifyToken as any).mockResolvedValue({ userId });
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    name: 'Test User',
    phone: '+79001234567',
    email: null,
    role: 'renter',
    rating: 5.0,
    isVerified: false,
    verificationStatus: 'not_verified',
    isBlocked: false,
    photo: null,
    createdAt: new Date(),
    trustScore: 0,
    completedDeals: 0,
    cancelledDeals: 0,
    confirmationRate: 0,
    avgResponseMinutes: null,
    trustBadges: [],
    defaultApprovalMode: 'auto_approve',
    defaultApprovalThreshold: 4.0,
  });
}

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/upload-document', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      authorization: 'Bearer mock-token',
    }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/upload-document', () => {
  it('should return 401 without auth', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fake',
    }) as any);
    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid document type', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      document_type: 'invalid_type',
      document_data: 'data:image/jpeg;base64,/9j/fake',
    }) as any);
    expect(response.status).toBe(400);
  });

  it('should return 400 for empty document data', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: '',
    }) as any);
    expect(response.status).toBe(400);
  });

  it('should upload document and set status to pending', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: true,
      url: 'https://storage.supabase.co/documents/verification/user-1/12345.jpg',
      path: 'verification/user-1/12345.jpg',
    });

    prismaMock.user.update.mockResolvedValue({} as any);

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakebase64data',
    }) as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('загружен');

    expect(uploadBase64File).toHaveBeenCalledWith(
      'documents',
      'verification/user-1/12345_1234.jpg',
      'data:image/jpeg;base64,/9j/fakebase64data',
      'image/jpeg'
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        documentPath: 'https://storage.supabase.co/documents/verification/user-1/12345.jpg',
        documentType: 'passport',
        verificationStatus: 'pending',
      }),
    });
  });

  it('should return 500 if storage upload fails', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: false,
      error: 'Storage error',
    });

    const response = await POST(createRequest({
      document_type: 'driver_license',
      document_data: 'data:image/png;base64,fakedata',
    }) as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Ошибка');
  });

  it('should detect PNG content type', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: true,
      url: 'https://storage.supabase.co/documents/test.png',
      path: 'test.png',
    });

    prismaMock.user.update.mockResolvedValue({} as any);

    await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/png;base64,fakepngdata',
    }) as any);

    expect(uploadBase64File).toHaveBeenCalledWith(
      'documents',
      expect.any(String),
      expect.any(String),
      'image/png'
    );
  });

  // ==================== Owner Type Tests ====================

  it('should save ownerType as individual by default', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: true,
      url: 'https://storage.supabase.co/documents/test.jpg',
      path: 'test.jpg',
    });

    prismaMock.user.update.mockResolvedValue({} as any);

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakedata',
    }) as any);

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        ownerType: 'individual',
        companyName: null,
        inn: null,
        ogrn: null,
      }),
    });
  });

  it('should save IP owner type with INN and OGRN', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: true,
      url: 'https://storage.supabase.co/documents/test.jpg',
      path: 'test.jpg',
    });

    prismaMock.user.update.mockResolvedValue({} as any);

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakedata',
      owner_type: 'ip',
      company_name: 'ИП Иванов',
      inn: '123456789012',
      ogrn: '315000000000000',
    }) as any);

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        ownerType: 'ip',
        companyName: 'ИП Иванов',
        inn: '123456789012',
        ogrn: '315000000000000',
      }),
    });
  });

  it('should save legal_entity owner type with INN, OGRN and company name', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: true,
      url: 'https://storage.supabase.co/documents/test.jpg',
      path: 'test.jpg',
    });

    prismaMock.user.update.mockResolvedValue({} as any);

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakedata',
      owner_type: 'legal_entity',
      company_name: 'ООО Тест',
      inn: '1234567890',
      ogrn: '1230000000000',
    }) as any);

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        ownerType: 'legal_entity',
        companyName: 'ООО Тест',
        inn: '1234567890',
        ogrn: '1230000000000',
      }),
    });
  });

  it('should return 400 for IP without INN', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakedata',
      owner_type: 'ip',
      ogrn: '315000000000000',
    }) as any);

    expect(response.status).toBe(400);
  });

  it('should return 400 for legal_entity without OGRN', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakedata',
      owner_type: 'legal_entity',
      inn: '1234567890',
    }) as any);

    expect(response.status).toBe(400);
  });

  it('should not save INN/OGRN for individual type', async () => {
    mockAuth('user-1');

    (uploadBase64File as any).mockResolvedValue({
      success: true,
      url: 'https://storage.supabase.co/documents/test.jpg',
      path: 'test.jpg',
    });

    prismaMock.user.update.mockResolvedValue({} as any);

    const response = await POST(createRequest({
      document_type: 'passport',
      document_data: 'data:image/jpeg;base64,/9j/fakedata',
      owner_type: 'individual',
      inn: '123456789012',
      ogrn: '315000000000000',
    }) as any);

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        ownerType: 'individual',
        inn: null,
        ogrn: null,
      }),
    });
  });
});
