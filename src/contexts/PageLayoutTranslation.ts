import type { Language } from './supportedLanguages';

type Translation = Record<Language, Record<string, string>>;

// First-pass AI/machine translation for fr/es/pt/it/nl/pl/ru/ja/zh-Hans
// (ADR-009) -- de/en are the hand-written originals, the rest are pending
// native-speaker review.
const PageLayoutTranslation: Translation = {
    de: {
        // Navbar
        'nav.settings': 'Einstellungen',
        'nav.language_label': 'Sprache:',

        // Footer
        'footer.tagline': 'Sichere, skalierbare und elegante Authentifizierungslösungen für dein nächstes großes Projekt. Gebaut mit Next.js & Better Auth.',
        'footer.product.title': 'Produkt',
        'footer.product.features': 'Funktionen',
        'footer.product.pricing': 'Preise',
        'footer.product.changelog': 'Änderungsprotokoll',
        'footer.company.title': 'Unternehmen',
        'footer.company.about': 'Über uns',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Karriere',
        'footer.company.contact': 'Kontakt',
        'footer.legal.title': 'Rechtliches',
        'footer.legal.privacy': 'Datenschutzerklärung',
        'footer.legal.terms': 'Nutzungsbedingungen',
        'footer.legal.imprint': 'Impressum',
        'footer.cookie_settings': 'Cookie-Einstellungen',
        'footer.rights': 'Alle Rechte vorbehalten.',

        // 404 page
        'notFound.title': 'Seite nicht gefunden',
        'notFound.subtitle': 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
        'notFound.cta': 'Zur Startseite',

        // Legal fallback banner (S9)
        'legal.fallback-notice': 'Dieser Rechtstext ist in deiner Sprache noch nicht verfügbar -- die englische Version wird angezeigt.',
    },
    en: {
        // Navbar
        'nav.settings': 'Settings',
        'nav.language_label': 'Language:',

        // Footer
        'footer.tagline': 'Secure, scalable, and elegant authentication solutions for your next big project. Built with Next.js & Better Auth.',
        'footer.product.title': 'Product',
        'footer.product.features': 'Features',
        'footer.product.pricing': 'Pricing',
        'footer.product.changelog': 'Changelog',
        'footer.company.title': 'Company',
        'footer.company.about': 'About',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Careers',
        'footer.company.contact': 'Contact',
        'footer.legal.title': 'Legal',
        'footer.legal.privacy': 'Privacy Policy',
        'footer.legal.terms': 'Terms of Service',
        'footer.legal.imprint': 'Imprint',
        'footer.cookie_settings': 'Cookie Settings',
        'footer.rights': 'All rights reserved.',

        // 404 page
        'notFound.title': 'Page not found',
        'notFound.subtitle': "The page you're looking for doesn't exist or has been moved.",
        'notFound.cta': 'Go to homepage',

        // Legal fallback banner (S9)
        'legal.fallback-notice': "This legal page isn't available in your language yet -- showing the English version.",
    },
    fr: {
        'nav.settings': 'Paramètres',
        'nav.language_label': 'Langue :',

        'footer.tagline': 'Des solutions d’authentification sûres, évolutives et élégantes pour votre prochain grand projet. Conçu avec Next.js et Better Auth.',
        'footer.product.title': 'Produit',
        'footer.product.features': 'Fonctionnalités',
        'footer.product.pricing': 'Tarifs',
        'footer.product.changelog': 'Journal des modifications',
        'footer.company.title': 'Entreprise',
        'footer.company.about': 'À propos',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Carrières',
        'footer.company.contact': 'Contact',
        'footer.legal.title': 'Mentions légales',
        'footer.legal.privacy': 'Politique de confidentialité',
        'footer.legal.terms': "Conditions d'utilisation",
        'footer.legal.imprint': 'Mentions légales',
        'footer.cookie_settings': 'Paramètres des cookies',
        'footer.rights': 'Tous droits réservés.',

        'notFound.title': 'Page non trouvée',
        'notFound.subtitle': "La page que vous recherchez n'existe pas ou a été déplacée.",
        'notFound.cta': "Retour à l'accueil",

        'legal.fallback-notice': "Ce texte légal n'est pas encore disponible dans votre langue -- la version anglaise est affichée.",
    },
    es: {
        'nav.settings': 'Ajustes',
        'nav.language_label': 'Idioma:',

        'footer.tagline': 'Soluciones de autenticación seguras, escalables y elegantes para tu próximo gran proyecto. Creado con Next.js y Better Auth.',
        'footer.product.title': 'Producto',
        'footer.product.features': 'Funciones',
        'footer.product.pricing': 'Precios',
        'footer.product.changelog': 'Registro de cambios',
        'footer.company.title': 'Empresa',
        'footer.company.about': 'Sobre nosotros',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Empleo',
        'footer.company.contact': 'Contacto',
        'footer.legal.title': 'Legal',
        'footer.legal.privacy': 'Política de privacidad',
        'footer.legal.terms': 'Términos de servicio',
        'footer.legal.imprint': 'Aviso legal',
        'footer.cookie_settings': 'Configuración de cookies',
        'footer.rights': 'Todos los derechos reservados.',

        'notFound.title': 'Página no encontrada',
        'notFound.subtitle': 'La página que buscas no existe o ha sido movida.',
        'notFound.cta': 'Ir a inicio',

        'legal.fallback-notice': 'Este texto legal aún no está disponible en tu idioma -- se muestra la versión en inglés.',
    },
    pt: {
        'nav.settings': 'Definições',
        'nav.language_label': 'Idioma:',

        'footer.tagline': 'Soluções de autenticação seguras, escaláveis e elegantes para o seu próximo grande projeto. Criado com Next.js e Better Auth.',
        'footer.product.title': 'Produto',
        'footer.product.features': 'Funcionalidades',
        'footer.product.pricing': 'Preços',
        'footer.product.changelog': 'Registo de alterações',
        'footer.company.title': 'Empresa',
        'footer.company.about': 'Sobre nós',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Carreiras',
        'footer.company.contact': 'Contacto',
        'footer.legal.title': 'Legal',
        'footer.legal.privacy': 'Política de privacidade',
        'footer.legal.terms': 'Termos de serviço',
        'footer.legal.imprint': 'Ficha técnica',
        'footer.cookie_settings': 'Definições de cookies',
        'footer.rights': 'Todos os direitos reservados.',

        'notFound.title': 'Página não encontrada',
        'notFound.subtitle': 'A página que procura não existe ou foi movida.',
        'notFound.cta': 'Ir para a página inicial',

        'legal.fallback-notice': 'Este texto legal ainda não está disponível no seu idioma -- é apresentada a versão em inglês.',
    },
    it: {
        'nav.settings': 'Impostazioni',
        'nav.language_label': 'Lingua:',

        'footer.tagline': 'Soluzioni di autenticazione sicure, scalabili ed eleganti per il tuo prossimo grande progetto. Realizzato con Next.js e Better Auth.',
        'footer.product.title': 'Prodotto',
        'footer.product.features': 'Funzionalità',
        'footer.product.pricing': 'Prezzi',
        'footer.product.changelog': 'Changelog',
        'footer.company.title': 'Azienda',
        'footer.company.about': 'Chi siamo',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Lavora con noi',
        'footer.company.contact': 'Contatti',
        'footer.legal.title': 'Legale',
        'footer.legal.privacy': 'Informativa sulla privacy',
        'footer.legal.terms': 'Termini di servizio',
        'footer.legal.imprint': 'Note legali',
        'footer.cookie_settings': 'Impostazioni cookie',
        'footer.rights': 'Tutti i diritti riservati.',

        'notFound.title': 'Pagina non trovata',
        'notFound.subtitle': 'La pagina cercata non esiste o è stata spostata.',
        'notFound.cta': 'Torna alla home',

        'legal.fallback-notice': 'Questo testo legale non è ancora disponibile nella tua lingua -- viene mostrata la versione in inglese.',
    },
    nl: {
        'nav.settings': 'Instellingen',
        'nav.language_label': 'Taal:',

        'footer.tagline': 'Veilige, schaalbare en elegante authenticatie-oplossingen voor je volgende grote project. Gebouwd met Next.js & Better Auth.',
        'footer.product.title': 'Product',
        'footer.product.features': 'Functies',
        'footer.product.pricing': 'Prijzen',
        'footer.product.changelog': 'Wijzigingslogboek',
        'footer.company.title': 'Bedrijf',
        'footer.company.about': 'Over ons',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Vacatures',
        'footer.company.contact': 'Contact',
        'footer.legal.title': 'Juridisch',
        'footer.legal.privacy': 'Privacybeleid',
        'footer.legal.terms': 'Gebruiksvoorwaarden',
        'footer.legal.imprint': 'Colofon',
        'footer.cookie_settings': 'Cookie-instellingen',
        'footer.rights': 'Alle rechten voorbehouden.',

        'notFound.title': 'Pagina niet gevonden',
        'notFound.subtitle': 'De pagina die je zoekt bestaat niet meer of is verplaatst.',
        'notFound.cta': 'Naar de startpagina',

        'legal.fallback-notice': 'Deze juridische tekst is nog niet beschikbaar in jouw taal -- de Engelse versie wordt getoond.',
    },
    pl: {
        'nav.settings': 'Ustawienia',
        'nav.language_label': 'Język:',

        'footer.tagline': 'Bezpieczne, skalowalne i eleganckie rozwiązania uwierzytelniania dla Twojego następnego dużego projektu. Zbudowane z Next.js i Better Auth.',
        'footer.product.title': 'Produkt',
        'footer.product.features': 'Funkcje',
        'footer.product.pricing': 'Cennik',
        'footer.product.changelog': 'Dziennik zmian',
        'footer.company.title': 'Firma',
        'footer.company.about': 'O nas',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Kariera',
        'footer.company.contact': 'Kontakt',
        'footer.legal.title': 'Informacje prawne',
        'footer.legal.privacy': 'Polityka prywatności',
        'footer.legal.terms': 'Warunki korzystania z usługi',
        'footer.legal.imprint': 'Nota prawna',
        'footer.cookie_settings': 'Ustawienia plików cookie',
        'footer.rights': 'Wszelkie prawa zastrzeżone.',

        'notFound.title': 'Nie znaleziono strony',
        'notFound.subtitle': 'Szukana strona nie istnieje lub została przeniesiona.',
        'notFound.cta': 'Przejdź do strony głównej',

        'legal.fallback-notice': 'Ten tekst prawny nie jest jeszcze dostępny w Twoim języku -- wyświetlana jest wersja angielska.',
    },
    ru: {
        'nav.settings': 'Настройки',
        'nav.language_label': 'Язык:',

        'footer.tagline': 'Безопасные, масштабируемые и элегантные решения для аутентификации в вашем следующем крупном проекте. Создано с Next.js и Better Auth.',
        'footer.product.title': 'Продукт',
        'footer.product.features': 'Возможности',
        'footer.product.pricing': 'Цены',
        'footer.product.changelog': 'Журнал изменений',
        'footer.company.title': 'Компания',
        'footer.company.about': 'О нас',
        'footer.company.blog': 'Блог',
        'footer.company.careers': 'Карьера',
        'footer.company.contact': 'Контакты',
        'footer.legal.title': 'Правовая информация',
        'footer.legal.privacy': 'Политика конфиденциальности',
        'footer.legal.terms': 'Условия использования',
        'footer.legal.imprint': 'Реквизиты',
        'footer.cookie_settings': 'Настройки файлов cookie',
        'footer.rights': 'Все права защищены.',

        'notFound.title': 'Страница не найдена',
        'notFound.subtitle': 'Искомая страница не существует или была перемещена.',
        'notFound.cta': 'На главную',

        'legal.fallback-notice': 'Этот юридический текст пока недоступен на вашем языке -- показана английская версия.',
    },
    ja: {
        'nav.settings': '設定',
        'nav.language_label': '言語:',

        'footer.tagline': '次の大きなプロジェクトのための、安全でスケーラブルかつ洗練された認証ソリューション。Next.js と Better Auth で構築。',
        'footer.product.title': 'プロダクト',
        'footer.product.features': '機能',
        'footer.product.pricing': '料金',
        'footer.product.changelog': '更新履歴',
        'footer.company.title': '会社情報',
        'footer.company.about': '会社概要',
        'footer.company.blog': 'ブログ',
        'footer.company.careers': '採用情報',
        'footer.company.contact': 'お問い合わせ',
        'footer.legal.title': '法的情報',
        'footer.legal.privacy': 'プライバシーポリシー',
        'footer.legal.terms': '利用規約',
        'footer.legal.imprint': '運営者情報',
        'footer.cookie_settings': 'Cookie設定',
        'footer.rights': '全著作権所有。',

        'notFound.title': 'ページが見つかりません',
        'notFound.subtitle': 'お探しのページは存在しないか、移動された可能性があります。',
        'notFound.cta': 'ホームに戻る',

        'legal.fallback-notice': 'このページはまだあなたの言語に対応していません -- 英語版を表示しています。',
    },
    'zh-Hans': {
        'nav.settings': '设置',
        'nav.language_label': '语言：',

        'footer.tagline': '为你的下一个重要项目提供安全、可扩展且优雅的身份验证解决方案。基于 Next.js 与 Better Auth 构建。',
        'footer.product.title': '产品',
        'footer.product.features': '功能',
        'footer.product.pricing': '价格',
        'footer.product.changelog': '更新日志',
        'footer.company.title': '公司',
        'footer.company.about': '关于我们',
        'footer.company.blog': '博客',
        'footer.company.careers': '招聘',
        'footer.company.contact': '联系我们',
        'footer.legal.title': '法律信息',
        'footer.legal.privacy': '隐私政策',
        'footer.legal.terms': '服务条款',
        'footer.legal.imprint': '网站备案信息',
        'footer.cookie_settings': 'Cookie 设置',
        'footer.rights': '保留所有权利。',

        'notFound.title': '页面未找到',
        'notFound.subtitle': '你要找的页面不存在或已被移动。',
        'notFound.cta': '返回首页',

        'legal.fallback-notice': '该法律文本暂无你所用语言的版本 -- 目前显示的是英文版本。',
    },
};

export default PageLayoutTranslation;
