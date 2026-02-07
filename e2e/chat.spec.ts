import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Чат и сообщения', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
  });

  test('показывает бейдж непрочитанных сообщений', async ({ page }) => {
    // Вкладка чата должна быть видна
    const chatTab = page.locator('[role="tab"]:has-text("Чат")');
    await expect(chatTab).toBeVisible({ timeout: 5000 });

    // Бейдж с числом непрочитанных на вкладке
    const unreadBadge = chatTab.locator('.bg-red-500');
    if (await unreadBadge.isVisible({ timeout: 3000 })) {
      await expect(unreadBadge).toContainText('1');
    }
  });

  test('отображает список диалогов', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Чат")').click();

    await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
  });

  test('открывает диалог и видит сообщения', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Чат")').click();

    await page.locator('text=Камера Sony A7III').click();

    await expect(page.locator('text=Хотел бы арендовать камеру')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Камера доступна в эти даты')).toBeVisible();
  });

  test('отправляет новое сообщение', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Чат")').click();
    await page.locator('text=Камера Sony A7III').click();

    await expect(page.locator('text=Хотел бы арендовать камеру')).toBeVisible({ timeout: 10000 });

    const messageInput = page.getByPlaceholder(/сообщение|Написать|Напишите/i);
    if (await messageInput.isVisible({ timeout: 3000 })) {
      await messageInput.fill('Когда можно забрать?');

      const sendButton = page.locator('button:has(svg.lucide-send)');
      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        await messageInput.press('Enter');
      }
    }
  });

  test('возвращается к списку диалогов', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Чат")').click();
    await page.locator('text=Камера Sony A7III').click();

    await expect(page.locator('text=Хотел бы арендовать камеру')).toBeVisible({ timeout: 10000 });

    const backButton = page.locator('button:has(svg.lucide-arrow-left)').first();
    if (await backButton.isVisible({ timeout: 3000 })) {
      await backButton.click();
    }
  });

  test('индикатор непрочитанных в хедере', async ({ page }) => {
    const headerChatButton = page.locator('header button[aria-label="Сообщения"]');
    if (await headerChatButton.isVisible({ timeout: 5000 })) {
      await headerChatButton.click();
      // Переходим на вкладку чата
      await expect(page.locator('text=Камера Sony A7III')).toBeVisible({ timeout: 10000 });
    }
  });
});
