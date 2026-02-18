import { validateEmail, validatePassword, validatePhone, validateName } from '@/lib/validations/client';

describe('Client-side validation helpers', () => {
  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      expect(validateEmail('')).toBe('Введите email');
    });

    it('returns error for invalid email', () => {
      expect(validateEmail('not-an-email')).toBe('Некорректный формат email');
      expect(validateEmail('missing@domain')).toBe('Некорректный формат email');
      expect(validateEmail('@no-user.com')).toBe('Некорректный формат email');
    });

    it('returns null for valid email', () => {
      expect(validateEmail('user@example.com')).toBeNull();
      expect(validateEmail('test.user@domain.ru')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('returns error for empty password', () => {
      expect(validatePassword('')).toBe('Введите пароль');
    });

    it('returns error for short password', () => {
      expect(validatePassword('12345')).toBe('Пароль должен содержать минимум 6 символов');
    });

    it('returns null for valid password', () => {
      expect(validatePassword('123456')).toBeNull();
      expect(validatePassword('strong-password')).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('returns error for empty phone', () => {
      expect(validatePhone('')).toBe('Введите телефон');
    });

    it('returns error for invalid phone format', () => {
      expect(validatePhone('89991234567')).toBe('Формат: +7XXXXXXXXXX');
      expect(validatePhone('+7123')).toBe('Формат: +7XXXXXXXXXX');
      expect(validatePhone('+79991234567extra')).toBe('Формат: +7XXXXXXXXXX');
    });

    it('returns null for valid phone', () => {
      expect(validatePhone('+79991234567')).toBeNull();
    });
  });

  describe('validateName', () => {
    it('returns error for empty name', () => {
      expect(validateName('')).toBe('Введите имя');
    });

    it('returns error for short name', () => {
      expect(validateName('A')).toBe('Имя должно содержать минимум 2 символа');
    });

    it('returns error for long name', () => {
      expect(validateName('A'.repeat(101))).toBe('Имя слишком длинное');
    });

    it('returns null for valid name', () => {
      expect(validateName('Иван')).toBeNull();
      expect(validateName('AB')).toBeNull();
    });
  });
});
