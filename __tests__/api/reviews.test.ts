/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock dependencies
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock('@/lib/trust', () => ({
  recalculateTrust: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from '@/app/api/reviews/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createGetRequest(params: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/reviews');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return new Request(url.toString(), { method: 'GET' });
}

function createPostRequest(
  body: Record<string, unknown>,
  userId?: string
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['authorization'] = 'Bearer mock-token';
  }

  return new Request('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: new Headers(headers),
    body: JSON.stringify(body),
  });
}

// Helper to set up auth mocks
function mockAuth(userId: string) {
  (extractTokenFromHeader as any).mockReturnValue('mock-token');
  (verifyToken as any).mockResolvedValue({ userId });
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    name: 'Test User',
    isBlocked: false,
    role: 'renter',
  });
}

describe('GET /api/reviews', () => {
  it('should return 400 without userId', async () => {
    const response = await GET(createGetRequest({}) as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('userId');
  });

  it('should return renter_reviews by default', async () => {
    prismaMock.review.findMany.mockResolvedValue([
      {
        id: 'review-1',
        bookingId: 'booking-1',
        itemId: 'item-1',
        userId: 'user-1',
        rating: 5,
        text: 'Great!',
        photos: [],
        type: 'renter_review',
        createdAt: new Date(),
        user: { id: 'user-1', name: 'Test User', photo: null },
        reply: null,
        item: { id: 'item-1', title: 'Camera' },
      },
    ]);

    const response = await GET(createGetRequest({ userId: 'owner-1' }) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0]._id).toBe('review-1');
    expect(body.reviews[0].rating).toBe(5);
    expect(body.reviews[0].type).toBe('renter_review');
  });

  it('should return owner_reviews when type=owner_review', async () => {
    prismaMock.review.findMany.mockResolvedValue([
      {
        id: 'review-2',
        bookingId: 'booking-1',
        itemId: 'item-1',
        userId: 'owner-1',
        rating: 4,
        text: 'Good renter',
        photos: [],
        type: 'owner_review',
        createdAt: new Date(),
        user: { id: 'owner-1', name: 'Owner', photo: null },
        reply: null,
        item: { id: 'item-1', title: 'Camera' },
      },
    ]);

    const response = await GET(
      createGetRequest({ userId: 'renter-1', type: 'owner_review' }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].type).toBe('owner_review');
  });

  it('should include reply when present', async () => {
    prismaMock.review.findMany.mockResolvedValue([
      {
        id: 'review-1',
        bookingId: 'booking-1',
        itemId: 'item-1',
        userId: 'user-1',
        rating: 5,
        text: 'Great!',
        photos: [],
        type: 'renter_review',
        createdAt: new Date(),
        user: { id: 'user-1', name: 'User', photo: null },
        reply: {
          id: 'reply-1',
          reviewId: 'review-1',
          ownerId: 'owner-1',
          text: 'Thanks!',
          createdAt: new Date(),
        },
        item: { id: 'item-1', title: 'Camera' },
      },
    ]);

    const response = await GET(createGetRequest({ userId: 'owner-1' }) as any);
    const body = await response.json();

    expect(body.reviews[0].reply).toBeDefined();
    expect(body.reviews[0].reply._id).toBe('reply-1');
    expect(body.reviews[0].reply.text).toBe('Thanks!');
  });
});

describe('POST /api/reviews', () => {
  const validReviewBody = {
    booking_id: 'booking-1',
    item_id: 'item-1',
    rating: 5,
    text: 'Great experience!',
    type: 'renter_review',
  };

  it('should return 401 without auth', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);

    const response = await POST(createPostRequest(validReviewBody) as any);
    expect(response.status).toBe(401);
  });

  it('should create a renter review successfully', async () => {
    mockAuth('renter-1');

    const completedBooking = {
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'completed',
      endDate: new Date(Date.now() - 86400000),
      item: { id: 'item-1', ownerId: 'owner-1', title: 'Camera' },
    };

    prismaMock.booking.findUnique.mockResolvedValue(completedBooking);
    prismaMock.review.findUnique.mockResolvedValue(null); // no existing review

    const createdReview = {
      id: 'review-new',
      bookingId: 'booking-1',
      itemId: 'item-1',
      userId: 'renter-1',
      rating: 5,
      text: 'Great experience!',
      photos: [],
      type: 'renter_review',
      createdAt: new Date(),
    };
    prismaMock.review.create.mockResolvedValue(createdReview);
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 5 } });

    const response = await POST(createPostRequest(validReviewBody, 'renter-1') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.review._id).toBe('review-new');
    expect(body.review.rating).toBe(5);
  });

  it('should reject review if booking not found', async () => {
    mockAuth('renter-1');
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const response = await POST(createPostRequest(validReviewBody, 'renter-1') as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Бронирование не найдено');
  });

  it('should reject if renter is not the booking renter', async () => {
    mockAuth('other-user');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'completed',
      endDate: new Date(Date.now() - 86400000),
      item: { ownerId: 'owner-1' },
    });

    const response = await POST(createPostRequest(validReviewBody, 'other-user') as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Бронирование не принадлежит');
  });

  it('should reject owner_review from non-owner', async () => {
    mockAuth('non-owner');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'completed',
      endDate: new Date(Date.now() - 86400000),
      item: { ownerId: 'owner-1' },
    });

    const response = await POST(
      createPostRequest({ ...validReviewBody, type: 'owner_review' }, 'non-owner') as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('владельцем');
  });

  it('should reject duplicate review', async () => {
    mockAuth('renter-1');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'completed',
      endDate: new Date(Date.now() - 86400000),
      item: { ownerId: 'owner-1' },
    });
    prismaMock.review.findUnique.mockResolvedValue({ id: 'existing-review' }); // already exists

    const response = await POST(createPostRequest(validReviewBody, 'renter-1') as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('уже оставили');
  });

  it('should reject review before rental end date', async () => {
    mockAuth('renter-1');
    const futureDate = new Date(Date.now() + 7 * 86400000);
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'active',
      endDate: futureDate,
      item: { ownerId: 'owner-1' },
    });

    const response = await POST(createPostRequest(validReviewBody, 'renter-1') as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('после завершения');
  });

  it('should update item and owner rating after renter_review', async () => {
    mockAuth('renter-1');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'completed',
      endDate: new Date(Date.now() - 86400000),
      item: { id: 'item-1', ownerId: 'owner-1' },
    });
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.review.create.mockResolvedValue({
      id: 'review-new',
      bookingId: 'booking-1',
      itemId: 'item-1',
      userId: 'renter-1',
      rating: 4,
      text: 'Good!',
      photos: [],
      type: 'renter_review',
      createdAt: new Date(),
    });

    // Aggregate rating for item
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 } });

    const response = await POST(createPostRequest({
      ...validReviewBody,
      rating: 4,
      text: 'Good experience overall!',
    }, 'renter-1') as any);

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('should update renter rating after owner_review', async () => {
    mockAuth('owner-1');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'completed',
      endDate: new Date(Date.now() - 86400000),
      item: { id: 'item-1', ownerId: 'owner-1' },
    });
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.review.create.mockResolvedValue({
      id: 'review-new',
      bookingId: 'booking-1',
      itemId: 'item-1',
      userId: 'owner-1',
      rating: 3,
      text: 'Not great renter',
      photos: [],
      type: 'owner_review',
      createdAt: new Date(),
    });

    // Aggregate renter rating
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 3 } });

    const response = await POST(
      createPostRequest({
        ...validReviewBody,
        type: 'owner_review',
        rating: 3,
        text: 'Not great renter',
      }, 'owner-1') as any
    );

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'renter-1' },
      data: { rating: 3 },
    });
  });
});
