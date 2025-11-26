export type AdminLang = 'es' | 'en' | 'pt';

type Dict = Record<string, string>;

export const adminDictionary: Record<AdminLang, Dict> = {
  es: {
    dashboard: 'Dashboard',
    dashboardSubtitle: 'Crea, edita y gestiona tus campañas de ruletas interactivas.',
    createGame: 'Crear Juego',
    noGamesTitle: 'Aún no tienes juegos',
    noGamesSubtitle: 'Haz clic en "Crear Juego" para empezar a configurar tu primera ruleta.',
    statusActive: 'Activo',
    statusDemo: 'Demo',
    createdAt: 'Creado',
    moreOptions: 'Más opciones',
    errorDownload: 'Error al descargar',
    errorDownloadDesc: 'No se pudieron descargar los datos. Inténtalo de nuevo.',
    // Header / language selector
    languageLabel: 'Idioma',
    langEs: 'Español',
    langEn: 'English',
    langPt: 'Português',
  },
  en: {
    dashboard: 'Dashboard',
    dashboardSubtitle: 'Create, edit, and manage your interactive wheel campaigns.',
    createGame: 'Create Game',
    noGamesTitle: 'You have no games yet',
    noGamesSubtitle: 'Click "Create Game" to start configuring your first wheel.',
    statusActive: 'Active',
    statusDemo: 'Demo',
    createdAt: 'Created',
    moreOptions: 'More options',
    errorDownload: 'Download error',
    errorDownloadDesc: 'Could not download data. Please try again.',
    languageLabel: 'Language',
    langEs: 'Español',
    langEn: 'English',
    langPt: 'Português',
  },
  pt: {
    dashboard: 'Painel',
    dashboardSubtitle: 'Crie, edite e gerencie suas campanhas de roletas interativas.',
    createGame: 'Criar Jogo',
    noGamesTitle: 'Você ainda não tem jogos',
    noGamesSubtitle: 'Clique em "Criar Jogo" para começar a configurar sua primeira roleta.',
    statusActive: 'Ativo',
    statusDemo: 'Demo',
    createdAt: 'Criado',
    moreOptions: 'Mais opções',
    errorDownload: 'Erro ao baixar',
    errorDownloadDesc: 'Não foi possível baixar os dados. Tente novamente.',
    languageLabel: 'Idioma',
    langEs: 'Español',
    langEn: 'English',
    langPt: 'Português',
  },
};

export const adminNavDictionary: Record<AdminLang, Record<string, string>> = {
  es: {
    menuDashboard: 'Dashboard',
    menuGames: 'Juegos',
    menuClients: 'Clientes',
    menuEmails: 'Correos',
    menuConnections: 'Conexiones',
    menuChangelog: 'Changelog',
  },
  en: {
    menuDashboard: 'Dashboard',
    menuGames: 'Games',
    menuClients: 'Clients',
    menuEmails: 'Emails',
    menuConnections: 'Connections',
    menuChangelog: 'Changelog',
  },
  pt: {
    menuDashboard: 'Painel',
    menuGames: 'Jogos',
    menuClients: 'Clientes',
    menuEmails: 'Emails',
    menuConnections: 'Conexões',
    menuChangelog: 'Changelog',
  },
};

export const tNav = (lang: AdminLang, key: string) => adminNavDictionary[lang]?.[key] || adminNavDictionary.es[key] || key;
