// Client-side validation helpers (lightweight, no Zod dependency)

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+7\d{10}$/;

export function validateEmail(email: string): string | null {
  if (!email) return 'Введите email';
  if (!EMAIL_REGEX.test(email)) return 'Некорректный формат email';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Введите пароль';
  if (password.length < 6) return 'Пароль должен содержать минимум 6 символов';
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return 'Введите телефон';
  if (!PHONE_REGEX.test(phone)) return 'Формат: +7XXXXXXXXXX';
  return null;
}

export function validateName(name: string): string | null {
  if (!name) return 'Введите имя';
  if (name.length < 2) return 'Имя должно содержать минимум 2 символа';
  if (name.length > 100) return 'Имя слишком длинное';
  return null;
}
