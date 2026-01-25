# Аренда PRO - Единая шеринг-платформа

Платформа для аренды стрим-оборудования, электроники и премиальной одежды.

## Технологии

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Authentication**: JWT (jose) + bcryptjs
- **Validation**: Zod
- **Testing**: Vitest, Testing Library
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
├── __tests__/                # Тесты
│   ├── api/                  # Тесты API
│   ├── hooks/                # Тесты хуков
│   ├── mocks/                # Моки
│   └── utils/                # Тестовые утилиты
│
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

## Лицензия

MIT
