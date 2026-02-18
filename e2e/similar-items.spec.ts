import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Похожие предложения на карточке лота', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('показывает блок "Похожие предложения" при открытии карточки лота', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Камера Sony A7III').first().click();

    await expect(page.locator('text=Похожие предложения')).toBeVisible({ timeout: 5000 });
  });

  test('отображает похожие лоты из API', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Камера Sony A7III').first().click();

    await expect(page.locator('text=Похожие предложения')).toBeVisible({ timeout: 5000 });

    // Similar items should include other mock items (not the current one)
    await expect(page.locator('text=Велосипед Trek Marlin 7')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Дрель Bosch Professional')).toBeVisible();
  });
});
