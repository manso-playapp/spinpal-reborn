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

export const defaultGameTexts: GameTextConfig = {
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

export function extractGameTextOverrides(data: any): Partial<GameTextConfig> {
  if (!data) return {};
  const overrides: Partial<GameTextConfig> = {};
  Object.keys(defaultGameTexts).forEach((key) => {
    const value = data[key as keyof typeof data];
    if (value !== undefined && value !== null && value !== '') {
      // @ts-expect-error indexer for dynamic keys
      overrides[key] = value as string;
    }
  });
  return overrides;
}

export function mergeGameTexts(data: Partial<GameTextConfig>): GameTextConfig {
  return { ...defaultGameTexts, ...data } as GameTextConfig;
}
