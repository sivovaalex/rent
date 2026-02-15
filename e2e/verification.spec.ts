import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Верификация — тип арендодателя', () => {
  test.beforeEach(async ({ page }) => {
    // Use renter (not verified) to see verification button
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('модалка верификации содержит селект типа арендодателя', async ({ page }) => {
    // Navigate to profile tab
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });

    // Click verification button
    const verifyButton = page.locator('text=Пройти верификацию').first();
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.click();

    // Verify modal opened
    await expect(page.locator('text=Верификация личности')).toBeVisible({ timeout: 5000 });

    // Should see owner type selector
    await expect(page.locator('text=Тип арендодателя')).toBeVisible({ timeout: 3000 });

    // Should see document type selector
    await expect(page.locator('text=Тип документа')).toBeVisible({ timeout: 3000 });
  });

  test('выбор ИП показывает поля ИНН и ОГРН', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });

    const verifyButton = page.locator('text=Пройти верификацию').first();
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.click();

    await expect(page.locator('text=Верификация личности')).toBeVisible({ timeout: 5000 });

    // Click owner type selector and choose IP
    const ownerTypeSelect = page.locator('text=Тип арендодателя').locator('..').locator('button[role="combobox"]');
    await ownerTypeSelect.click();
    await page.locator('[role="option"]:has-text("Индивидуальный предприниматель")').click();

    // INN and OGRN fields should appear
    await expect(page.locator('text=ИНН')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=ОГРНИП')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Данные ИП')).toBeVisible({ timeout: 3000 });
  });

  test('выбор юр. лица показывает поля ИНН и ОГРН', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });

    const verifyButton = page.locator('text=Пройти верификацию').first();
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.click();

    await expect(page.locator('text=Верификация личности')).toBeVisible({ timeout: 5000 });

    // Click owner type selector and choose legal entity
    const ownerTypeSelect = page.locator('text=Тип арендодателя').locator('..').locator('button[role="combobox"]');
    await ownerTypeSelect.click();
    await page.locator('[role="option"]:has-text("Юридическое лицо")').click();

    // INN and OGRN fields should appear
    await expect(page.locator('text=ИНН')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=ОГРН')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Данные юр. лица')).toBeVisible({ timeout: 3000 });
  });

  test('физ. лицо — поля ИНН/ОГРН скрыты', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Профиль")').click();
    await expect(page.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });

    const verifyButton = page.locator('text=Пройти верификацию').first();
    await verifyButton.scrollIntoViewIfNeeded();
    await verifyButton.click();

    await expect(page.locator('text=Верификация личности')).toBeVisible({ timeout: 5000 });

    // Default is individual — INN/OGRN fields should NOT be visible
    await expect(page.locator('text=Данные ИП')).not.toBeVisible();
    await expect(page.locator('text=Данные юр. лица')).not.toBeVisible();
  });
});
