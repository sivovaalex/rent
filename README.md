# Арендол - Единая шеринг-платформа

Платформа для аренды стрим-оборудования, электроники и премиальной одежды.

## Технологии

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Authentication**: JWT (jose) + bcryptjs
- **Validation**: Zod
- **Testing**: Vitest, Testing Library, Playwright (E2E)
- **Logging**: Pino

## Установка

> **Примечание:** Вместо `yarn` можно использовать `npm`. Замените `yarn` на `npm run` для скриптов (например, `npm run dev` вместо `yarn dev`).

### 1. Установите зависимости

```bash
yarn install
# или
npm install
```

### 2. Настройте переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
# Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# JWT
JWT_SECRET="your-secret-key-min-32-characters"

# Supabase (опционально, для storage)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 3. Инициализируйте базу данных

```bash
# Применить миграции
yarn db:push

# Открыть Prisma Studio (опционально)
yarn db:studio
```

## Команды

### Разработка

```bash
yarn dev
```

Запускает сервер разработки на http://localhost:3000

### Сборка

```bash
yarn build
```

Создает оптимизированную production сборку

### Продакшен

```bash
yarn start
```

Запускает production сервер

### Тестирование

```bash
# Запуск тестов в watch-режиме
yarn test

# Однократный запуск тестов
yarn test:run

# Запуск с покрытием кода
yarn test:coverage
```

### E2E тестирование (Playwright)

E2E тесты проверяют основные пользовательские сценарии: аутентификацию, каталог, бронирования, чат, профиль и отзывы. Все API-запросы мокаются через `page.route()`, поэтому для запуска не нужна база данных.

```bash
# Установка браузеров Playwright (один раз)
npx playwright install

# Запуск всех E2E тестов
npx playwright test

# Запуск с отображением в браузере
npx playwright test --headed

# Запуск конкретного файла
npx playwright test e2e/auth.spec.ts

# Отчёт о последнем запуске
npx playwright show-report
```

Структура E2E тестов:

```
e2e/
├── helpers/
│   ├── mock-api.ts          # Моки API и localStorage-авторизация
│   └── mock-data.ts         # Тестовые данные (пользователи, товары, бронирования)
├── auth.spec.ts             # Вход, регистрация, выход (11 тестов)
├── booking.spec.ts          # Бронирования арендатора и арендодателя (8 тестов)
├── catalog.spec.ts          # Каталог, поиск, навигация (7 тестов)
├── chat.spec.ts             # Чат и сообщения (6 тестов)
├── profile.spec.ts          # Профиль, верификация, руководство (12 тестов)
└── reviews.spec.ts          # Просмотр и создание отзывов (5 тестов)
```

### Проверка типов

```bash
yarn type-check
```

### База данных

```bash
# Генерация Prisma Client
yarn db:generate

# Применить схему к БД (dev)
yarn db:push

# Создать миграцию (dev)
yarn db:migrate

# Применить миграции (prod)
yarn db:migrate:prod

# Открыть Prisma Studio
yarn db:studio
```

## Архитектура

### Структура проекта

```
rent/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/             # Аутентификация (SMS, email, JWT)
│   │   ├── admin/            # Админ-панель
│   │   ├── bookings/         # Бронирования
│   │   ├── items/            # Лоты
│   │   ├── profile/          # Профиль
│   │   ├── reviews/          # Отзывы
│   │   └── upload/           # Загрузка файлов
│   ├── layout.tsx            # Root Layout с Error Boundary
│   ├── page.tsx              # Главная страница
│   └── globals.css           # Глобальные стили
│
├── components/               # React компоненты
│   ├── ui/                   # UI компоненты (shadcn/ui)
│   ├── ErrorBoundary.tsx     # Обработка ошибок
│   ├── Providers.tsx         # Провайдеры приложения
│   └── ...                   # Бизнес-компоненты
│
├── hooks/                    # Custom React Hooks
│   ├── use-auth.ts           # Аутентификация
│   ├── use-items.ts          # Работа с лотами
│   ├── use-bookings.ts       # Работа с бронированиями
│   ├── use-admin.ts          # Админ-функции
│   └── use-alert.ts          # Уведомления
│
├── lib/                      # Утилиты и конфигурация
│   ├── prisma.ts             # Prisma Client
│   ├── jwt.ts                # JWT утилиты
│   ├── api-utils.ts          # API хелперы
│   ├── rate-limit.ts         # Rate limiting
│   ├── logger.ts             # Pino logger
│   ├── constants.ts          # Константы
│   └── validations/          # Zod схемы
│       ├── auth.ts
│       ├── items.ts
│       ├── bookings.ts
│       └── reviews.ts
│
├── types/                    # TypeScript типы
│   └── index.ts              # Unified types from Prisma
│
├── prisma/                   # Prisma ORM
│   └── schema.prisma         # Схема базы данных
│
├── e2e/                      # E2E тесты (Playwright)
│   ├── helpers/              # Моки API и тестовые данные
│   └── *.spec.ts             # Тестовые сценарии
│
├── __tests__/                # Unit/Integration тесты (Vitest)
│   ├── api/                  # Тесты API
│   ├── hooks/                # Тесты хуков
│   ├── mocks/                # Моки
│   └── utils/                # Тестовые утилиты
│
├── playwright.config.ts      # Конфигурация Playwright (E2E)
├── vitest.config.ts          # Конфигурация Vitest
├── vitest.setup.ts           # Setup тестов
├── tsconfig.json             # TypeScript конфигурация
├── next.config.js            # Next.js конфигурация
├── tailwind.config.js        # Tailwind CSS конфигурация
└── package.json              # Зависимости
```

### API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth` | Отправка SMS кода |
| PUT | `/api/auth` | Верификация SMS и регистрация |
| PATCH | `/api/auth` | Вход по email/password |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/forgot-password` | Запрос сброса пароля |
| POST | `/api/auth/reset-password` | Установка нового пароля |
| GET | `/api/items` | Список лотов |
| POST | `/api/items` | Создание лота |
| GET | `/api/items/[id]` | Детали лота |
| POST | `/api/items/[id]/book` | Бронирование |
| GET | `/api/bookings` | Мои бронирования |
| POST | `/api/reviews` | Создание отзыва |
| GET | `/api/admin/stats` | Статистика (admin) |
| GET | `/api/admin/users` | Пользователи (admin) |
| GET | `/api/admin/items` | Лоты на модерации (admin) |

### Аутентификация

Проект использует JWT токены для аутентификации:

```typescript
// Получение токена при входе
const res = await fetch('/api/auth', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token, user } = await res.json();

// Использование токена
const res = await fetch('/api/bookings', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Логирование

Проект использует структурированное логирование через Pino:

```typescript
import { logError, logAuth, logBooking, apiLogger } from '@/lib/logger';

// Логирование ошибок
logError(error, { path: '/api/items', method: 'GET' });

// Логирование аутентификации
logAuth('login', true, { userId: user.id });

// Логирование бронирований
logBooking('create', booking.id, { itemId, totalPrice });
```

**Куда идут логи:**

| Окружение | Назначение | Уровень |
|-----------|------------|---------|
| Development | `console` (stdout терминала) | debug |
| Production | `stdout` (доступно через логи хостинга: Vercel, Railway и т.д.) | info |

Уровень логирования можно изменить через переменную окружения `LOG_LEVEL` (debug, info, warn, error).

### Email (SMTP)

Для отправки email (восстановление пароля, уведомления) настройте SMTP:

```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=your@email.ru
SMTP_PASSWORD=your-password
SMTP_FROM=your@email.ru
NEXT_PUBLIC_BASE_URL=https://your-domain.ru
```

**Поддерживаемые провайдеры:**
- Mail.ru / Internet.ru — `smtp.mail.ru:465`
- Yandex — `smtp.yandex.ru:465`
- Gmail — `smtp.gmail.com:587` (требуется App Password)

В режиме разработки (без SMTP_USER) письма выводятся в консоль.

### Уведомления (Telegram, VK)

Система уведомлений отправляет сообщения о модерации, верификации и бронированиях через Email, Telegram и VK.

**Настройка Telegram бота:**
```env
TELEGRAM_BOT_TOKEN=123456789:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=random-secret-string
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=YourBotName
```

Установка webhook:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.ru/api/webhooks/telegram&secret_token=<SECRET>"
```

**Настройка VK бота:**
```env
VK_BOT_TOKEN=vk1.a.xxx...
VK_GROUP_ID=123456789
VK_CONFIRMATION_CODE=abc123
VK_SECRET_KEY=random-secret-string
NEXT_PUBLIC_VK_BOT_URL=https://vk.com/im?sel=-123456789
```

В настройках сообщества VK:
1. Управление → Callback API
2. URL: `https://your-domain.ru/api/webhooks/vk`
3. Включить событие `message_new`

**API Endpoints уведомлений:**
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/notifications/settings` | Получение настроек уведомлений |
| PATCH | `/api/notifications/settings` | Обновление настроек |
| POST | `/api/notifications/link` | Привязка мессенджера по коду |
| POST | `/api/notifications/unlink` | Отвязка мессенджера |
| POST | `/api/webhooks/telegram` | Webhook для Telegram бота |
| POST | `/api/webhooks/vk` | Callback API для VK бота |

## История изменений

### Этап 1: Модуляризация API
- Разделение монолитных API routes на модули
- Добавление Zod валидации запросов

### Этап 2: Рефакторинг компонентов
- Создание custom hooks (useAuth, useItems, useBookings, useAdmin, useAlert)
- Вынос логики из компонентов в хуки

### Этап 3: JWT аутентификация
- Замена x-user-id header на JWT токены
- Добавление rate limiting
- Защита API endpoints

### Этап 4: Типизация
- Унификация типов из Prisma
- Устранение any типов
- Поддержка legacy snake_case свойств

### Этап 5: Инфраструктура и тесты
- Добавление Vitest + Testing Library
- Структурированное логирование (Pino)
- Error Boundary для обработки ошибок

### Этап 6: Правовое соответствие
- Добавление страниц правовой информации (7 страниц)
- Чекбоксы согласия при регистрации
- Ссылки в футере на правовые документы

### Этап 7: Адаптивная вёрстка
- Исправление модальных окон (max 90% высоты/ширины)
- Мобильная адаптация всех компонентов (от 320px)
- Улучшение отзывчивости форм и таблиц

### Этап 8: Сброс пароля
- Email-сервис через nodemailer
- API восстановления пароля
- Страница ввода нового пароля

### Этап 9: Уведомления
- Система уведомлений (Email, Telegram, VK)
- Webhooks для ботов мессенджеров
- UI настроек уведомлений в профиле
- Интеграция в модерацию, верификацию, бронирования

## Лицензия

MIT
