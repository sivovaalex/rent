import { test, expect } from '@playwright/test';
import { setupMockApi, loginViaLocalStorage } from './helpers/mock-api';
import { mockUsers } from './helpers/mock-data';

test.describe('Аутентификация', () => {
  test('показывает лендинг для неавторизованного пользователя', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('header button')).toContainText('Войти');
    await expect(page.getByText('Арендол').first()).toBeVisible();
  });

  test('открывает модалку входа по клику "Войти"', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await expect(page.getByText('Введите ваши учетные данные для входа')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('выполняет вход с email и паролем', async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();

    await page.locator('#email').fill('renter@test.com');
    await page.locator('#password').fill('password123');
    await page.locator('.fixed button:has-text("Войти")').click();

    await expect(page.getByText('Иван Арендатор').first()).toBeVisible({ timeout: 15000 });
  });

  test('показывает ошибку при пустых полях входа', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await page.locator('.fixed button:has-text("Войти")').click();

    await expect(page.getByText('Пожалуйста, заполните все поля')).toBeVisible();
  });

  test('переключается на форму регистрации', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await page.getByText('Нет аккаунта? Зарегистрироваться').click();

    await expect(page.getByText('Создайте аккаунт для доступа к платформе')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
  });

  test('выполняет регистрацию с заполнением всех полей', async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await page.getByText('Нет аккаунта? Зарегистрироваться').click();

    await page.locator('#name').fill('Иван Арендатор');
    await page.locator('#register-email').fill('renter@test.com');
    await page.locator('#register-password').fill('password123');
    await page.locator('#confirm-password').fill('password123');
    await page.locator('#phone').fill('+79001234567');

    // Прокрутить к чекбоксам и кликнуть (shadcn Checkbox = button[role="checkbox"])
    const termsCheckbox = page.locator('#accept-terms');
    await termsCheckbox.scrollIntoViewIfNeeded();
    await termsCheckbox.click();
    await page.locator('#accept-privacy').click();
    await page.locator('#accept-data-processing').click();

    const registerBtn = page.locator('.fixed button:has-text("Зарегистрироваться")');
    await registerBtn.scrollIntoViewIfNeeded();
    await registerBtn.click();

    await expect(page.getByText('Иван Арендатор').first()).toBeVisible({ timeout: 15000 });
  });

  test('показывает ошибку при несовпадающих паролях', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await page.getByText('Нет аккаунта? Зарегистрироваться').click();

    await page.locator('#name').fill('Тест');
    await page.locator('#register-email').fill('test@test.com');
    await page.locator('#register-password').fill('password123');
    await page.locator('#confirm-password').fill('wrongpassword');
    await page.locator('#phone').fill('+79001234567');

    const termsCheckbox = page.locator('#accept-terms');
    await termsCheckbox.scrollIntoViewIfNeeded();
    await termsCheckbox.click();
    await page.locator('#accept-privacy').click();
    await page.locator('#accept-data-processing').click();

    const registerBtn = page.locator('.fixed button:has-text("Зарегистрироваться")');
    await registerBtn.scrollIntoViewIfNeeded();
    await registerBtn.click();

    await expect(page.getByText('Пароли не совпадают')).toBeVisible({ timeout: 5000 });
  });

  test('кнопка регистрации заблокирована без согласий', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await page.getByText('Нет аккаунта? Зарегистрироваться').click();

    const registerBtn = page.locator('.fixed button:has-text("Зарегистрироваться")');
    await registerBtn.scrollIntoViewIfNeeded();
    await expect(registerBtn).toBeDisabled();
  });

  test('переход к восстановлению пароля', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await page.getByText('Забыли пароль?').click();

    await expect(page.getByText('Введите email для получения ссылки сброса пароля')).toBeVisible();
    await expect(page.locator('#forgot-email')).toBeVisible();
  });

  test('закрытие модалки по кнопке "Вернуться на главную"', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('header button:has-text("Войти")').click();
    await expect(page.getByText('Введите ваши учетные данные для входа')).toBeVisible();

    await page.getByText('Вернуться на главную').click();
    await expect(page.getByText('Введите ваши учетные данные для входа')).toBeHidden();
  });

  test('выход из системы', async ({ page }) => {
    await setupMockApi(page, mockUsers.renter);
    await loginViaLocalStorage(page, mockUsers.renter);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Иван Арендатор').first()).toBeVisible({ timeout: 15000 });

    await page.locator('button:has-text("Выйти")').click();
    await expect(page.locator('header button:has-text("Войти")')).toBeVisible({ timeout: 15000 });
  });
});
