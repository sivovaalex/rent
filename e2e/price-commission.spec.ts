import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

/**
 * E2E: Prices displayed with commission (15%) both in catalog and item detail card.
 * Base price 3000 → displayed 3450, base 1500 → 1725, base 500 → 575
 */
test.describe('Цены с комиссией — каталог и карточка', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('в каталоге цены отображаются с комиссией 15%', async ({ page }) => {
    // Base prices: 3000, 1500, 500 → with 15% commission: 3450, 1725, 575
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

    // Check that commission-included prices are shown
    await expect(page.locator('text=/3\\s?450/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/1\\s?725/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=575')).toBeVisible({ timeout: 5000 });
  });

  test('в карточке товара цены отображаются с комиссией 15%', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

    // Open item detail modal
    await page.locator('text=Камера Sony A7III').first().click();

    // Wait for modal to load with full item details
    await expect(page.locator('text=Профессиональная камера')).toBeVisible({ timeout: 5000 });

    // Price per day: 3000 * 1.15 = 3450
    await expect(page.locator('text=/3\\s?450/')).toBeVisible({ timeout: 5000 });

    // Price per month: 50000 * 1.15 = 57500
    await expect(page.locator('text=/57\\s?500/')).toBeVisible({ timeout: 5000 });
  });

  test('базовая цена без комиссии НЕ отображается в каталоге', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

    // The base price "3 000" should NOT appear as a standalone price.
    // Note: it may appear in deposit (15000 contains "3000" substring).
    // We check that the price label specifically shows commission-included values.
    const dayPriceLocators = page.locator('text=/За день.*3\\s?000/');
    await expect(dayPriceLocators).toHaveCount(0);
  });
});
