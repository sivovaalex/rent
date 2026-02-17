import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Фильтр по свободности на даты', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('отображает поля фильтра по датам в каталоге', async ({ page }) => {
    const dateFromInput = page.locator('input[aria-label="Свободно с"]');
    const dateToInput = page.locator('input[aria-label="Свободно по"]');

    await expect(dateFromInput).toBeVisible({ timeout: 5000 });
    await expect(dateToInput).toBeVisible();
  });

  test('отправляет параметры availableFrom и availableTo при поиске', async ({ page }) => {
    const dateFromInput = page.locator('input[aria-label="Свободно с"]');
    const dateToInput = page.locator('input[aria-label="Свободно по"]');

    await dateFromInput.fill('2026-03-01');
    await dateToInput.fill('2026-03-10');

    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/items') &&
      req.url().includes('availableFrom=2026-03-01') &&
      req.url().includes('availableTo=2026-03-10')
    );

    await page.locator('button:has-text("Поиск")').click();

    const request = await requestPromise;
    expect(request.url()).toContain('availableFrom=2026-03-01');
    expect(request.url()).toContain('availableTo=2026-03-10');
  });

  test('сброс фильтров очищает поля дат', async ({ page }) => {
    const dateFromInput = page.locator('input[aria-label="Свободно с"]');
    const dateToInput = page.locator('input[aria-label="Свободно по"]');

    await dateFromInput.fill('2026-03-01');
    await dateToInput.fill('2026-03-10');

    // Reset button should appear
    const resetButton = page.locator('button:has-text("Сбросить все фильтры")');
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await resetButton.click();

    await expect(dateFromInput).toHaveValue('');
    await expect(dateToInput).toHaveValue('');
  });
});
