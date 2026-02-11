import { test, expect } from '@playwright/test';

test.describe('Юридические страницы', () => {
  test('оферта: Модель Б — комиссия онлайн, аренда и залог при встрече', async ({ page }) => {
    await page.goto('/legal/offer', { waitUntil: 'domcontentloaded' });

    // Заголовок страницы
    await expect(page.locator('h1:has-text("Публичная оферта")')).toBeVisible({ timeout: 10000 });

    // Модель Б: комиссия онлайн
    await expect(page.locator('text=комиссию Платформы онлайн при оформлении бронирования')).toBeVisible();
    // Аренда и залог при встрече
    await expect(page.locator('text=аренды и залог передаются Арендодателю при личной встрече')).toBeVisible();

    // Платформа не несёт ответственности за предметы
    await expect(page.locator('text=Качество и состояние арендуемых предметов')).toBeVisible();
    await expect(page.locator('text=не несёт ответственности за исполнение')).toBeVisible();
  });

  test('пользовательское соглашение: комиссия онлайн, аренда при встрече', async ({ page }) => {
    await page.goto('/legal/terms', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1:has-text("Пользовательское соглашение")')).toBeVisible({ timeout: 10000 });

    // Комиссия онлайн
    await expect(page.locator('text=Комиссия оплачивается Арендатором онлайн')).toBeVisible();
    // При встрече
    await expect(page.locator('text=залог передаются Арендодателю при личной встрече')).toBeVisible();

    // Платформа — посредник
    await expect(page.locator('text=Платформа является посредником')).toBeVisible();
  });

  test('правила аренды: модель Б и отсутствие страховки', async ({ page }) => {
    await page.goto('/legal/rental-rules', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1:has-text("Правила аренды")')).toBeVisible({ timeout: 10000 });

    // Оплата комиссии онлайн
    await expect(page.locator('text=оплатите комиссию сервиса онлайн')).toBeVisible();
    // Аренда и залог при встрече
    await expect(page.locator('text=аренды и залог передаются Арендодателю')).toBeVisible();

    // Политика отмены — возврат комиссии
    await expect(page.locator('text=полный возврат комиссии')).toBeVisible();

    // Страхование НЕ отображается (закомментировано)
    await expect(page.locator('h2:has-text("Страхование")')).not.toBeVisible();
    await expect(page.locator('text=Опциональное страхование')).not.toBeVisible();
  });

  test('страница "О компании" без упоминания страхования', async ({ page }) => {
    await page.goto('/legal/about', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1:has-text("О компании")')).toBeVisible({ timeout: 10000 });

    // Не должно быть слова "страхования"
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('страхования');
  });

  test('индексная страница /legal содержит ссылки на документы', async ({ page }) => {
    await page.goto('/legal', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('a[href="/legal/offer"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href="/legal/terms"]')).toBeVisible();
    await expect(page.locator('a[href="/legal/rental-rules"]')).toBeVisible();
    await expect(page.locator('a[href="/legal/privacy"]')).toBeVisible();
  });
});
