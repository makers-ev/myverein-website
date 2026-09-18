import type { Language } from './supportedLanguages';

type Translation = Record<Language, Record<string, string>>;

// 'notification.welcome.*' render the system welcome notification's
// `translationKey` (see _template_better-auth-backend's databaseHooks.user.create
// hook) -- `{{appName}}` is filled in from its `paramsJson` via
// LanguageContext's `t(key, params)`.
// First-pass AI/machine translation for fr/es/pt/it/nl/pl/ru/ja/zh-Hans
// (ADR-009) -- de/en are the hand-written originals, the rest are pending
// native-speaker review.
const NotificationTranslation: Translation = {
    de: {
        'nav.notifications': 'Benachrichtigungen',

        'notification.welcome.title': 'Willkommen bei {{appName}}!',
        'notification.welcome.body': 'Schön, dass du da bist. Schau dich in Ruhe um und richte deinen Account in den Einstellungen ein.',

        'notifications.page.title': 'Benachrichtigungen',
        'notifications.tab.unread': 'Ungelesen',
        'notifications.tab.read': 'Gelesen',
        'notifications.empty.unread': 'Keine ungelesenen Benachrichtigungen.',
        'notifications.empty.read': 'Keine gelesenen Benachrichtigungen.',
        'notifications.action.markRead': 'Als gelesen markieren',
        'notifications.action.markUnread': 'Als ungelesen markieren',
        'notifications.action.delete': 'Löschen',
        'notifications.deleteConfirm': 'Diese Benachrichtigung löschen? Das kann nicht rückgängig gemacht werden.',
    },
    en: {
        'nav.notifications': 'Notifications',

        'notification.welcome.title': 'Welcome to {{appName}}!',
        'notification.welcome.body': "Glad you're here. Take a look around and set up your account in Settings.",

        'notifications.page.title': 'Notifications',
        'notifications.tab.unread': 'Unread',
        'notifications.tab.read': 'Read',
        'notifications.empty.unread': 'No unread notifications.',
        'notifications.empty.read': 'No read notifications.',
        'notifications.action.markRead': 'Mark as read',
        'notifications.action.markUnread': 'Mark as unread',
        'notifications.action.delete': 'Delete',
        'notifications.deleteConfirm': 'Delete this notification? This cannot be undone.',
    },
    fr: {
        'nav.notifications': 'Notifications',

        'notification.welcome.title': 'Bienvenue sur {{appName}} !',
        'notification.welcome.body': "Ravi de vous voir ici. Faites le tour et configurez votre compte dans Paramètres.",

        'notifications.page.title': 'Notifications',
        'notifications.tab.unread': 'Non lues',
        'notifications.tab.read': 'Lues',
        'notifications.empty.unread': 'Aucune notification non lue.',
        'notifications.empty.read': 'Aucune notification lue.',
        'notifications.action.markRead': 'Marquer comme lue',
        'notifications.action.markUnread': 'Marquer comme non lue',
        'notifications.action.delete': 'Supprimer',
        'notifications.deleteConfirm': 'Supprimer cette notification ? Cette action est irréversible.',
    },
    es: {
        'nav.notifications': 'Notificaciones',

        'notification.welcome.title': '¡Bienvenido/a a {{appName}}!',
        'notification.welcome.body': 'Nos alegra tenerte aquí. Échale un vistazo y configura tu cuenta en Ajustes.',

        'notifications.page.title': 'Notificaciones',
        'notifications.tab.unread': 'No leídas',
        'notifications.tab.read': 'Leídas',
        'notifications.empty.unread': 'No hay notificaciones sin leer.',
        'notifications.empty.read': 'No hay notificaciones leídas.',
        'notifications.action.markRead': 'Marcar como leída',
        'notifications.action.markUnread': 'Marcar como no leída',
        'notifications.action.delete': 'Eliminar',
        'notifications.deleteConfirm': '¿Eliminar esta notificación? Esta acción no se puede deshacer.',
    },
    pt: {
        'nav.notifications': 'Notificações',

        'notification.welcome.title': 'Bem-vindo/a ao {{appName}}!',
        'notification.welcome.body': 'Que bom ter-te por aqui. Dá uma volta e configura a tua conta em Definições.',

        'notifications.page.title': 'Notificações',
        'notifications.tab.unread': 'Não lidas',
        'notifications.tab.read': 'Lidas',
        'notifications.empty.unread': 'Sem notificações não lidas.',
        'notifications.empty.read': 'Sem notificações lidas.',
        'notifications.action.markRead': 'Marcar como lida',
        'notifications.action.markUnread': 'Marcar como não lida',
        'notifications.action.delete': 'Eliminar',
        'notifications.deleteConfirm': 'Eliminar esta notificação? Esta ação não pode ser desfeita.',
    },
    it: {
        'nav.notifications': 'Notifiche',

        'notification.welcome.title': 'Benvenuto/a su {{appName}}!',
        'notification.welcome.body': 'Siamo felici di averti qui. Dai un’occhiata in giro e configura il tuo account in Impostazioni.',

        'notifications.page.title': 'Notifiche',
        'notifications.tab.unread': 'Non lette',
        'notifications.tab.read': 'Lette',
        'notifications.empty.unread': 'Nessuna notifica non letta.',
        'notifications.empty.read': 'Nessuna notifica letta.',
        'notifications.action.markRead': 'Segna come letta',
        'notifications.action.markUnread': 'Segna come non letta',
        'notifications.action.delete': 'Elimina',
        'notifications.deleteConfirm': 'Eliminare questa notifica? L’operazione non può essere annullata.',
    },
    nl: {
        'nav.notifications': 'Meldingen',

        'notification.welcome.title': 'Welkom bij {{appName}}!',
        'notification.welcome.body': 'Fijn dat je er bent. Kijk gerust rond en stel je account in bij Instellingen.',

        'notifications.page.title': 'Meldingen',
        'notifications.tab.unread': 'Ongelezen',
        'notifications.tab.read': 'Gelezen',
        'notifications.empty.unread': 'Geen ongelezen meldingen.',
        'notifications.empty.read': 'Geen gelezen meldingen.',
        'notifications.action.markRead': 'Markeren als gelezen',
        'notifications.action.markUnread': 'Markeren als ongelezen',
        'notifications.action.delete': 'Verwijderen',
        'notifications.deleteConfirm': 'Deze melding verwijderen? Dit kan niet ongedaan worden gemaakt.',
    },
    pl: {
        'nav.notifications': 'Powiadomienia',

        'notification.welcome.title': 'Witamy w {{appName}}!',
        'notification.welcome.body': 'Cieszymy się, że tu jesteś. Rozejrzyj się i skonfiguruj swoje konto w Ustawieniach.',

        'notifications.page.title': 'Powiadomienia',
        'notifications.tab.unread': 'Nieprzeczytane',
        'notifications.tab.read': 'Przeczytane',
        'notifications.empty.unread': 'Brak nieprzeczytanych powiadomień.',
        'notifications.empty.read': 'Brak przeczytanych powiadomień.',
        'notifications.action.markRead': 'Oznacz jako przeczytane',
        'notifications.action.markUnread': 'Oznacz jako nieprzeczytane',
        'notifications.action.delete': 'Usuń',
        'notifications.deleteConfirm': 'Usunąć to powiadomienie? Tej czynności nie można cofnąć.',
    },
    ru: {
        'nav.notifications': 'Уведомления',

        'notification.welcome.title': 'Добро пожаловать в {{appName}}!',
        'notification.welcome.body': 'Рады видеть вас здесь. Осмотритесь и настройте свой аккаунт в Настройках.',

        'notifications.page.title': 'Уведомления',
        'notifications.tab.unread': 'Непрочитанные',
        'notifications.tab.read': 'Прочитанные',
        'notifications.empty.unread': 'Нет непрочитанных уведомлений.',
        'notifications.empty.read': 'Нет прочитанных уведомлений.',
        'notifications.action.markRead': 'Отметить как прочитанное',
        'notifications.action.markUnread': 'Отметить как непрочитанное',
        'notifications.action.delete': 'Удалить',
        'notifications.deleteConfirm': 'Удалить это уведомление? Это действие нельзя отменить.',
    },
    ja: {
        'nav.notifications': '通知',

        'notification.welcome.title': '{{appName}}へようこそ！',
        'notification.welcome.body': 'ご利用ありがとうございます。ゆっくり見て回って、設定でアカウントを整えてください。',

        'notifications.page.title': '通知',
        'notifications.tab.unread': '未読',
        'notifications.tab.read': '既読',
        'notifications.empty.unread': '未読の通知はありません。',
        'notifications.empty.read': '既読の通知はありません。',
        'notifications.action.markRead': '既読にする',
        'notifications.action.markUnread': '未読にする',
        'notifications.action.delete': '削除',
        'notifications.deleteConfirm': 'この通知を削除しますか？この操作は元に戻せません。',
    },
    'zh-Hans': {
        'nav.notifications': '通知',

        'notification.welcome.title': '欢迎使用 {{appName}}！',
        'notification.welcome.body': '很高兴你能来。四处看看，并在设置中完善你的账户。',

        'notifications.page.title': '通知',
        'notifications.tab.unread': '未读',
        'notifications.tab.read': '已读',
        'notifications.empty.unread': '没有未读通知。',
        'notifications.empty.read': '没有已读通知。',
        'notifications.action.markRead': '标记为已读',
        'notifications.action.markUnread': '标记为未读',
        'notifications.action.delete': '删除',
        'notifications.deleteConfirm': '删除此通知？此操作无法撤销。',
    },
};

export default NotificationTranslation;
