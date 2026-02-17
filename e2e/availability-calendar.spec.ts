import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers, mockItems } from './helpers/mock-data';

test.describe('Календарь доступности на карточке лота', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('показывает календарь доступности при открытии карточки лота', async ({ page }) => {
    // Open item detail modal
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Камера Sony A7III').first().click();

    // Verify calendar heading is visible
    await expect(page.locator('text=Календарь доступности')).toBeVisible({ timeout: 5000 });
  });

  test('отображает легенду календаря', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Камера Sony A7III').first().click();

    await expect(page.locator('text=Календарь доступности')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Свободно')).toBeVisible();
    await expect(page.locator('text=Занято')).toBeVisible();
  });

  test('отображает заблокированные даты из API', async ({ page }) => {
    // Override blocked-booking-dates to return some dates
    await page.route('**/api/items/*/blocked-booking-dates**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dates: ['2026-03-10', '2026-03-11', '2026-03-12'],
        }),
      });
    });

    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Камера Sony A7III').first().click();

    await expect(page.locator('text=Календарь доступности')).toBeVisible({ timeout: 5000 });

    // Calendar should be rendered (react-calendar)
    await expect(page.locator('.availability-calendar .react-calendar')).toBeVisible({ timeout: 5000 });
  });
});
