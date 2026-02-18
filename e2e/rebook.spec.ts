import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Повторное бронирование — «Арендовать снова»', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('показывает кнопку «Арендовать снова» на завершённом бронировании', async ({ page }) => {
    // Navigate to bookings tab
    await page.locator('[role="tab"]:has-text("Аренды")').click();
    await expect(page.locator('text=Велосипед Trek Marlin 7')).toBeVisible({ timeout: 10000 });

    // The completed booking (booking-2) should have "Арендовать снова"
    await expect(page.locator('text=Арендовать снова')).toBeVisible({ timeout: 5000 });
  });

  test('открывает модал бронирования по клику на «Арендовать снова»', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Аренды")').click();
    await expect(page.locator('text=Арендовать снова')).toBeVisible({ timeout: 10000 });

    await page.locator('text=Арендовать снова').click();

    // Booking modal should appear with item title
    await expect(page.locator('text=Бронирование')).toBeVisible({ timeout: 5000 });
  });
});
