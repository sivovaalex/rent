/// <reference types="vitest/globals" />
import { parseAdminSubHash } from '@/components/AdminTab';

describe('parseAdminSubHash', () => {
  test('пустая строка → stats/pending (default)', () => {
    expect(parseAdminSubHash('')).toEqual({ adminSubTab: 'stats', verificationSubTab: 'pending' });
  });

  test('"stats" → stats/pending', () => {
    expect(parseAdminSubHash('stats')).toEqual({ adminSubTab: 'stats', verificationSubTab: 'pending' });
  });

  test('"verification" → verification/pending', () => {
    expect(parseAdminSubHash('verification')).toEqual({ adminSubTab: 'verification', verificationSubTab: 'pending' });
  });

  test('"verification-history" → verification/history', () => {
    expect(parseAdminSubHash('verification-history')).toEqual({ adminSubTab: 'verification', verificationSubTab: 'history' });
  });

  test('"users" → users/pending', () => {
    expect(parseAdminSubHash('users')).toEqual({ adminSubTab: 'users', verificationSubTab: 'pending' });
  });

  test('неизвестная строка → stats/pending (fallback)', () => {
    expect(parseAdminSubHash('unknown-value')).toEqual({ adminSubTab: 'stats', verificationSubTab: 'pending' });
  });

  test('произвольный текст → stats/pending (fallback)', () => {
    expect(parseAdminSubHash('random-text-here')).toEqual({ adminSubTab: 'stats', verificationSubTab: 'pending' });
  });
});
