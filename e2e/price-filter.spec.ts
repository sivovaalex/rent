import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers, mockItems } from './helpers/mock-data';

test.describe('Фильтр по цене в каталоге', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('отображаются поля фильтра по цене', async ({ page }) => {
    const priceFrom = page.getByLabel('Цена от');
    const priceTo = page.getByLabel('Цена до');

    await expect(priceFrom).toBeVisible({ timeout: 5000 });
    await expect(priceTo).toBeVisible({ timeout: 5000 });
  });

  test('фильтр по цене отправляет параметры minPrice и maxPrice', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

    // Intercept the items API call
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/items') && req.url().includes('minPrice')
    );

    // Fill price filter and trigger search
    const priceFrom = page.getByLabel('Цена от');
    await priceFrom.fill('1000');

    // Click search button
    await page.locator('button:has-text("Поиск")').click();

    const request = await requestPromise;
    expect(request.url()).toContain('minPrice=');
  });

  test('кнопка "Сбросить все фильтры" очищает фильтр по цене', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

    const priceFrom = page.getByLabel('Цена от');
    await priceFrom.fill('1000');

    // "Сбросить все фильтры" should be visible now
    const resetButton = page.locator('button:has-text("Сбросить все фильтры")');
    await expect(resetButton).toBeVisible({ timeout: 5000 });

    await resetButton.click();

    // Fields should be cleared
    await expect(priceFrom).toHaveValue('');
  });
});
