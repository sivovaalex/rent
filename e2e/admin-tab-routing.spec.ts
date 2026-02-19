import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Admin tab URL routing', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.admin);
    await loginViaLocalStorage(page, mockUsers.admin);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 15000 });
  });

  test('/#admin открывает вкладку Статистика', async ({ page }) => {
    await page.goto('/#admin');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const statsTab = page.locator('[role="tab"]:has-text("Статистика")').first();
    await expect(statsTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  });

  test('/#admin-stats открывает вкладку Статистика', async ({ page }) => {
    await page.goto('/#admin-stats');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const statsTab = page.locator('[role="tab"]:has-text("Статистика")').first();
    await expect(statsTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  });

  test('/#admin-verification открывает вкладку Верификация', async ({ page }) => {
    await page.goto('/#admin-verification');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const verificationTab = page.locator('[role="tab"]:has-text("Верификация")').first();
    await expect(verificationTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  });

  test('/#admin-verification-history открывает Верификацию с активной Историей', async ({ page }) => {
    await page.goto('/#admin-verification-history');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const verificationTab = page.locator('[role="tab"]:has-text("Верификация")').first();
    await expect(verificationTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });

    // "История" button should be active (has indigo styling)
    const historyBtn = page.locator('button:has-text("История")').first();
    await expect(historyBtn).toBeVisible({ timeout: 5000 });
    await expect(historyBtn).toHaveClass(/bg-indigo-100/);
  });

  test('/#admin-users открывает вкладку Пользователи', async ({ page }) => {
    await page.goto('/#admin-users');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const usersTab = page.locator('[role="tab"]:has-text("Пользователи")').first();
    await expect(usersTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  });

  test('клик по Верификация обновляет хэш на #admin-verification', async ({ page }) => {
    await page.goto('/#admin');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const verificationTab = page.locator('[role="tab"]:has-text("Верификация")').first();
    await verificationTab.click();

    await expect(page).toHaveURL(/#admin-verification/, { timeout: 3000 });
  });

  test('клик по Пользователи обновляет хэш на #admin-users', async ({ page }) => {
    await page.goto('/#admin');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const usersTab = page.locator('[role="tab"]:has-text("Пользователи")').first();
    await usersTab.click();

    await expect(page).toHaveURL(/#admin-users/, { timeout: 3000 });
  });

  test('клик по История обновляет хэш на #admin-verification-history', async ({ page }) => {
    await page.goto('/#admin-verification');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const historyBtn = page.locator('button:has-text("История")').first();
    await historyBtn.click();

    await expect(page).toHaveURL(/#admin-verification-history/, { timeout: 3000 });
  });

  test('клик по Ожидание обновляет хэш на #admin-verification', async ({ page }) => {
    await page.goto('/#admin-verification-history');
    await expect(page.locator('text=Админ Платформы')).toBeVisible({ timeout: 10000 });

    const pendingBtn = page.locator('button:has-text("Ожидание")').first();
    await pendingBtn.click();

    await expect(page).toHaveURL(/#admin-verification$|#admin-verification[^-]/, { timeout: 3000 });
  });
});

test.describe('Catalog view URL routing', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, mockUsers.owner);
    await loginViaLocalStorage(page, mockUsers.owner);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 15000 });
  });

  test('/#catalog открывает каталог, хэш содержит #catalog', async ({ page }) => {
    await page.goto('/#catalog');
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('#catalog');
  });

  test('/#catalog-mine устанавливает хэш #catalog-mine', async ({ page }) => {
    await page.goto('/#catalog-mine');
    await expect(page.locator('text=Мария Владелец')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('#catalog-mine');
  });
});
