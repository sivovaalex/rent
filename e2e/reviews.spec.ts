import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers, mockBookings, mockReviews } from './helpers/mock-data';

test.describe('Отзывы', () => {
  test.describe('Просмотр отзывов', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.renter);
      await loginViaLocalStorage(page, mockUsers.renter);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
    });

    test('отзывы видны в профиле', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      await expect(page.locator('text=/[Оо]тзыв/')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Создание отзыва', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.renter);

      // Переопределяем мок бронирований — завершённое без отзыва
      await page.route(/\/api\/bookings(\?.*)?$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            bookings: [
              {
                ...mockBookings[1],
                status: 'completed',
                reviews: [],
              },
            ],
          }),
        });
      });

      await loginViaLocalStorage(page, mockUsers.renter);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
    });

    test('показывает кнопку "Оставить отзыв" для завершённого бронирования', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();

      const reviewButton = page.locator('button:has-text("Отзыв"), button:has-text("Оценить"), button:has-text("отзыв")').first();
      await expect(reviewButton).toBeVisible({ timeout: 10000 });
    });

    test('открывает модалку отзыва', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();

      const reviewButton = page.locator('button:has-text("Отзыв"), button:has-text("Оценить"), button:has-text("отзыв")').first();
      if (await reviewButton.isVisible({ timeout: 10000 })) {
        await reviewButton.click();
        await expect(page.getByRole('heading', { name: 'Оставить отзыв' })).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Отзывы арендодателя', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.owner);

      await page.route(/\/api\/bookings(\?.*)?$/, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            bookings: [
              {
                ...mockBookings[1],
                status: 'completed',
                reviews: [mockReviews[0]],
              },
            ],
          }),
        });
      });

      await loginViaLocalStorage(page, mockUsers.owner);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 15000 });
    });

    test('арендодатель видит завершённое бронирование с отзывом', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=Велосипед Trek Marlin 7')).toBeVisible({ timeout: 10000 });
    });
  });
});
