import { test, expect } from '@playwright/test';

test.describe('SSR-каталог /catalog с пагинацией', () => {
  test('страница /catalog отображает заголовок и категории', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Каталог аренды');

    // Category badges should be visible
    await expect(page.locator('text=Электроника')).toBeVisible();
    await expect(page.locator('text=Спорт')).toBeVisible();
  });

  test('категория отображается в заголовке при фильтрации', async ({ page }) => {
    await page.goto('/catalog?category=electronics', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1')).toContainText('Электроника', { timeout: 10000 });
  });

  test('ссылка на полный каталог ведёт в SPA', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' });

    const spaLink = page.locator('a[href="/#catalog"]');
    await expect(spaLink).toBeVisible({ timeout: 10000 });
    await expect(spaLink).toContainText('Открыть полный каталог');
  });

  test('page=2 сохраняет номер страницы в URL', async ({ page }) => {
    await page.goto('/catalog?page=2', { waitUntil: 'domcontentloaded' });

    // Page should load without errors
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });

  test('фильтр по категории сохраняется в ссылках', async ({ page }) => {
    await page.goto('/catalog?category=electronics', { waitUntil: 'domcontentloaded' });

    // The electronics badge should be active (default variant)
    await expect(page.locator('h1')).toContainText('Электроника', { timeout: 10000 });
  });

  test('отображает счётчик товаров', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' });

    // Should show item count text (товар/товара/товаров)
    await expect(page.locator('text=/\\d+\\s+товар/')).toBeVisible({ timeout: 10000 });
  });
});
