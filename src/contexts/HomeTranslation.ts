import type { Language } from './supportedLanguages';

type Translation = Record<Language, Record<string, string>>;

// First-pass AI/machine translation for fr/es/pt/it/nl/pl/ru/ja/zh-Hans
// (ADR-009) -- de/en are the hand-written originals, the rest are pending
// native-speaker review.
const HomeTranslation: Translation = {
    de: {
        'home.title': 'Willkommen',
        'home.info': 'Eine sichere, einsatzbereite Authentifizierungs-Erfahrung, gebaut mit Better Auth.',
    },
    en: {
        'home.title': 'Welcome',
        'home.info': 'A secure, ready-to-use authentication experience built with Better Auth.',
    },
    fr: {
        'home.title': 'Bienvenue',
        'home.info': 'Une expérience d’authentification sécurisée et prête à l’emploi, conçue avec Better Auth.',
    },
    es: {
        'home.title': 'Bienvenido',
        'home.info': 'Una experiencia de autenticación segura y lista para usar, creada con Better Auth.',
    },
    pt: {
        'home.title': 'Bem-vindo',
        'home.info': 'Uma experiência de autenticação segura e pronta a usar, criada com Better Auth.',
    },
    it: {
        'home.title': 'Benvenuto',
        'home.info': 'Un’esperienza di autenticazione sicura e pronta all’uso, realizzata con Better Auth.',
    },
    nl: {
        'home.title': 'Welkom',
        'home.info': 'Een veilige, kant-en-klare authenticatie-ervaring, gebouwd met Better Auth.',
    },
    pl: {
        'home.title': 'Witamy',
        'home.info': 'Bezpieczne, gotowe do użycia doświadczenie uwierzytelniania, zbudowane z Better Auth.',
    },
    ru: {
        'home.title': 'Добро пожаловать',
        'home.info': 'Безопасный, готовый к использованию опыт аутентификации, созданный с Better Auth.',
    },
    ja: {
        'home.title': 'ようこそ',
        'home.info': 'Better Auth で構築された、安全ですぐに使える認証体験。',
    },
    'zh-Hans': {
        'home.title': '欢迎',
        'home.info': '基于 Better Auth 构建的安全、开箱即用的身份验证体验。',
    },
};

export default HomeTranslation;
