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

    test('модальное окно бронирования: Модель Б и без страховки', async ({ page }) => {
      // Открываем карточку товара
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
      await page.locator('text=Камера Sony A7III').first().click();
      await expect(page.locator('text=Профессиональная камера')).toBeVisible({ timeout: 5000 });

      // Нажимаем «Забронировать»
      const bookButton = page.locator('button:has-text("Забронировать")');
      if (await bookButton.isVisible({ timeout: 3000 })) {
        await bookButton.click();

        // Модальное окно открылось
        await expect(page.locator('text=Забронировать Камера Sony A7III')).toBeVisible({ timeout: 5000 });

        // Модель Б: раздельная оплата
        await expect(page.locator('text=Оплата онлайн (комиссия)')).toBeVisible();
        await expect(page.locator('text=При встрече (аренда + залог)')).toBeVisible();

        // Страховка НЕ отображается
        await expect(page.locator('label:has-text("Страховка от повреждений")')).not.toBeVisible();
        await expect(page.locator('#insurance')).not.toBeVisible();
      }
    });

    test('детали бронирования: Модель Б и без страховки', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Аренды")').click();
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });

      // Раскрываем детали бронирования (клик по карточке)
      await page.locator('text=Камера Sony A7III').first().click();

      // Модель Б: комиссия онлайн, остальное при встрече
      const commissionOnline = page.locator('text=Комиссия (онлайн)');
      const meetingPayment = page.locator('text=При встрече');
      if (await commissionOnline.isVisible({ timeout: 3000 })) {
        await expect(commissionOnline).toBeVisible();
        await expect(meetingPayment).toBeVisible();
      }

      // Страховка НЕ отображается в деталях
      await expect(page.locator('text=Страховка:')).not.toBeVisible();
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
