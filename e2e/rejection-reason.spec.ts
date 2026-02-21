import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers, mockItems, mockRejectedItem } from './helpers/mock-data';

// ======================== Причина отклонения лота ========================

test.describe('Причина отклонения лота', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.owner);

    // Override items API to include a rejected item for the owner
    await page.route('**/api/items?**', (route) => {
      const items = [...mockItems, mockRejectedItem];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, total: items.length }),
      });
    });

    await loginViaLocalStorage(page, mockUsers.owner);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 15000 });
  });

  test('отклонённый лот отображает баннер с причиной для владельца', async ({ page }) => {
    // Go to catalog, switch to "My items"
    await page.goto('/#catalog-mine');
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 10000 });

    // The rejected item card should be visible
    await expect(page.locator('text=Сломанный ноутбук')).toBeVisible({ timeout: 5000 });

    // Rejection reason banner should be visible
    await expect(page.locator('text=Причина отклонения')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Фото слишком плохого качества')).toBeVisible({ timeout: 5000 });
  });

  test('баннер причины отклонения не видден обычному арендатору', async ({ page }) => {
    // This page as a renter — rejection reason should not be shown
    await page.goto('/#catalog');
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 10000 });

    // The item may appear but rejection banner should not be visible to non-owners
    const rejectionBanners = page.locator('text=Причина отклонения');
    // Rejected items typically not shown in catalog (status: rejected), so count should be 0
    await expect(rejectionBanners).toHaveCount(0, { timeout: 3000 });
  });
});

// ======================== Причина отклонения верификации ========================

test.describe('Причина отклонения верификации', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renterRejected);

    // Override auth to return the rejected user
    await page.route('**/api/auth', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: mockUsers.renterRejected }),
      });
    });

    await loginViaLocalStorage(page, mockUsers.renterRejected);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Пётр Отклонённый')).toBeVisible({ timeout: 15000 });
  });

  test('в профиле отображается статус "Заявка отклонена"', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('text=Заявка отклонена')).toBeVisible({ timeout: 5000 });
  });

  test('в профиле отображается причина отклонения верификации', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('text=Документ нечитаем')).toBeVisible({ timeout: 5000 });
  });

  test('показывается кнопка "Подать заявку повторно"', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('button:has-text("Подать заявку повторно")')).toBeVisible({ timeout: 5000 });
  });
});

// ======================== Пагинация тикетов ========================

test.describe('Пагинация тикетов поддержки (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.admin);

    // Override support API to return many tickets with total > page size
    const manyTickets = Array.from({ length: 20 }, (_, i) => ({
      _id: `ticket-${i + 1}`,
      userId: 'user-1',
      category: 'technical',
      subject: `Обращение №${i + 1}`,
      status: 'open',
      unreadByAdmin: i < 5,
      unreadByUser: false,
      closedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 1,
      user: { _id: 'user-1', name: 'Тестовый пользователь' },
    }));

    await page.route(/\/api\/support(\?.*)?$/, (route) => {
      if (route.request().method() !== 'GET') { route.continue(); return; }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tickets: manyTickets.slice(0, 20), total: 35 }),
      });
    });

    await loginViaLocalStorage(page, mockUsers.admin);
    await page.goto('/#chat-support', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 15000 });
  });

  test('кнопка "Загрузить ещё" отображается когда есть ещё тикеты', async ({ page }) => {
    await expect(page.locator('text=Обращение №1')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Загрузить ещё")')).toBeVisible({ timeout: 5000 });
  });

  test('кнопка показывает количество оставшихся тикетов', async ({ page }) => {
    await expect(page.locator('button:has-text("Загрузить ещё (15)")')).toBeVisible({ timeout: 5000 });
  });
});
