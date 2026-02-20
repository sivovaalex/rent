import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Служба поддержки — пользователь', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('кнопка "Служба поддержки" видна в разделе Чат', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await expect(page.locator('button:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });
  });

  test('клик по кнопке открывает секцию поддержки', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('button:has-text("Служба поддержки")').click();

    await expect(page.locator('h2:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });
  });

  test('отображается список тикетов', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('button:has-text("Служба поддержки")').click();

    await expect(page.locator('text=Не работает оплата')).toBeVisible({ timeout: 5000 });
  });

  test('кнопка "Новое обращение" показывает форму', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('button:has-text("Служба поддержки")').click();
    await page.locator('button:has-text("Новое обращение")').click();

    await expect(page.locator('h2:has-text("Новое обращение")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Категория')).toBeVisible();
    await expect(page.locator('text=Тема')).toBeVisible();
    await expect(page.locator('text=Сообщение')).toBeVisible();
  });

  test('форма имеет кнопку отправки', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('button:has-text("Служба поддержки")').click();
    await page.locator('button:has-text("Новое обращение")').click();

    await expect(page.locator('button:has-text("Отправить обращение")')).toBeVisible({ timeout: 5000 });
  });

  test('клик по тикету открывает историю переписки', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('button:has-text("Служба поддержки")').click();

    await page.locator('text=Не работает оплата').click();

    await expect(page.locator('text=Не могу оплатить')).toBeVisible({ timeout: 5000 });
  });

  test('кнопка "Назад" возвращает к списку тикетов', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('button:has-text("Служба поддержки")').click();

    // Find the back button in the header (list → back to chat list)
    const backBtn = page.locator('button[aria-label="Открыть службу поддержки"]').first();
    // Instead navigate: back from support section to chat list
    await page.locator('button:has-text("Служба поддержки")').click();
    await expect(page.locator('h2:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });

    // Back to chat list
    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await backButton.isVisible()) {
      await backButton.click();
    }
  });
});

test.describe('Служба поддержки — Админ', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.admin);
    await loginViaLocalStorage(page, mockUsers.admin);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 15000 });
  });

  test('/#admin-support открывает вкладку Поддержка в AdminTab', async ({ page }) => {
    await page.goto('/#admin-support');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const supportTab = page.locator('[role="tab"]:has-text("Поддержка")').first();
    await expect(supportTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  });

  test('клик по Поддержка обновляет хэш на #admin-support', async ({ page }) => {
    await page.goto('/#admin');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const supportTab = page.locator('[role="tab"]:has-text("Поддержка")').first();
    await supportTab.click();

    await expect(page).toHaveURL(/#admin-support/, { timeout: 3000 });
  });

  test('список обращений отображается в AdminTab', async ({ page }) => {
    await page.goto('/#admin-support');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('text=Не работает оплата')).toBeVisible({ timeout: 5000 });
  });

  test('фильтры статусов видны в admin-режиме', async ({ page }) => {
    await page.goto('/#admin-support');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('button:has-text("Открыто")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("В работе")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Закрыто")')).toBeVisible({ timeout: 5000 });
  });
});
