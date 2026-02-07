import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Бронирования', () => {
  test.describe('Арендатор', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.renter);
      await loginViaLocalStorage(page, mockUsers.renter);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
    });

    test('отображает список бронирований', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    });

    test('показывает статус бронирования', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=/ожида|завершён|Завершён|pending/i')).toBeVisible({ timeout: 10000 });
    });

    test('показывает завершённое бронирование', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=Велосипед Trek Marlin 7')).toBeVisible({ timeout: 10000 });
    });

    test('открывает карточку товара из каталога', async ({ page }) => {
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
      await page.locator('text=Камера Sony A7III').first().click();
      await expect(page.locator('text=Профессиональная камера')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Арендодатель', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.owner);
      await loginViaLocalStorage(page, mockUsers.owner);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 15000 });
    });

    test('видит входящие заявки на бронирование', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    });

    test('видит вкладку аналитики', async ({ page }) => {
      const analyticsTab = page.locator('[role="tab"]:has-text("Аналитика")');
      await expect(analyticsTab).toBeVisible({ timeout: 5000 });
      await analyticsTab.click();
    });

    test('может перейти к одобрению бронирования', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    });
  });
});
