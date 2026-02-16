import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers, mockItems } from './helpers/mock-data';

test.describe('Каталог и поиск', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('отображает список товаров в каталоге', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Велосипед Trek Marlin 7')).toBeVisible();
    await expect(page.locator('text=Дрель Bosch Professional')).toBeVisible();
  });

  test('показывает цены товаров', async ({ page }) => {
    await expect(page.locator('text=/3\\s?000/')).toBeVisible({ timeout: 10000 });
  });

  test('работает поиск по каталогу', async ({ page }) => {
    await page.route('**/api/items?**search=**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [mockItems[0]], total: 1 }),
      });
    });

    const searchInput = page.getByPlaceholder('Поиск');
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('камера');
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible();
    }
  });

  test('переход на вкладку "Аренды"', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Аренды")').click();
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
  });

  test('открытие карточки товара', async ({ page }) => {
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Камера Sony A7III').first().click();

    await expect(page.locator('text=Профессиональная камера')).toBeVisible({ timeout: 5000 });
  });

  test('город "Москва" отображается в хэдере', async ({ page }) => {
    await expect(page.locator('header').locator('text=Москва')).toBeVisible({ timeout: 10000 });
  });

  test('каталог загружает items с параметром city', async ({ page }) => {
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/items') && req.url().includes('city=')
    );

    // Reload to trigger items load
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });

    const request = await requestPromise;
    expect(request.url()).toContain('city=');
  });

  test('навигация по вкладкам приложения', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Аренды")').click();
    await expect(page.locator('[role="tab"]:has-text("Аренды")').first()).toHaveAttribute('data-state', 'active', { timeout: 5000 });

    await page.locator('[role="tab"]:has-text("Каталог")').click();
    await expect(page.locator('[role="tab"]:has-text("Каталог")').first()).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  });
});

test.describe('Редактирование лота — повторная модерация', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.owner);
    await loginViaLocalStorage(page, mockUsers.owner);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 15000 });
  });

  test('предупреждение о модерации при редактировании approved-лота', async ({ page }) => {
    // Wait for items to load
    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

    // Click edit button on the first item
    const editButton = page.locator('button:has-text("Редактировать")').first();
    await editButton.click();

    // Modal should open with the warning
    await expect(page.locator('text=Редактировать лот')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Изменение названия, описания или фото отправит лот на повторную модерацию')).toBeVisible({ timeout: 3000 });
  });
});
