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

  test('вкладка "Поддержка" видна в разделе Чат', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await expect(page.locator('[role="tab"]:has-text("Поддержка")').first()).toBeVisible({ timeout: 5000 });
  });

  test('клик по вкладке "Поддержка" показывает раздел поддержки', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('[role="tab"]:has-text("Поддержка")').first().click();
    await expect(page.locator('h2:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });
  });

  test('URL меняется на /#chat-support при переходе на вкладку поддержки', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Сообщения")').click();
    await page.locator('[role="tab"]:has-text("Поддержка")').first().click();
    await expect(page).toHaveURL(/#chat-support/, { timeout: 3000 });
  });

  test('прямой переход по /#chat-support открывает вкладку поддержки', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h2:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });
  });

  test('отображается список тикетов', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Не работает оплата')).toBeVisible({ timeout: 5000 });
  });

  test('кнопка "Новое обращение" показывает форму', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Новое обращение")').click();

    await expect(page.locator('h2:has-text("Новое обращение")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Категория')).toBeVisible();
    await expect(page.locator('text=Тема')).toBeVisible();
    await expect(page.locator('text=Сообщение')).toBeVisible();
  });

  test('форма имеет кнопку отправки', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Новое обращение")').click();
    await expect(page.locator('button:has-text("Отправить обращение")')).toBeVisible({ timeout: 5000 });
  });

  test('клик по тикету открывает историю переписки', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Не работает оплата').click();
    await expect(page.locator('text=Не могу оплатить')).toBeVisible({ timeout: 5000 });
  });

  test('возврат к списку тикетов по кнопке назад', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 10000 });
    await page.locator('text=Не работает оплата').click();
    await expect(page.locator('text=Не могу оплатить')).toBeVisible({ timeout: 5000 });

    // Back button (ArrowLeft)
    const backBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await backBtn.click();
    await expect(page.locator('h2:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Служба поддержки — Админ (через Chat)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.admin);
    await loginViaLocalStorage(page, mockUsers.admin);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 15000 });
  });

  test('/#chat-support открывает вкладку Поддержка в Чате', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h2:has-text("Служба поддержки")')).toBeVisible({ timeout: 5000 });
  });

  test('список обращений отображается в разделе Чат-Поддержка', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Не работает оплата')).toBeVisible({ timeout: 5000 });
  });

  test('фильтры статусов видны в admin-режиме', async ({ page }) => {
    await page.goto('/#chat-support');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Открыто")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("В работе")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Закрыто")')).toBeVisible({ timeout: 5000 });
  });
});
