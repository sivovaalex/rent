# Аренда PRO - Единая шеринг-платформа

Платформа для аренды стрим-оборудования, электроники и премиальной одежды.

## Технологии

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: MongoDB
- **Authentication**: bcryptjs

## Установка

### 1. Установите зависимости

```bash
npm install
```

### 2. Установите TypeScript и типы

```bash
npm install --save-dev typescript @types/node @types/react @types/react-dom
```

### 3. Настройте переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
MONGODB_URI=mongodb://localhost:27017/arendapro
```

## Команды запуска

### Разработка

```bash
npm run dev
```

Запускает сервер разработки на http://localhost:3000

### Сборка

```bash
npm run build
```

Создает оптимизированную production сборку

### Продакшен

```bash
npm run start
```

Запускает production сервер

### Проверка типов

```bash
npm run type-check
```

Проверяет TypeScript типы без компиляции

## Структура проекта

```
rent/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Авторизация
│   │   ├── items/         # Лоты
│   │   ├── reviews/       # Отзывы
│   │   └── upload/        # Загрузка файлов
│   ├── layout.tsx         # Root Layout
│   ├── page.tsx           # Главная страница
│   └── globals.css        # Глобальные стили
├── components/            # React компоненты
│   ├── ui/               # UI компоненты (shadcn/ui)
│   ├── AdminTab.tsx      # Панель администратора
│   ├── AuthModal.tsx     # Модальное окно авторизации
│   ├── BookingModal.tsx  # Модальное окно бронирования
│   ├── BookingsTab.tsx   # Вкладка бронирований
│   ├── Catalog.tsx       # Каталог лотов
│   ├── Header.tsx        # Шапка сайта
│   ├── HomePage.tsx      # Главная страница
│   ├── ItemCard.tsx      # Карточка лота
│   ├── ItemDetailModal.tsx # Детали лота
│   ├── Profile.tsx       # Профиль пользователя
│   ├── ReviewList.tsx    # Список отзывов
│   └── ReviewModal.tsx   # Модальное окно отзыва
├── hooks/                 # React Hooks
│   ├── use-toast.ts      # Toast уведомления
│   └── use-mobile.tsx    # Определение мобильного устройства
├── lib/                   # Утилиты
│   └── utils.ts          # Общие утилиты
├── types/                 # TypeScript типы
│   └── index.ts          # Основные типы
├── public/               # Статические файлы
├── tsconfig.json         # Конфигурация TypeScript
├── next.config.js        # Конфигурация Next.js
├── tailwind.config.js    # Конфигурация Tailwind CSS
└── package.json          # Зависимости проекта
```

## Миграция с JavaScript на TypeScript

Проект был мигрирован с JavaScript на TypeScript. Основные изменения:

1. Добавлен `tsconfig.json` с настройками для Next.js
2. Создан файл типов `types/index.ts` с основными интерфейсами
3. Все `.js` и `.jsx` файлы конвертированы в `.ts` и `.tsx`
4. Добавлены типы для props компонентов и API routes

## Лицензия

MIT
