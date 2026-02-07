import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Профиль и настройки', () => {
  test.describe('Арендатор', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.renter);
      await loginViaLocalStorage(page, mockUsers.renter);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Иван Арендатор')).toBeVisible({ timeout: 15000 });
    });

    test('открывает вкладку профиля', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      await expect(page.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });
    });

    test('показывает роль пользователя', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      const profilePanel = page.locator('[role="tabpanel"]');
      await expect(profilePanel.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });
      // Роль "Арендатор" внутри панели профиля (не в хедере)
      await expect(profilePanel.getByText('Арендатор', { exact: true })).toBeVisible({ timeout: 5000 });
    });

    test('показывает рейтинг', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      await expect(page.locator('text=/4[.,]5/')).toBeVisible({ timeout: 5000 });
    });

    test('показывает настройки уведомлений', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      // Секция уведомлений может быть ниже, нужен скролл
      const notifSection = page.locator('text=Уведомления').first();
      await notifSection.scrollIntoViewIfNeeded();
      await expect(notifSection).toBeVisible({ timeout: 10000 });
    });

    test('показывает ссылку на руководство пользователя', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      const guideLink = page.locator('text=Руководство пользователя');
      await guideLink.scrollIntoViewIfNeeded();
      await expect(guideLink).toBeVisible({ timeout: 5000 });
    });

    test('ссылка на руководство ведёт на /guide', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      const guideLink = page.locator('a[href="/guide"]').first();
      await guideLink.scrollIntoViewIfNeeded();
      await expect(guideLink).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Арендодатель', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockApi(page, mockUsers.owner);
      await loginViaLocalStorage(page, mockUsers.owner);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 15000 });
    });

    test('показывает бейдж верификации', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      const profilePanel = page.locator('[role="tabpanel"]');
      await expect(profilePanel.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });
      // "Верифицирован" внутри панели профиля (не в хедере)
      await expect(profilePanel.getByText('Верифицирован')).toBeVisible({ timeout: 5000 });
    });

    test('показывает настройки одобрения бронирований', async ({ page }) => {
      await page.locator('[role="tab"]:has-text("Профиль")').click();
      await expect(page.locator('text=Профиль пользователя')).toBeVisible({ timeout: 5000 });
      const approvalSection = page.locator('text=/одобрени/i').first();
      await approvalSection.scrollIntoViewIfNeeded();
      await expect(approvalSection).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Страница руководства', () => {
    test('открывается по прямому URL', async ({ page }) => {
      await page.goto('/guide', { waitUntil: 'networkidle' });
      await expect(page.locator('h1:has-text("Руководство пользователя")')).toBeVisible({ timeout: 10000 });
    });

    test('содержит FAQ секцию', async ({ page }) => {
      await page.goto('/guide', { waitUntil: 'networkidle' });
      await expect(page.locator('#faq')).toBeVisible({ timeout: 10000 });
    });

    test('содержит основные секции', async ({ page }) => {
      await page.goto('/guide', { waitUntil: 'networkidle' });
      await expect(page.locator('#getting-started')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#booking')).toBeVisible({ timeout: 10000 });
    });

    test('кнопка «На главную» ведёт на /', async ({ page }) => {
      await page.goto('/guide', { waitUntil: 'networkidle' });
      const homeLink = page.locator('a[href="/"]').first();
      await expect(homeLink).toBeVisible({ timeout: 10000 });
    });
  });
});
