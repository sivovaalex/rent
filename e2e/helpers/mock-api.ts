import { Page } from '@playwright/test';
import {
  mockUsers,
  mockItems,
  mockBookings,
  mockConversations,
  mockMessages,
  mockReviews,
  mockNotificationSettings,
} from './mock-data';

type MockUser = typeof mockUsers.renter | typeof mockUsers.owner | typeof mockUsers.admin;

/**
 * Сохраняет пользователя в localStorage браузера для имитации авторизации.
 * Вызывать ДО page.goto().
 */
export async function loginViaLocalStorage(page: Page, user: MockUser) {
  // Сначала открываем пустую страницу для доступа к localStorage домена
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(
    ({ user, token }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_token', token);
    },
    { user, token: 'mock-jwt-token' }
  );
}

/**
 * Очищает localStorage (выход из системы).
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
  });
}

/**
 * Настраивает перехват всех API-запросов для E2E тестов.
 * Все данные возвращаются из мок-объектов, реальный бэкенд не нужен.
 */
export async function setupMockApi(page: Page, currentUser: MockUser = mockUsers.renter) {
  // Блокируем Supabase WebSocket/realtime чтобы не было ошибок подключения
  await page.route(/supabase/, (route) => route.abort());
  await page.route(/realtime/, (route) => route.abort());

  // Catch-all: перехватываем ВСЕ API-запросы, чтобы ничего не уходило на реальный сервер.
  // Добавляется ПЕРВЫМ → будет иметь НАИМЕНЬШИЙ приоритет (Playwright LIFO).
  await page.route(/\/api\//, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // === AUTH ===
  // Login: PATCH /api/auth
  await page.route('**/api/auth', (route) => {
    if (route.request().method() === 'PATCH') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: currentUser, token: 'mock-jwt-token' }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: currentUser }),
      });
    }
  });

  // Register: POST /api/auth/register — returns emailVerificationRequired
  await page.route('**/api/auth/register', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Регистрация успешна! Проверьте почту для подтверждения email.',
        emailVerificationRequired: true,
      }),
    });
  });

  await page.route('**/api/auth/forgot-password', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Ссылка отправлена' }),
    });
  });

  await page.route('**/api/auth/sms/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // === ITEMS / CATALOG ===
  await page.route('**/api/items?**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: mockItems, total: mockItems.length }),
    });
  });

  await page.route(/\/api\/items\/item-[^/]+$/, (route) => {
    const url = route.request().url();
    const match = url.match(/\/api\/items\/(item-\d+)/);
    const id = match?.[1];
    const item = mockItems.find((i) => i._id === id) || mockItems[0];
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(item),
    });
  });

  await page.route('**/api/items/*/blocked-booking-dates**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dates: [] }),
    });
  });

  await page.route('**/api/items/*/similar**', (route) => {
    // Return other items as similar
    const url = route.request().url();
    const match = url.match(/\/api\/items\/(item-\d+)\/similar/);
    const currentId = match?.[1];
    const similar = mockItems.filter((i) => i._id !== currentId).slice(0, 4);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: similar }),
    });
  });

  // === BOOKINGS ===
  await page.route(/\/api\/bookings(\?.*)?$/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bookings: mockBookings }),
    });
  });

  await page.route('**/api/items/*/book', (route) => {
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ booking: mockBookings[0] }),
    });
  });

  await page.route('**/api/bookings/*/approve', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ booking: { ...mockBookings[0], status: 'paid' } }),
    });
  });

  await page.route('**/api/bookings/*/reject', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ booking: { ...mockBookings[0], status: 'cancelled' } }),
    });
  });

  await page.route('**/api/bookings/*/cancel', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ booking: { ...mockBookings[0], status: 'cancelled' } }),
    });
  });

  await page.route('**/api/bookings/*/confirm-return', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ booking: { ...mockBookings[1], status: 'completed' } }),
    });
  });

  // === CHAT ===
  await page.route(/\/api\/chat(\?.*)?$/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ conversations: mockConversations }),
    });
  });

  await page.route(/\/api\/chat\/booking-/, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: mockMessages,
          itemTitle: 'Камера Sony A7III',
          itemPhoto: '/uploads/camera.jpg',
          otherUser: { _id: 'user-owner-1', name: 'Мария Владелец' },
        }),
      });
    } else {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: {
            _id: 'msg-new',
            bookingId: 'booking-1',
            senderId: currentUser._id,
            text: 'Новое сообщение',
            createdAt: new Date().toISOString(),
            isRead: false,
          },
        }),
      });
    }
  });

  await page.route('**/api/chat/unread**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unreadCount: 1 }),
    });
  });

  // === REVIEWS ===
  await page.route(/\/api\/reviews(\?.*)?$/, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reviews: mockReviews }),
      });
    } else {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          review: {
            _id: 'review-new',
            bookingId: 'booking-2',
            userId: currentUser._id,
            user: currentUser,
            rating: 5,
            text: 'Отличный опыт аренды!',
            photos: [],
            type: 'renter_review',
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }
  });

  // === PROFILE ===
  await page.route(/\/api\/profile(\?.*)?$/, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: currentUser }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...currentUser, name: 'Обновлённое Имя' } }),
      });
    }
  });

  await page.route('**/api/auth/change-password', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Пароль успешно изменён' }),
    });
  });

  await page.route('**/api/trust**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        trustScore: currentUser.trustScore,
        badges: currentUser.isVerified ? ['verified', 'trusted'] : ['newcomer'],
      }),
    });
  });

  // === NOTIFICATIONS ===
  await page.route(/\/api\/notifications\/settings/, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotificationSettings),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockNotificationSettings, pushNotifications: true }),
      });
    }
  });

  // === FAVORITES ===
  await page.route(/\/api\/favorites/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // === UPLOAD ===
  await page.route('**/api/upload**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/uploads/mock-photo.jpg' }),
    });
  });

  // === ANALYTICS ===
  await page.route('**/api/analytics**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalRevenue: 150000,
        totalBookings: 25,
        activeItems: 3,
        averageRating: 4.7,
      }),
    });
  });

  // === ADMIN ===
  await page.route('**/api/admin/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: [], items: [], stats: {} }),
    });
  });

  // === SUPPORT ===
  const mockSupportTickets = [
    {
      _id: 'ticket-1',
      userId: currentUser._id,
      category: 'technical',
      subject: 'Не работает оплата',
      status: 'open',
      unreadByAdmin: true,
      unreadByUser: false,
      closedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 1,
    },
  ];

  await page.route(/\/api\/support\/[^/]+\/messages/, (route) => {
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        message: {
          _id: 'msg-new',
          ticketId: 'ticket-1',
          userId: currentUser._id,
          isAdmin: false,
          text: 'Новое сообщение',
          createdAt: new Date().toISOString(),
          user: { _id: currentUser._id, name: currentUser.name },
        },
      }),
    });
  });

  await page.route(/\/api\/support\/[^/]+$/, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ticket: mockSupportTickets[0],
          messages: [
            {
              _id: 'msg-1',
              ticketId: 'ticket-1',
              userId: currentUser._id,
              isAdmin: false,
              text: 'Не могу оплатить',
              createdAt: new Date().toISOString(),
              user: { _id: currentUser._id, name: currentUser.name },
            },
          ],
        }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ticket: { ...mockSupportTickets[0], status: 'closed' } }),
      });
    }
  });

  await page.route(/\/api\/support(\?.*)?$/, (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ticket: mockSupportTickets[0] }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tickets: mockSupportTickets, total: mockSupportTickets.length }),
      });
    }
  });
}
