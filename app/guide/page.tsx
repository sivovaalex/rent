'use client';

import { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  UserCheck,
  Search,
  Calendar,
  Package,
  MessageCircle,
  Star,
  Settings,
  Shield,
  LifeBuoy,
  ChevronRight,
  Mail,
  Phone,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COMPANY_INFO } from '@/lib/constants/company';

// --- Section definitions ---

const sections = [
  { id: 'faq', label: 'Частые вопросы', icon: HelpCircle },
  { id: 'getting-started', label: 'Начало работы', icon: UserCheck },
  { id: 'catalog', label: 'Каталог и поиск', icon: Search },
  { id: 'booking', label: 'Бронирование', icon: Calendar },
  { id: 'renting-out', label: 'Сдача в аренду', icon: Package },
  { id: 'chat', label: 'Чат и сообщения', icon: MessageCircle },
  { id: 'reviews', label: 'Отзывы и рейтинг', icon: Star },
  { id: 'profile', label: 'Профиль и настройки', icon: Settings },
  { id: 'admin', label: 'Админ-панель', icon: Shield },
  { id: 'support', label: 'Служба поддержки', icon: LifeBuoy },
];

// --- FAQ data ---

const faqItems = [
  {
    q: 'Что такое Арендол?',
    a: 'Арендол — это платформа для аренды и сдачи в аренду вещей между пользователями. Вы можете арендовать электронику, стрим-оборудование, инструменты, одежду, спортивный инвентарь и многое другое.',
  },
  {
    q: 'Как проходит оплата?',
    a: 'Оплата происходит через платформу. При бронировании вы оплачиваете стоимость аренды и залог (если предусмотрен). После успешного завершения аренды залог возвращается автоматически.',
  },
  {
    q: 'Что такое залог и как он возвращается?',
    a: 'Залог — это обеспечительный платёж, который гарантирует сохранность вещи. Он блокируется при бронировании и возвращается в полном объёме после подтверждения возврата вещи в надлежащем состоянии.',
  },
  {
    q: 'Как отменить бронирование?',
    a: 'Вы можете отменить бронирование в разделе «Мои бронирования», нажав кнопку отмены. Условия возврата средств зависят от статуса бронирования и правил арендодателя.',
  },
  {
    q: 'Что делать при повреждении вещи?',
    a: 'В случае повреждения вещи необходимо зафиксировать это при возврате в чек-листе. Стоимость ремонта или замены может быть удержана из залога. Для решения спорных вопросов обратитесь в поддержку.',
  },
  {
    q: 'Как пройти верификацию?',
    a: 'Перейдите в профиль и нажмите «Пройти верификацию». Выберите тип документа (паспорт или водительское удостоверение), загрузите фото и отправьте на проверку. Модератор рассмотрит заявку — обычно в течение нескольких часов. После верификации вы сможете стать арендодателем и размещать лоты.',
  },
  {
    q: 'Как связаться с поддержкой?',
    a: 'Напишите в службу поддержки прямо из приложения: откройте раздел «Чат» и нажмите кнопку «Служба поддержки». Выберите категорию и опишите вашу проблему — мы ответим в ближайшее время.',
  },
];

// --- Step component ---

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-600 text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

// --- Main page ---

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState('faq');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // IntersectionObserver to highlight active section in sidebar
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Руководство пользователя</h1>
        <p className="text-gray-600">Всё, что нужно знать о работе с платформой Арендол</p>
      </div>

      {/* Mobile navigation - horizontal scroll chips */}
      <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeSection === id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <nav className="sticky top-24 space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeSection === id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${activeSection === id ? 'text-indigo-600' : 'text-gray-400'}`} />
                {label}
                {activeSection === id && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* ===== FAQ ===== */}
          <section
            id="faq"
            ref={(el) => { sectionRefs.current['faq'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  Частые вопросы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-gray-900 hover:text-indigo-600">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* ===== Getting started ===== */}
          <section
            id="getting-started"
            ref={(el) => { sectionRefs.current['getting-started'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  Начало работы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Регистрация">
                  Нажмите «Зарегистрироваться» на главной странице. Укажите имя, email, номер телефона и придумайте пароль. После отправки формы на указанный email придёт письмо со ссылкой для подтверждения.
                </Step>
                <Step number={2} title="Подтверждение email">
                  Перейдите по ссылке из письма для подтверждения email-адреса. Без подтверждения вход в систему невозможен. Если письмо не пришло, проверьте папку «Спам».
                </Step>
                <Step number={3} title="Вход в аккаунт">
                  После подтверждения email используйте email и пароль для входа. Если забыли пароль — воспользуйтесь функцией восстановления.
                </Step>
                <Step number={4} title="Арендатор">
                  После входа вы становитесь арендатором — можете просматривать каталог и бронировать вещи без дополнительных подтверждений.
                </Step>
                <Step number={5} title="Верификация и роль арендодателя">
                  Чтобы сдавать вещи в аренду, нужно пройти верификацию. Нажмите «Пройти верификацию» в профиле, выберите тип документа (паспорт или водительское удостоверение), загрузите фото и дождитесь одобрения модератора. После верификации нажмите «Стать арендодателем» в промо-блоке профиля.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Catalog ===== */}
          <section
            id="catalog"
            ref={(el) => { sectionRefs.current['catalog'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Search className="w-5 h-5 text-indigo-600" />
                  </div>
                  Каталог и поиск
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Просмотр каталога">
                  Откройте вкладку «Каталог» для просмотра всех доступных вещей. Каждая карточка содержит фото, название, цену за день и рейтинг.
                </Step>
                <Step number={2} title="Фильтры и категории">
                  Используйте фильтры для поиска нужной вещи: категория (электроника, одежда, стрим-оборудование, спорт, инструменты), ценовой диапазон, рейтинг, сортировка.
                </Step>
                <Step number={3} title="Режим карты">
                  Переключитесь в режим карты для просмотра лотов по расположению. Кликните на метку, чтобы увидеть информацию о лоте.
                </Step>
                <Step number={4} title="Избранное">
                  Нажмите на иконку сердца на карточке лота, чтобы добавить его в избранное. Избранные лоты доступны для быстрого доступа в каталоге.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Booking ===== */}
          <section
            id="booking"
            ref={(el) => { sectionRefs.current['booking'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  Бронирование
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Создание бронирования">
                  Откройте карточку лота и нажмите «Забронировать». Выберите даты начала и окончания аренды в календаре. Недоступные даты будут заблокированы. Подтвердите согласие с правилами и отправьте запрос.
                </Step>
                <Step number={2} title="Статусы бронирования">
                  Ваши бронирования проходят через несколько статусов:
                  <Badge variant="outline" className="mx-1">Ожидает одобрения</Badge> — запрос отправлен арендодателю,
                  <Badge variant="outline" className="mx-1">Оплачено</Badge> — бронирование подтверждено,
                  <Badge variant="outline" className="mx-1">Активно</Badge> — аренда в процессе,
                  <Badge variant="outline" className="mx-1">Завершено</Badge> — вещь возвращена.
                </Step>
                <Step number={3} title="Система одобрения">
                  Арендодатель может настроить режим одобрения:
                  автоматическое одобрение, ручное подтверждение, одобрение по рейтингу арендатора или только для верифицированных пользователей. Если требуется одобрение, вы увидите соответствующее уведомление.
                </Step>
                <Step number={4} title="Залог и оплата">
                  При бронировании рассчитывается стоимость: цена за день × количество дней + залог (если предусмотрен). Залог блокируется и возвращается после успешного завершения аренды.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Renting out ===== */}
          <section
            id="renting-out"
            ref={(el) => { sectionRefs.current['renting-out'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </div>
                  Сдача в аренду
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Создание объявления">
                  Переключитесь на роль «Арендодатель» в профиле. Нажмите «Добавить лот» в каталоге. Заполните название, описание, категорию, цену за день, адрес. Загрузите до 5 фотографий.
                </Step>
                <Step number={2} title="Модерация">
                  После создания лот отправляется на модерацию. Модератор проверяет соответствие правилам размещения. Обычно проверка занимает до 24 часов. Вы получите уведомление о результате.
                </Step>
                <Step number={3} title="Настройки одобрения бронирований">
                  В настройках профиля или при создании лота выберите режим одобрения заявок:
                  автоматическое — все заявки одобряются сразу;
                  ручное — вы подтверждаете каждую заявку;
                  по рейтингу — автоматически одобряются арендаторы с рейтингом выше порога;
                  только верифицированные — только для подтверждённых пользователей.
                </Step>
                <Step number={4} title="Управление лотами">
                  В каталоге отслеживайте статус своих лотов, редактируйте информацию, снимайте с публикации при необходимости.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Chat ===== */}
          <section
            id="chat"
            ref={(el) => { sectionRefs.current['chat'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  Чат и сообщения
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Общение">
                  Чат привязан к бронированию. После создания заявки вы можете обмениваться сообщениями с арендатором или арендодателем для уточнения деталей аренды.
                </Step>
                <Step number={2} title="Уведомления о сообщениях">
                  Если вы не прочитали сообщение в течение 30 минут, вам придёт уведомление в Telegram, VK или по email (в зависимости от настроек). Система проверяет непрочитанные сообщения каждые 15 минут. Количество непрочитанных сообщений отображается на иконке чата.
                </Step>
                <Step number={3} title="Где найти чат">
                  Вкладка «Чат» в основном меню приложения. Здесь отображаются все ваши активные переписки, сгруппированные по бронированиям.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Reviews ===== */}
          <section
            id="reviews"
            ref={(el) => { sectionRefs.current['reviews'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Star className="w-5 h-5 text-indigo-600" />
                  </div>
                  Отзывы и рейтинг
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Оставление отзыва">
                  После завершения аренды вы можете оставить отзыв с оценкой от 1 до 5 звёзд и текстовым комментарием (минимум 10 символов). К отзыву можно прикрепить до 5 фотографий.
                </Step>
                <Step number={2} title="Двусторонние отзывы">
                  Арендатор оценивает вещь и владельца, а владелец может оставить отзыв об арендаторе. Это помогает формировать доверие на платформе.
                </Step>
                <Step number={3} title="Рейтинг и доверие">
                  На основе отзывов формируются: рейтинг лота, рейтинг пользователя и показатель доверия (Trust Score). Пользователи с высоким рейтингом получают trust-баджи, что повышает их привлекательность для партнёров по аренде.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Profile ===== */}
          <section
            id="profile"
            ref={(el) => { sectionRefs.current['profile'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-indigo-600" />
                  </div>
                  Профиль и настройки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Настройки уведомлений">
                  Управляйте каналами уведомлений: email, Telegram, ВКонтакте, push-уведомления в браузере. Для каждого канала можно включить/выключить отдельные категории: бронирования, чат, модерация, отзывы, напоминания.
                </Step>
                <Step number={2} title="Подключение мессенджеров">
                  Привяжите аккаунт Telegram или ВКонтакте для получения мгновенных уведомлений. Инструкции по подключению доступны в настройках уведомлений.
                </Step>
                <Step number={3} title="Редактирование профиля">
                  Обновляйте имя, фото, контактную информацию, адрес. Арендодатели также могут настроить режим одобрения бронирований и порог рейтинга.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Admin ===== */}
          <section
            id="admin"
            ref={(el) => { sectionRefs.current['admin'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  Админ-панель
                  <Badge variant="secondary" className="ml-2">Для модераторов</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Модерация лотов">
                  Вкладка «Админ» отображается для модераторов и администраторов. Здесь вы можете одобрять или отклонять новые объявления, проверяя соответствие правилам платформы.
                </Step>
                <Step number={2} title="Верификация пользователей">
                  Проверяйте заявки на верификацию: просматривайте загруженные фото документов, кликнув по миниатюре или кнопке «Документ». Одобряйте или отклоняйте заявки — при отклонении укажите причину. Напоминание приходит, если заявка ожидает более 30 минут.
                </Step>
                <Step number={3} title="Управление пользователями">
                  Администраторы могут изменять роли пользователей, блокировать нарушителей и просматривать статистику платформы.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* ===== Support ===== */}
          <section
            id="support"
            ref={(el) => { sectionRefs.current['support'] = el; }}
            className="scroll-mt-20"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <LifeBuoy className="w-5 h-5 text-indigo-600" />
                  </div>
                  Служба поддержки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Step number={1} title="Как создать обращение">
                  Откройте раздел «Чат» и нажмите кнопку <strong>«Служба поддержки»</strong> вверху страницы. Нажмите «Новое обращение», выберите категорию и опишите вашу проблему — мы ответим в ближайшее время.
                </Step>
                <Step number={2} title="Категории обращений">
                  Доступны две категории: <strong>«Технические проблемы»</strong> (ошибки, сбои, проблемы с интерфейсом) и <strong>«Другое»</strong> (общие вопросы, предложения, жалобы).
                </Step>
                <Step number={3} title="Статусы и ответы">
                  После создания обращение получает статус <strong>«Открыто»</strong>. Когда специалист начинает работу — статус меняется на <strong>«В работе»</strong>. После решения — <strong>«Закрыто»</strong>. Ответ поддержки придёт в виде уведомления; диалог хранится в разделе обращений.
                </Step>
              </CardContent>
            </Card>
          </section>

          {/* Contact support */}
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Не нашли ответ?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Свяжитесь с нашей службой поддержки — мы с радостью поможем!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                <Mail className="w-4 h-4" />
                {COMPANY_INFO.email}
              </a>
              <a
                href={`tel:${COMPANY_INFO.phone.replace(/[^+\d]/g, '')}`}
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                <Phone className="w-4 h-4" />
                {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
