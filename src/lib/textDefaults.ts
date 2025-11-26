export type GameTextConfig = {
  tvSpinningMessage: string;
  tvWinMessage: string;
  tvWinSubtitle: string;
  tvLoseMessage: string;
  tvLoseSubtitle: string;
  tvIdleTitle: string;
  tvIdleDescription: string;
  tvDemoBadgeText: string;
  tvDemoButtonText: string;
  tvFooterByline: string;
  tvBuildLabel: string;

  registrationTitle: string;
  registrationSubtitle: string;
  registrationDescription: string;
  registrationSubmitText: string;
  registrationPageTitle: string;
  registrationPageSubtitle: string;
  demoModeTitle: string;
  demoModeDescription: string;

  validatingTitle: string;
  readyTitle: string;
  readySubtitle: string;
  spinButtonText: string;
  spinningTitle: string;
  spinningSubtitle: string;

  mobileWinMessage: string;
  mobileWinSubtitle: string;
  mobileLoseMessage: string;
  mobileLoseSubtitle: string;
  mobileCloseHint: string;

  successMessage: string;
  alreadyPlayedTitle: string;
  alreadyPlayedSubtitle: string;
  errorTitle: string;
  errorRetryButtonText: string;

  formNameLabel: string;
  formNamePlaceholder: string;
  formEmailLabel: string;
  formEmailPlaceholder: string;
  formBirthdateLabel: string;
  formBirthdatePlaceholder: string;
  formPhoneLabel: string;
  formPhonePlaceholder: string;
  instagramCheckboxLabel: string;

  nameValidationMessage: string;
  emailValidationMessage: string;
  phoneValidationMessage: string;
  birthdateValidationMessage: string;
  instagramValidationMessage: string;
  configErrorMessage: string;
  notFoundMessage: string;
  loadErrorMessage: string;
  dbUnavailableMessage: string;
};

const defaultGameTextsEs: GameTextConfig = {
  tvSpinningMessage: '¡Mucha suerte...!',
  tvWinMessage: '¡Premio!',
  tvWinSubtitle: 'El ganador recibirá un email con instrucciones.',
  tvLoseMessage: '¡Casi!',
  tvLoseSubtitle: 'Gracias por participar.',
  tvIdleTitle: '¡Escanea para Jugar!',
  tvIdleDescription: 'Abre la cámara de tu teléfono, apunta al código QR y sigue el enlace para registrarte y jugar.',
  tvDemoBadgeText: 'MODO DEMO',
  tvDemoButtonText: 'Giro de Prueba',
  tvFooterByline: 'un producto de',
  tvBuildLabel: 'Build',

  registrationTitle: '¡Regístrate para Jugar!',
  registrationSubtitle: '',
  registrationDescription: 'Completa tus datos para participar.',
  registrationSubmitText: '¡Registrarme!',
  registrationPageTitle: 'Estás jugando a {game}',
  registrationPageSubtitle: 'Completa tus datos para jugar',
  demoModeTitle: '¡Modo Demo Activo!',
  demoModeDescription: 'El registro de prueba iniciará el giro en la pantalla grande automáticamente.',

  validatingTitle: 'Validando tus datos...',
  readyTitle: '¡Todo Listo!',
  readySubtitle: 'Estás a un paso de la gloria. ¡Mucha suerte!',
  spinButtonText: 'Girar la Ruleta',
  spinningTitle: 'Girando... ¡Mucha suerte!',
  spinningSubtitle: 'Revisa la pantalla grande para ver la animación.',

  mobileWinMessage: '¡Felicidades!',
  mobileWinSubtitle: 'El ganador recibirá un email con instrucciones.',
  mobileLoseMessage: '¡Casi!',
  mobileLoseSubtitle: '¡Mucha suerte para la próxima!',
  mobileCloseHint: 'Puedes cerrar esta ventana.',

  successMessage: 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
  alreadyPlayedTitle: '¡Ya has participado!',
  alreadyPlayedSubtitle: 'Este correo ya ha sido utilizado. ¡Gracias!',
  errorTitle: 'Error',
  errorRetryButtonText: 'Volver a intentar',

  formNameLabel: 'Nombre',
  formNamePlaceholder: 'Tu nombre',
  formEmailLabel: 'Correo Electrónico',
  formEmailPlaceholder: 'tu@correo.com',
  formBirthdateLabel: 'Fecha de nacimiento',
  formBirthdatePlaceholder: 'AAAA-MM-DD',
  formPhoneLabel: 'Teléfono',
  formPhonePlaceholder: 'Tu teléfono',
  instagramCheckboxLabel: 'Para participar debes seguirnos en Instagram',

  nameValidationMessage: 'Tu nombre debe tener al menos 2 caracteres.',
  emailValidationMessage: 'Por favor, introduce un correo electrónico válido.',
  phoneValidationMessage: 'Por favor, introduce un número de teléfono válido.',
  birthdateValidationMessage: 'La fecha de nacimiento es obligatoria.',
  instagramValidationMessage: 'Debes confirmar que sigues la cuenta para participar.',
  configErrorMessage: 'El juego no está configurado correctamente (faltan premios válidos con ID).',
  notFoundMessage: 'Este juego no existe o ha sido eliminado.',
  loadErrorMessage: 'No se pudo cargar la información del juego.',
  dbUnavailableMessage: 'La conexión con la base de datos no está disponible.',
};

const defaultGameTextsEn: GameTextConfig = {
  tvSpinningMessage: 'Good luck...!',
  tvWinMessage: 'Winner!',
  tvWinSubtitle: 'The winner will receive an email with instructions.',
  tvLoseMessage: 'Almost!',
  tvLoseSubtitle: 'Thanks for playing.',
  tvIdleTitle: 'Scan to Play!',
  tvIdleDescription: 'Open your phone camera, scan the QR and follow the link to register and play.',
  tvDemoBadgeText: 'DEMO MODE',
  tvDemoButtonText: 'Test Spin',
  tvFooterByline: 'a product by',
  tvBuildLabel: 'Build',

  registrationTitle: 'Register to Play!',
  registrationSubtitle: '',
  registrationDescription: 'Fill in your details to participate.',
  registrationSubmitText: 'Register',
  registrationPageTitle: 'You are playing {game}',
  registrationPageSubtitle: 'Complete your info to play',
  demoModeTitle: 'Demo Mode Active!',
  demoModeDescription: 'This test registration will trigger the spin on the big screen automatically.',

  validatingTitle: 'Validating your data...',
  readyTitle: 'All Set!',
  readySubtitle: 'You are one step away. Good luck!',
  spinButtonText: 'Spin the Wheel',
  spinningTitle: 'Spinning... Good luck!',
  spinningSubtitle: 'Check the big screen to see the animation.',

  mobileWinMessage: 'Congratulations!',
  mobileWinSubtitle: 'We sent an email with instructions to claim your prize.',
  mobileLoseMessage: 'Almost!',
  mobileLoseSubtitle: 'Better luck next time. Thanks for playing!',
  mobileCloseHint: 'You can close this window.',

  successMessage: 'The wheel on the big screen should start spinning. Thanks for participating!',
  alreadyPlayedTitle: 'You already played!',
  alreadyPlayedSubtitle: 'This email was already used. Thanks!',
  errorTitle: 'Error',
  errorRetryButtonText: 'Try again',

  formNameLabel: 'Name',
  formNamePlaceholder: 'Your name',
  formEmailLabel: 'Email',
  formEmailPlaceholder: 'you@email.com',
  formBirthdateLabel: 'Birthdate',
  formBirthdatePlaceholder: 'YYYY-MM-DD',
  formPhoneLabel: 'Phone',
  formPhonePlaceholder: 'Your phone',
  instagramCheckboxLabel: 'To participate you must follow us on Instagram',

  nameValidationMessage: 'Your name must have at least 2 characters.',
  emailValidationMessage: 'Please enter a valid email.',
  phoneValidationMessage: 'Please enter a valid phone number.',
  birthdateValidationMessage: 'Birthdate is required.',
  instagramValidationMessage: 'You must confirm you follow the account to participate.',
  configErrorMessage: 'The game is not configured correctly (missing valid prizes with ID).',
  notFoundMessage: 'This game does not exist or was removed.',
  loadErrorMessage: 'Could not load game information.',
  dbUnavailableMessage: 'Database connection is not available.',
};

const defaultGameTextsPt: GameTextConfig = {
  tvSpinningMessage: 'Boa sorte...!',
  tvWinMessage: 'Prêmio!',
  tvWinSubtitle: 'O vencedor receberá um email com instruções.',
  tvLoseMessage: 'Quase!',
  tvLoseSubtitle: 'Obrigado por participar.',
  tvIdleTitle: 'Escaneie para jogar!',
  tvIdleDescription: 'Abra a câmera do seu telefone, aponte para o QR e siga o link para se registrar e jogar.',
  tvDemoBadgeText: 'MODO DEMO',
  tvDemoButtonText: 'Giro de teste',
  tvFooterByline: 'um produto de',
  tvBuildLabel: 'Build',

  registrationTitle: 'Registre-se para jogar!',
  registrationSubtitle: '',
  registrationDescription: 'Preencha seus dados para participar.',
  registrationSubmitText: 'Registrar',
  registrationPageTitle: 'Você está jogando {game}',
  registrationPageSubtitle: 'Complete seus dados para jogar',
  demoModeTitle: 'Modo Demo Ativo!',
  demoModeDescription: 'O registro de teste iniciará o giro na tela grande automaticamente.',

  validatingTitle: 'Validando seus dados...',
  readyTitle: 'Tudo pronto!',
  readySubtitle: 'Você está a um passo. Boa sorte!',
  spinButtonText: 'Girar a roleta',
  spinningTitle: 'Girando... Boa sorte!',
  spinningSubtitle: 'Veja a animação na tela grande.',

  mobileWinMessage: 'Parabéns!',
  mobileWinSubtitle: 'Enviamos um email com instruções para receber seu prêmio.',
  mobileLoseMessage: 'Quase!',
  mobileLoseSubtitle: 'Mais sorte na próxima. Obrigado por jogar!',
  mobileCloseHint: 'Você pode fechar esta janela.',

  successMessage: 'A roleta na tela grande deve começar a girar. Obrigado por participar!',
  alreadyPlayedTitle: 'Você já participou!',
  alreadyPlayedSubtitle: 'Este email já foi usado. Obrigado!',
  errorTitle: 'Erro',
  errorRetryButtonText: 'Tentar novamente',

  formNameLabel: 'Nome',
  formNamePlaceholder: 'Seu nome',
  formEmailLabel: 'Email',
  formEmailPlaceholder: 'voce@email.com',
  formBirthdateLabel: 'Data de nascimento',
  formBirthdatePlaceholder: 'AAAA-MM-DD',
  formPhoneLabel: 'Telefone',
  formPhonePlaceholder: 'Seu telefone',
  instagramCheckboxLabel: 'Para participar você deve nos seguir no Instagram',

  nameValidationMessage: 'Seu nome deve ter pelo menos 2 caracteres.',
  emailValidationMessage: 'Por favor, insira um email válido.',
  phoneValidationMessage: 'Por favor, insira um telefone válido.',
  birthdateValidationMessage: 'Data de nascimento é obrigatória.',
  instagramValidationMessage: 'Você deve confirmar que segue a conta para participar.',
  configErrorMessage: 'O jogo não está configurado corretamente (faltam prêmios válidos com ID).',
  notFoundMessage: 'Este jogo não existe ou foi removido.',
  loadErrorMessage: 'Não foi possível carregar as informações do jogo.',
  dbUnavailableMessage: 'A conexão com o banco de dados não está disponível.',
};

const defaultTextsByLang: Record<string, GameTextConfig> = {
  es: defaultGameTextsEs,
  en: defaultGameTextsEn,
  pt: defaultGameTextsPt,
};

export const defaultGameTexts = defaultGameTextsEs;

export function getDefaultTexts(lang?: string): GameTextConfig {
  return defaultTextsByLang[lang || 'es'] || defaultGameTextsEs;
}

export function extractGameTextOverrides(data: any): Partial<GameTextConfig> {
  if (!data) return {};
  const overrides: Partial<GameTextConfig> = {};
  Object.keys(defaultGameTextsEs).forEach((key) => {
    const value = data[key as keyof typeof data];
    if (value !== undefined && value !== null && value !== '') {
      // @ts-expect-error indexer for dynamic keys
      overrides[key] = value as string;
    }
  });
  return overrides;
}

export function mergeGameTexts(data: Partial<GameTextConfig>, lang: string = 'es'): GameTextConfig {
  const defaults = getDefaultTexts(lang);
  return { ...defaults, ...data } as GameTextConfig;
}
