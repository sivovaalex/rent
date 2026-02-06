/**
 * Notification message templates
 * Used for email, Telegram, and VK notifications
 */

export type NotificationEventType =
  | 'item_approved'
  | 'item_rejected'
  | 'verification_approved'
  | 'verification_rejected'
  | 'booking_new'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'booking_approval_request'
  | 'booking_approved'
  | 'booking_rejected'
  | 'review_received';

export interface NotificationEvent {
  type: NotificationEventType;
  data: Record<string, unknown>;
}

interface Template {
  subject: string;
  text: (data: Record<string, unknown>) => string;
  html: (data: Record<string, unknown>) => string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentpro.buanzu.ru';

/**
 * Notification templates for all event types
 */
export const templates: Record<NotificationEventType, Template> = {
  // Item moderation
  item_approved: {
    subject: 'Ваш лот одобрен',
    text: (data) =>
      `Ваш лот "${data.itemTitle}" прошёл модерацию и опубликован!\n\n` +
      `Посмотреть: ${BASE_URL}/items/${data.itemId}`,
    html: (data) => `
      <h2>Лот одобрен!</h2>
      <p>Ваш лот <strong>"${data.itemTitle}"</strong> прошёл модерацию и опубликован.</p>
      <p><a href="${BASE_URL}/items/${data.itemId}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Посмотреть лот</a></p>
    `,
  },

  item_rejected: {
    subject: 'Лот отклонён',
    text: (data) =>
      `Ваш лот "${data.itemTitle}" отклонён модератором.\n\n` +
      `Причина: ${data.reason || 'Не указана'}\n\n` +
      `Вы можете отредактировать лот и отправить на повторную модерацию.`,
    html: (data) => `
      <h2>Лот отклонён</h2>
      <p>Ваш лот <strong>"${data.itemTitle}"</strong> отклонён модератором.</p>
      <p><strong>Причина:</strong> ${data.reason || 'Не указана'}</p>
      <p>Вы можете отредактировать лот и отправить на повторную модерацию.</p>
    `,
  },

  // User verification
  verification_approved: {
    subject: 'Верификация пройдена',
    text: () =>
      `Поздравляем! Ваш аккаунт верифицирован.\n\n` +
      `Теперь вы можете сдавать вещи в аренду.`,
    html: () => `
      <h2>Верификация пройдена!</h2>
      <p>Поздравляем! Ваш аккаунт успешно верифицирован.</p>
      <p>Теперь вы можете сдавать вещи в аренду на платформе Аренда PRO.</p>
    `,
  },

  verification_rejected: {
    subject: 'Верификация отклонена',
    text: (data) =>
      `Ваша заявка на верификацию отклонена.\n\n` +
      `Причина: ${data.reason || 'Не указана'}\n\n` +
      `Вы можете повторно загрузить документы.`,
    html: (data) => `
      <h2>Верификация отклонена</h2>
      <p>К сожалению, ваша заявка на верификацию отклонена.</p>
      <p><strong>Причина:</strong> ${data.reason || 'Не указана'}</p>
      <p>Вы можете повторно загрузить документы в профиле.</p>
    `,
  },

  // Bookings
  booking_new: {
    subject: 'Новое бронирование',
    text: (data) =>
      `У вас новое бронирование!\n\n` +
      `Лот: ${data.itemTitle}\n` +
      `Арендатор: ${data.renterName}\n` +
      `Период: ${data.startDate} - ${data.endDate}\n` +
      `Сумма: ${data.totalPrice} ₽`,
    html: (data) => `
      <h2>Новое бронирование!</h2>
      <p>У вас новое бронирование на лот <strong>"${data.itemTitle}"</strong></p>
      <table style="margin: 15px 0;">
        <tr><td><strong>Арендатор:</strong></td><td>${data.renterName}</td></tr>
        <tr><td><strong>Период:</strong></td><td>${data.startDate} - ${data.endDate}</td></tr>
        <tr><td><strong>Сумма:</strong></td><td>${data.totalPrice} ₽</td></tr>
      </table>
      <p><a href="${BASE_URL}/profile/bookings" style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Посмотреть бронирования</a></p>
    `,
  },

  booking_confirmed: {
    subject: 'Бронирование подтверждено',
    text: (data) =>
      `Ваше бронирование подтверждено!\n\n` +
      `Лот: ${data.itemTitle}\n` +
      `Период: ${data.startDate} - ${data.endDate}\n\n` +
      `Свяжитесь с владельцем для передачи вещи.`,
    html: (data) => `
      <h2>Бронирование подтверждено!</h2>
      <p>Ваше бронирование на лот <strong>"${data.itemTitle}"</strong> подтверждено.</p>
      <p><strong>Период:</strong> ${data.startDate} - ${data.endDate}</p>
      <p>Свяжитесь с владельцем для передачи вещи.</p>
    `,
  },

  booking_cancelled: {
    subject: 'Бронирование отменено',
    text: (data) =>
      `Бронирование отменено.\n\n` +
      `Лот: ${data.itemTitle}\n` +
      `Причина: ${data.reason || 'Не указана'}`,
    html: (data) => `
      <h2>Бронирование отменено</h2>
      <p>Бронирование на лот <strong>"${data.itemTitle}"</strong> было отменено.</p>
      <p><strong>Причина:</strong> ${data.reason || 'Не указана'}</p>
    `,
  },

  booking_completed: {
    subject: 'Аренда завершена',
    text: (data) =>
      `Аренда успешно завершена!\n\n` +
      `Лот: ${data.itemTitle}\n\n` +
      `Пожалуйста, оставьте отзыв о сделке.`,
    html: (data) => `
      <h2>Аренда завершена!</h2>
      <p>Аренда лота <strong>"${data.itemTitle}"</strong> успешно завершена.</p>
      <p>Пожалуйста, оставьте отзыв о сделке.</p>
      <p><a href="${BASE_URL}/profile/bookings" style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Оставить отзыв</a></p>
    `,
  },

  // Approval system
  booking_approval_request: {
    subject: 'Новый запрос на бронирование',
    text: (data) =>
      `Новый запрос на бронирование!\n\n` +
      `Лот: ${data.itemTitle}\n` +
      `Арендатор: ${data.renterName}\n` +
      `Период: ${data.startDate} - ${data.endDate}\n` +
      `Сумма: ${data.totalPrice} ₽\n\n` +
      `Подтвердите или отклоните запрос в течение 24 часов.`,
    html: (data) => `
      <h2>Новый запрос на бронирование</h2>
      <p>Поступил запрос на бронирование лота <strong>"${data.itemTitle}"</strong></p>
      <table style="margin: 15px 0;">
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Арендатор:</strong></td><td>${data.renterName}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Период:</strong></td><td>${data.startDate} - ${data.endDate}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Сумма:</strong></td><td>${data.totalPrice} ₽</td></tr>
      </table>
      <p style="color: #dc2626;"><strong>Подтвердите или отклоните запрос в течение 24 часов.</strong></p>
      <p><a href="${BASE_URL}/#bookings" style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Перейти к бронированиям</a></p>
    `,
  },

  booking_approved: {
    subject: 'Бронирование одобрено',
    text: (data) =>
      `Ваш запрос на бронирование одобрен!\n\n` +
      `Лот: ${data.itemTitle}\n` +
      `Период: ${data.startDate} - ${data.endDate}\n\n` +
      `Оплата проведена. Свяжитесь с владельцем для передачи вещи.`,
    html: (data) => `
      <h2>Бронирование одобрено!</h2>
      <p>Ваш запрос на бронирование лота <strong>"${data.itemTitle}"</strong> одобрен владельцем.</p>
      <p><strong>Период:</strong> ${data.startDate} - ${data.endDate}</p>
      <p>Оплата проведена. Свяжитесь с владельцем для передачи вещи.</p>
      <p><a href="${BASE_URL}/#bookings" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Посмотреть бронирование</a></p>
    `,
  },

  booking_rejected: {
    subject: 'Бронирование отклонено',
    text: (data) =>
      `Ваш запрос на бронирование отклонён.\n\n` +
      `Лот: ${data.itemTitle}\n` +
      `Причина: ${data.reason || 'Не указана'}\n\n` +
      `Вы можете выбрать другой лот или попробовать позже.`,
    html: (data) => `
      <h2>Бронирование отклонено</h2>
      <p>Ваш запрос на бронирование лота <strong>"${data.itemTitle}"</strong> был отклонён владельцем.</p>
      <p><strong>Причина:</strong> ${data.reason || 'Не указана'}</p>
      <p>Вы можете выбрать другой лот или попробовать позже.</p>
    `,
  },

  review_received: {
    subject: 'Новый отзыв',
    text: (data) =>
      `Вы получили новый отзыв!\n\n` +
      `Оценка: ${'★'.repeat(Number(data.rating))}${'☆'.repeat(5 - Number(data.rating))}\n` +
      `Текст: ${data.text}\n\n` +
      `Посмотреть: ${BASE_URL}/#profile`,
    html: (data) => `
      <h2>Новый отзыв!</h2>
      <p>Вы получили новый отзыв.</p>
      <p><strong>Оценка:</strong> ${'★'.repeat(Number(data.rating))}${'☆'.repeat(5 - Number(data.rating))}</p>
      <p><strong>Текст:</strong> ${data.text}</p>
      <p><a href="${BASE_URL}/#profile" style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Посмотреть в профиле</a></p>
    `,
  },
};

/**
 * Get plain text message for messenger (Telegram/VK)
 */
export function getMessengerText(event: NotificationEvent): string {
  const template = templates[event.type];
  if (!template) {
    return 'Уведомление от Аренда PRO';
  }
  return template.text(event.data);
}

/**
 * Get email subject
 */
export function getEmailSubject(event: NotificationEvent): string {
  const template = templates[event.type];
  return template?.subject || 'Уведомление от Аренда PRO';
}

/**
 * Get HTML content for email
 */
export function getEmailHtml(event: NotificationEvent): string {
  const template = templates[event.type];
  if (!template) {
    return '<p>Уведомление от Аренда PRO</p>';
  }

  const content = template.html(event.data);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Аренда PRO</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    ${content}
  </div>
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Аренда PRO. Все права защищены.</p>
  </div>
</body>
</html>
  `;
}
