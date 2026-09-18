import type { Language } from './supportedLanguages';

type Translation = Record<Language, Record<string, string>>;

// First-pass AI/machine translation for fr/es/pt/it/nl/pl/ru/ja/zh-Hans
// (ADR-009) -- de/en are the hand-written originals, the rest are pending
// native-speaker review.
const AuthTranslation: Translation = {
    de: {
        'auth.signin.title': 'Willkommen zurück',
        'auth.signup.title': 'Konto erstellen',
        'auth.signin.subtitle': 'Melden Sie sich an, um fortzufahren',
        'auth.signup.subtitle': 'Registrieren Sie sich, um loszulegen',

        'auth.field.name': 'Name',
        'auth.field.email': 'E-Mail',
        'auth.field.password': 'Passwort',

        'auth.error.signin': 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.',
        'auth.error.signup': 'Konto konnte nicht erstellt werden.',

        'auth.submit.pending': 'Einen Moment...',
        'auth.submit.signin': 'Anmelden',
        'auth.submit.signup': 'Konto erstellen',

        'auth.toggle.noAccount': 'Noch kein Konto?',
        'auth.toggle.signup': 'Registrieren',
        'auth.toggle.haveAccount': 'Bereits ein Konto?',
        'auth.toggle.signin': 'Anmelden',

        'auth.forgotPassword.link': 'Passwort vergessen?',
        'auth.forgotPassword.title': 'Passwort zurücksetzen',
        'auth.forgotPassword.subtitle':
            'Geben Sie Ihre E-Mail-Adresse ein, wir senden Ihnen einen Link zum Zurücksetzen des Passworts.',
        'auth.forgotPassword.submit': 'Link senden',
        'auth.forgotPassword.error':
            'Der Link konnte nicht gesendet werden. Bitte überprüfen Sie Ihre E-Mail-Adresse.',
        'auth.forgotPassword.backToLogin': 'Zurück zum Login',
        'auth.forgotPassword.sent.title': 'E-Mail gesendet',
        'auth.forgotPassword.sent.subtitle':
            'Wir haben einen Link zum Zurücksetzen des Passworts gesendet an:',
        'auth.forgotPassword.sent.cta': 'Zurück zum Login',

        'auth.2fa.title': 'Zwei-Faktor-Verifizierung',
        'auth.2fa.subtitle': 'Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.',
        'auth.2fa.codeLabel': 'Verifizierungscode',
        'auth.2fa.error': 'Ungültiger Code. Bitte versuchen Sie es erneut.',
        'auth.2fa.cancel': 'Abbrechen',
        'auth.2fa.verifying': 'Wird geprüft...',
        'auth.2fa.verify': 'Bestätigen',

        'auth.verifyEmail.title': 'Fast geschafft!',
        'auth.verifyEmail.subtitle': 'Wir haben eine Bestätigungs-E-Mail gesendet an:',
        'auth.verifyEmail.resend': 'E-Mail erneut senden',
        'auth.verifyEmail.resending': 'Wird gesendet...',
        'auth.verifyEmail.resent': 'E-Mail wurde erneut gesendet.',
        'auth.verifyEmail.resendError': 'E-Mail konnte nicht gesendet werden.',
        'auth.verifyEmail.backToLogin': 'Zurück zum Login',
        'auth.verifyEmail.page.successTitle': 'E-Mail bestätigt',
        'auth.verifyEmail.page.successSubtitle':
            'Ihre E-Mail-Adresse wurde bestätigt. Sie können sich jetzt anmelden.',
        'auth.verifyEmail.page.errorTitle': 'Link ungültig',
        'auth.verifyEmail.page.errorSubtitle':
            'Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte fordern Sie eine neue E-Mail an.',
        'auth.verifyEmail.page.cta': 'Zum Login',

        'auth.resetPassword.page.title': 'Neues Passwort festlegen',
        'auth.resetPassword.page.subtitle': 'Geben Sie Ihr neues Passwort ein.',
        'auth.resetPassword.field.newPassword': 'Neues Passwort',
        'auth.resetPassword.field.confirmPassword': 'Passwort bestätigen',
        'auth.resetPassword.submit': 'Passwort zurücksetzen',
        'auth.resetPassword.mismatchError': 'Die Passwörter stimmen nicht überein.',
        'auth.resetPassword.error': 'Passwort konnte nicht zurückgesetzt werden.',
        'auth.resetPassword.success.title': 'Passwort geändert',
        'auth.resetPassword.success.subtitle': 'Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.',
        'auth.resetPassword.success.cta': 'Zum Login',
        'auth.resetPassword.invalidLink.title': 'Link ungültig',
        'auth.resetPassword.invalidLink.subtitle':
            'Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordern Sie eine neue E-Mail an.',
        'auth.resetPassword.invalidLink.cta': 'Zum Login',

        'auth.nav.signin': 'Anmelden',
        'auth.nav.settings': 'Einstellungen',
        'auth.nav.signout': 'Abmelden',
    },
    en: {
        'auth.signin.title': 'Welcome back',
        'auth.signup.title': 'Create your account',
        'auth.signin.subtitle': 'Sign in to continue to your account',
        'auth.signup.subtitle': 'Sign up to get started',

        'auth.field.name': 'Name',
        'auth.field.email': 'Email',
        'auth.field.password': 'Password',

        'auth.error.signin': 'Unable to sign in. Check your credentials.',
        'auth.error.signup': 'Unable to create your account.',

        'auth.submit.pending': 'Please wait...',
        'auth.submit.signin': 'Sign in',
        'auth.submit.signup': 'Create account',

        'auth.toggle.noAccount': "Don't have an account?",
        'auth.toggle.signup': 'Sign up',
        'auth.toggle.haveAccount': 'Already have an account?',
        'auth.toggle.signin': 'Sign in',

        'auth.forgotPassword.link': 'Forgot password?',
        'auth.forgotPassword.title': 'Reset password',
        'auth.forgotPassword.subtitle':
            "Enter your email and we'll send you a link to reset your password.",
        'auth.forgotPassword.submit': 'Send reset link',
        'auth.forgotPassword.error':
            'Unable to send the reset link. Please check your email address.',
        'auth.forgotPassword.backToLogin': 'Back to login',
        'auth.forgotPassword.sent.title': 'Email sent',
        'auth.forgotPassword.sent.subtitle': "We've sent a password reset link to:",
        'auth.forgotPassword.sent.cta': 'Back to login',

        'auth.2fa.title': 'Two-factor verification',
        'auth.2fa.subtitle': 'Enter the 6-digit code from your authenticator app.',
        'auth.2fa.codeLabel': 'Verification code',
        'auth.2fa.error': 'Invalid code. Please try again.',
        'auth.2fa.cancel': 'Cancel',
        'auth.2fa.verifying': 'Verifying...',
        'auth.2fa.verify': 'Verify',

        'auth.verifyEmail.title': 'Almost there!',
        'auth.verifyEmail.subtitle': "We've sent a confirmation email to:",
        'auth.verifyEmail.resend': 'Resend email',
        'auth.verifyEmail.resending': 'Sending...',
        'auth.verifyEmail.resent': 'Email has been resent.',
        'auth.verifyEmail.resendError': 'Unable to resend the email.',
        'auth.verifyEmail.backToLogin': 'Back to sign in',
        'auth.verifyEmail.page.successTitle': 'Email confirmed',
        'auth.verifyEmail.page.successSubtitle':
            'Your email address has been confirmed. You can now sign in.',
        'auth.verifyEmail.page.errorTitle': 'Invalid link',
        'auth.verifyEmail.page.errorSubtitle':
            'This confirmation link is invalid or has expired. Please request a new email.',
        'auth.verifyEmail.page.cta': 'Go to login',

        'auth.resetPassword.page.title': 'Set a new password',
        'auth.resetPassword.page.subtitle': 'Enter your new password below.',
        'auth.resetPassword.field.newPassword': 'New password',
        'auth.resetPassword.field.confirmPassword': 'Confirm password',
        'auth.resetPassword.submit': 'Reset password',
        'auth.resetPassword.mismatchError': "Passwords don't match.",
        'auth.resetPassword.error': 'Unable to reset your password.',
        'auth.resetPassword.success.title': 'Password changed',
        'auth.resetPassword.success.subtitle': 'Your password has been changed. You can now sign in.',
        'auth.resetPassword.success.cta': 'Go to login',
        'auth.resetPassword.invalidLink.title': 'Invalid link',
        'auth.resetPassword.invalidLink.subtitle':
            'This password reset link is invalid or has expired. Please request a new email.',
        'auth.resetPassword.invalidLink.cta': 'Go to login',

        'auth.nav.signin': 'Sign in',
        'auth.nav.settings': 'Settings',
        'auth.nav.signout': 'Sign out',
    },
    fr: {
        'auth.signin.title': 'Content de vous revoir',
        'auth.signup.title': 'Créer votre compte',
        'auth.signin.subtitle': 'Connectez-vous pour continuer',
        'auth.signup.subtitle': 'Inscrivez-vous pour commencer',

        'auth.field.name': 'Nom',
        'auth.field.email': 'E-mail',
        'auth.field.password': 'Mot de passe',

        'auth.error.signin': 'Connexion impossible. Vérifiez vos identifiants.',
        'auth.error.signup': 'Impossible de créer votre compte.',

        'auth.submit.pending': 'Veuillez patienter...',
        'auth.submit.signin': 'Se connecter',
        'auth.submit.signup': 'Créer un compte',

        'auth.toggle.noAccount': "Vous n'avez pas de compte ?",
        'auth.toggle.signup': "S'inscrire",
        'auth.toggle.haveAccount': 'Vous avez déjà un compte ?',
        'auth.toggle.signin': 'Se connecter',

        'auth.forgotPassword.link': 'Mot de passe oublié ?',
        'auth.forgotPassword.title': 'Réinitialiser le mot de passe',
        'auth.forgotPassword.subtitle':
            'Saisissez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.',
        'auth.forgotPassword.submit': 'Envoyer le lien',
        'auth.forgotPassword.error':
            "Impossible d'envoyer le lien. Veuillez vérifier votre adresse e-mail.",
        'auth.forgotPassword.backToLogin': 'Retour à la connexion',
        'auth.forgotPassword.sent.title': 'E-mail envoyé',
        'auth.forgotPassword.sent.subtitle': 'Nous avons envoyé un lien de réinitialisation à :',
        'auth.forgotPassword.sent.cta': 'Retour à la connexion',

        'auth.2fa.title': 'Vérification à deux facteurs',
        'auth.2fa.subtitle': 'Saisissez le code à 6 chiffres de votre application d’authentification.',
        'auth.2fa.codeLabel': 'Code de vérification',
        'auth.2fa.error': 'Code invalide. Veuillez réessayer.',
        'auth.2fa.cancel': 'Annuler',
        'auth.2fa.verifying': 'Vérification en cours...',
        'auth.2fa.verify': 'Vérifier',

        'auth.verifyEmail.title': 'Presque terminé !',
        'auth.verifyEmail.subtitle': 'Nous avons envoyé un e-mail de confirmation à :',
        'auth.verifyEmail.resend': "Renvoyer l'e-mail",
        'auth.verifyEmail.resending': 'Envoi en cours...',
        'auth.verifyEmail.resent': 'L’e-mail a été renvoyé.',
        'auth.verifyEmail.resendError': "Impossible de renvoyer l'e-mail.",
        'auth.verifyEmail.backToLogin': 'Retour à la connexion',
        'auth.verifyEmail.page.successTitle': 'E-mail confirmé',
        'auth.verifyEmail.page.successSubtitle':
            'Votre adresse e-mail a été confirmée. Vous pouvez maintenant vous connecter.',
        'auth.verifyEmail.page.errorTitle': 'Lien invalide',
        'auth.verifyEmail.page.errorSubtitle':
            "Ce lien de confirmation est invalide ou a expiré. Veuillez demander un nouvel e-mail.",
        'auth.verifyEmail.page.cta': 'Aller à la connexion',

        'auth.resetPassword.page.title': 'Définir un nouveau mot de passe',
        'auth.resetPassword.page.subtitle': 'Saisissez votre nouveau mot de passe ci-dessous.',
        'auth.resetPassword.field.newPassword': 'Nouveau mot de passe',
        'auth.resetPassword.field.confirmPassword': 'Confirmer le mot de passe',
        'auth.resetPassword.submit': 'Réinitialiser le mot de passe',
        'auth.resetPassword.mismatchError': 'Les mots de passe ne correspondent pas.',
        'auth.resetPassword.error': 'Impossible de réinitialiser votre mot de passe.',
        'auth.resetPassword.success.title': 'Mot de passe modifié',
        'auth.resetPassword.success.subtitle': 'Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.',
        'auth.resetPassword.success.cta': 'Aller à la connexion',
        'auth.resetPassword.invalidLink.title': 'Lien invalide',
        'auth.resetPassword.invalidLink.subtitle':
            'Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouvel e-mail.',
        'auth.resetPassword.invalidLink.cta': 'Aller à la connexion',

        'auth.nav.signin': 'Se connecter',
        'auth.nav.settings': 'Paramètres',
        'auth.nav.signout': 'Se déconnecter',
    },
    es: {
        'auth.signin.title': 'Bienvenido de nuevo',
        'auth.signup.title': 'Crea tu cuenta',
        'auth.signin.subtitle': 'Inicia sesión para continuar',
        'auth.signup.subtitle': 'Regístrate para empezar',

        'auth.field.name': 'Nombre',
        'auth.field.email': 'Correo electrónico',
        'auth.field.password': 'Contraseña',

        'auth.error.signin': 'No se pudo iniciar sesión. Comprueba tus credenciales.',
        'auth.error.signup': 'No se pudo crear tu cuenta.',

        'auth.submit.pending': 'Un momento...',
        'auth.submit.signin': 'Iniciar sesión',
        'auth.submit.signup': 'Crear cuenta',

        'auth.toggle.noAccount': '¿No tienes cuenta?',
        'auth.toggle.signup': 'Regístrate',
        'auth.toggle.haveAccount': '¿Ya tienes cuenta?',
        'auth.toggle.signin': 'Iniciar sesión',

        'auth.forgotPassword.link': '¿Olvidaste tu contraseña?',
        'auth.forgotPassword.title': 'Restablecer contraseña',
        'auth.forgotPassword.subtitle':
            'Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.',
        'auth.forgotPassword.submit': 'Enviar enlace',
        'auth.forgotPassword.error':
            'No se pudo enviar el enlace. Comprueba tu dirección de correo.',
        'auth.forgotPassword.backToLogin': 'Volver al inicio de sesión',
        'auth.forgotPassword.sent.title': 'Correo enviado',
        'auth.forgotPassword.sent.subtitle': 'Hemos enviado un enlace para restablecer la contraseña a:',
        'auth.forgotPassword.sent.cta': 'Volver al inicio de sesión',

        'auth.2fa.title': 'Verificación en dos pasos',
        'auth.2fa.subtitle': 'Introduce el código de 6 dígitos de tu aplicación de autenticación.',
        'auth.2fa.codeLabel': 'Código de verificación',
        'auth.2fa.error': 'Código no válido. Inténtalo de nuevo.',
        'auth.2fa.cancel': 'Cancelar',
        'auth.2fa.verifying': 'Verificando...',
        'auth.2fa.verify': 'Verificar',

        'auth.verifyEmail.title': '¡Ya casi está!',
        'auth.verifyEmail.subtitle': 'Hemos enviado un correo de confirmación a:',
        'auth.verifyEmail.resend': 'Reenviar correo',
        'auth.verifyEmail.resending': 'Enviando...',
        'auth.verifyEmail.resent': 'El correo se ha reenviado.',
        'auth.verifyEmail.resendError': 'No se pudo reenviar el correo.',
        'auth.verifyEmail.backToLogin': 'Volver al inicio de sesión',
        'auth.verifyEmail.page.successTitle': 'Correo confirmado',
        'auth.verifyEmail.page.successSubtitle':
            'Tu dirección de correo ha sido confirmada. Ya puedes iniciar sesión.',
        'auth.verifyEmail.page.errorTitle': 'Enlace no válido',
        'auth.verifyEmail.page.errorSubtitle':
            'Este enlace de confirmación no es válido o ha caducado. Solicita un nuevo correo.',
        'auth.verifyEmail.page.cta': 'Ir a inicio de sesión',

        'auth.resetPassword.page.title': 'Establece una nueva contraseña',
        'auth.resetPassword.page.subtitle': 'Introduce tu nueva contraseña a continuación.',
        'auth.resetPassword.field.newPassword': 'Nueva contraseña',
        'auth.resetPassword.field.confirmPassword': 'Confirmar contraseña',
        'auth.resetPassword.submit': 'Restablecer contraseña',
        'auth.resetPassword.mismatchError': 'Las contraseñas no coinciden.',
        'auth.resetPassword.error': 'No se pudo restablecer tu contraseña.',
        'auth.resetPassword.success.title': 'Contraseña cambiada',
        'auth.resetPassword.success.subtitle': 'Tu contraseña se ha cambiado. Ya puedes iniciar sesión.',
        'auth.resetPassword.success.cta': 'Ir a inicio de sesión',
        'auth.resetPassword.invalidLink.title': 'Enlace no válido',
        'auth.resetPassword.invalidLink.subtitle':
            'Este enlace para restablecer la contraseña no es válido o ha caducado. Solicita un nuevo correo.',
        'auth.resetPassword.invalidLink.cta': 'Ir a inicio de sesión',

        'auth.nav.signin': 'Iniciar sesión',
        'auth.nav.settings': 'Ajustes',
        'auth.nav.signout': 'Cerrar sesión',
    },
    pt: {
        'auth.signin.title': 'Bem-vindo de volta',
        'auth.signup.title': 'Crie a sua conta',
        'auth.signin.subtitle': 'Inicie sessão para continuar',
        'auth.signup.subtitle': 'Registe-se para começar',

        'auth.field.name': 'Nome',
        'auth.field.email': 'E-mail',
        'auth.field.password': 'Palavra-passe',

        'auth.error.signin': 'Não foi possível iniciar sessão. Verifique as suas credenciais.',
        'auth.error.signup': 'Não foi possível criar a sua conta.',

        'auth.submit.pending': 'Um momento...',
        'auth.submit.signin': 'Iniciar sessão',
        'auth.submit.signup': 'Criar conta',

        'auth.toggle.noAccount': 'Ainda não tem conta?',
        'auth.toggle.signup': 'Registar',
        'auth.toggle.haveAccount': 'Já tem uma conta?',
        'auth.toggle.signin': 'Iniciar sessão',

        'auth.forgotPassword.link': 'Esqueceu a palavra-passe?',
        'auth.forgotPassword.title': 'Redefinir palavra-passe',
        'auth.forgotPassword.subtitle':
            'Introduza o seu e-mail e enviaremos um link para redefinir a sua palavra-passe.',
        'auth.forgotPassword.submit': 'Enviar link',
        'auth.forgotPassword.error':
            'Não foi possível enviar o link. Verifique o seu endereço de e-mail.',
        'auth.forgotPassword.backToLogin': 'Voltar ao início de sessão',
        'auth.forgotPassword.sent.title': 'E-mail enviado',
        'auth.forgotPassword.sent.subtitle': 'Enviámos um link para redefinir a palavra-passe para:',
        'auth.forgotPassword.sent.cta': 'Voltar ao início de sessão',

        'auth.2fa.title': 'Verificação em dois passos',
        'auth.2fa.subtitle': 'Introduza o código de 6 dígitos da sua aplicação de autenticação.',
        'auth.2fa.codeLabel': 'Código de verificação',
        'auth.2fa.error': 'Código inválido. Tente novamente.',
        'auth.2fa.cancel': 'Cancelar',
        'auth.2fa.verifying': 'A verificar...',
        'auth.2fa.verify': 'Verificar',

        'auth.verifyEmail.title': 'Está quase!',
        'auth.verifyEmail.subtitle': 'Enviámos um e-mail de confirmação para:',
        'auth.verifyEmail.resend': 'Reenviar e-mail',
        'auth.verifyEmail.resending': 'A enviar...',
        'auth.verifyEmail.resent': 'O e-mail foi reenviado.',
        'auth.verifyEmail.resendError': 'Não foi possível reenviar o e-mail.',
        'auth.verifyEmail.backToLogin': 'Voltar ao início de sessão',
        'auth.verifyEmail.page.successTitle': 'E-mail confirmado',
        'auth.verifyEmail.page.successSubtitle':
            'O seu endereço de e-mail foi confirmado. Já pode iniciar sessão.',
        'auth.verifyEmail.page.errorTitle': 'Link inválido',
        'auth.verifyEmail.page.errorSubtitle':
            'Este link de confirmação é inválido ou expirou. Solicite um novo e-mail.',
        'auth.verifyEmail.page.cta': 'Ir para o início de sessão',

        'auth.resetPassword.page.title': 'Definir nova palavra-passe',
        'auth.resetPassword.page.subtitle': 'Introduza a sua nova palavra-passe abaixo.',
        'auth.resetPassword.field.newPassword': 'Nova palavra-passe',
        'auth.resetPassword.field.confirmPassword': 'Confirmar palavra-passe',
        'auth.resetPassword.submit': 'Redefinir palavra-passe',
        'auth.resetPassword.mismatchError': 'As palavras-passe não coincidem.',
        'auth.resetPassword.error': 'Não foi possível redefinir a sua palavra-passe.',
        'auth.resetPassword.success.title': 'Palavra-passe alterada',
        'auth.resetPassword.success.subtitle': 'A sua palavra-passe foi alterada. Já pode iniciar sessão.',
        'auth.resetPassword.success.cta': 'Ir para o início de sessão',
        'auth.resetPassword.invalidLink.title': 'Link inválido',
        'auth.resetPassword.invalidLink.subtitle':
            'Este link de redefinição de palavra-passe é inválido ou expirou. Solicite um novo e-mail.',
        'auth.resetPassword.invalidLink.cta': 'Ir para o início de sessão',

        'auth.nav.signin': 'Iniciar sessão',
        'auth.nav.settings': 'Definições',
        'auth.nav.signout': 'Terminar sessão',
    },
    it: {
        'auth.signin.title': 'Bentornato',
        'auth.signup.title': 'Crea il tuo account',
        'auth.signin.subtitle': 'Accedi per continuare',
        'auth.signup.subtitle': 'Registrati per iniziare',

        'auth.field.name': 'Nome',
        'auth.field.email': 'Email',
        'auth.field.password': 'Password',

        'auth.error.signin': 'Accesso non riuscito. Controlla le tue credenziali.',
        'auth.error.signup': 'Impossibile creare il tuo account.',

        'auth.submit.pending': 'Un momento...',
        'auth.submit.signin': 'Accedi',
        'auth.submit.signup': 'Crea account',

        'auth.toggle.noAccount': 'Non hai un account?',
        'auth.toggle.signup': 'Registrati',
        'auth.toggle.haveAccount': 'Hai già un account?',
        'auth.toggle.signin': 'Accedi',

        'auth.forgotPassword.link': 'Password dimenticata?',
        'auth.forgotPassword.title': 'Reimposta password',
        'auth.forgotPassword.subtitle':
            'Inserisci la tua email e ti invieremo un link per reimpostare la password.',
        'auth.forgotPassword.submit': 'Invia link',
        'auth.forgotPassword.error':
            'Impossibile inviare il link. Controlla il tuo indirizzo email.',
        'auth.forgotPassword.backToLogin': 'Torna al login',
        'auth.forgotPassword.sent.title': 'Email inviata',
        'auth.forgotPassword.sent.subtitle': 'Abbiamo inviato un link per reimpostare la password a:',
        'auth.forgotPassword.sent.cta': 'Torna al login',

        'auth.2fa.title': 'Verifica a due fattori',
        'auth.2fa.subtitle': 'Inserisci il codice a 6 cifre dalla tua app di autenticazione.',
        'auth.2fa.codeLabel': 'Codice di verifica',
        'auth.2fa.error': 'Codice non valido. Riprova.',
        'auth.2fa.cancel': 'Annulla',
        'auth.2fa.verifying': 'Verifica in corso...',
        'auth.2fa.verify': 'Verifica',

        'auth.verifyEmail.title': 'Ci siamo quasi!',
        'auth.verifyEmail.subtitle': 'Abbiamo inviato un’email di conferma a:',
        'auth.verifyEmail.resend': 'Invia di nuovo l’email',
        'auth.verifyEmail.resending': 'Invio in corso...',
        'auth.verifyEmail.resent': 'L’email è stata inviata di nuovo.',
        'auth.verifyEmail.resendError': 'Impossibile inviare di nuovo l’email.',
        'auth.verifyEmail.backToLogin': 'Torna al login',
        'auth.verifyEmail.page.successTitle': 'Email confermata',
        'auth.verifyEmail.page.successSubtitle':
            'Il tuo indirizzo email è stato confermato. Ora puoi accedere.',
        'auth.verifyEmail.page.errorTitle': 'Link non valido',
        'auth.verifyEmail.page.errorSubtitle':
            'Questo link di conferma non è valido o è scaduto. Richiedi una nuova email.',
        'auth.verifyEmail.page.cta': 'Vai al login',

        'auth.resetPassword.page.title': 'Imposta una nuova password',
        'auth.resetPassword.page.subtitle': 'Inserisci di seguito la tua nuova password.',
        'auth.resetPassword.field.newPassword': 'Nuova password',
        'auth.resetPassword.field.confirmPassword': 'Conferma password',
        'auth.resetPassword.submit': 'Reimposta password',
        'auth.resetPassword.mismatchError': 'Le password non coincidono.',
        'auth.resetPassword.error': 'Impossibile reimpostare la tua password.',
        'auth.resetPassword.success.title': 'Password modificata',
        'auth.resetPassword.success.subtitle': 'La tua password è stata modificata. Ora puoi accedere.',
        'auth.resetPassword.success.cta': 'Vai al login',
        'auth.resetPassword.invalidLink.title': 'Link non valido',
        'auth.resetPassword.invalidLink.subtitle':
            'Questo link per reimpostare la password non è valido o è scaduto. Richiedi una nuova email.',
        'auth.resetPassword.invalidLink.cta': 'Vai al login',

        'auth.nav.signin': 'Accedi',
        'auth.nav.settings': 'Impostazioni',
        'auth.nav.signout': 'Esci',
    },
    nl: {
        'auth.signin.title': 'Welkom terug',
        'auth.signup.title': 'Maak je account aan',
        'auth.signin.subtitle': 'Log in om verder te gaan',
        'auth.signup.subtitle': 'Registreer om te beginnen',

        'auth.field.name': 'Naam',
        'auth.field.email': 'E-mail',
        'auth.field.password': 'Wachtwoord',

        'auth.error.signin': 'Inloggen mislukt. Controleer je gegevens.',
        'auth.error.signup': 'Je account kon niet worden aangemaakt.',

        'auth.submit.pending': 'Even geduld...',
        'auth.submit.signin': 'Inloggen',
        'auth.submit.signup': 'Account aanmaken',

        'auth.toggle.noAccount': 'Nog geen account?',
        'auth.toggle.signup': 'Registreren',
        'auth.toggle.haveAccount': 'Heb je al een account?',
        'auth.toggle.signin': 'Inloggen',

        'auth.forgotPassword.link': 'Wachtwoord vergeten?',
        'auth.forgotPassword.title': 'Wachtwoord opnieuw instellen',
        'auth.forgotPassword.subtitle':
            'Voer je e-mailadres in en we sturen je een link om je wachtwoord opnieuw in te stellen.',
        'auth.forgotPassword.submit': 'Link versturen',
        'auth.forgotPassword.error':
            'De link kon niet worden verstuurd. Controleer je e-mailadres.',
        'auth.forgotPassword.backToLogin': 'Terug naar inloggen',
        'auth.forgotPassword.sent.title': 'E-mail verstuurd',
        'auth.forgotPassword.sent.subtitle': 'We hebben een link om je wachtwoord opnieuw in te stellen gestuurd naar:',
        'auth.forgotPassword.sent.cta': 'Terug naar inloggen',

        'auth.2fa.title': 'Tweefactorverificatie',
        'auth.2fa.subtitle': 'Voer de 6-cijferige code uit je authenticator-app in.',
        'auth.2fa.codeLabel': 'Verificatiecode',
        'auth.2fa.error': 'Ongeldige code. Probeer het opnieuw.',
        'auth.2fa.cancel': 'Annuleren',
        'auth.2fa.verifying': 'Controleren...',
        'auth.2fa.verify': 'Bevestigen',

        'auth.verifyEmail.title': 'Bijna klaar!',
        'auth.verifyEmail.subtitle': 'We hebben een bevestigingsmail gestuurd naar:',
        'auth.verifyEmail.resend': 'E-mail opnieuw versturen',
        'auth.verifyEmail.resending': 'Versturen...',
        'auth.verifyEmail.resent': 'De e-mail is opnieuw verstuurd.',
        'auth.verifyEmail.resendError': 'De e-mail kon niet opnieuw worden verstuurd.',
        'auth.verifyEmail.backToLogin': 'Terug naar inloggen',
        'auth.verifyEmail.page.successTitle': 'E-mail bevestigd',
        'auth.verifyEmail.page.successSubtitle':
            'Je e-mailadres is bevestigd. Je kunt nu inloggen.',
        'auth.verifyEmail.page.errorTitle': 'Ongeldige link',
        'auth.verifyEmail.page.errorSubtitle':
            'Deze bevestigingslink is ongeldig of verlopen. Vraag een nieuwe e-mail aan.',
        'auth.verifyEmail.page.cta': 'Naar inloggen',

        'auth.resetPassword.page.title': 'Nieuw wachtwoord instellen',
        'auth.resetPassword.page.subtitle': 'Voer hieronder je nieuwe wachtwoord in.',
        'auth.resetPassword.field.newPassword': 'Nieuw wachtwoord',
        'auth.resetPassword.field.confirmPassword': 'Wachtwoord bevestigen',
        'auth.resetPassword.submit': 'Wachtwoord opnieuw instellen',
        'auth.resetPassword.mismatchError': 'De wachtwoorden komen niet overeen.',
        'auth.resetPassword.error': 'Je wachtwoord kon niet opnieuw worden ingesteld.',
        'auth.resetPassword.success.title': 'Wachtwoord gewijzigd',
        'auth.resetPassword.success.subtitle': 'Je wachtwoord is gewijzigd. Je kunt nu inloggen.',
        'auth.resetPassword.success.cta': 'Naar inloggen',
        'auth.resetPassword.invalidLink.title': 'Ongeldige link',
        'auth.resetPassword.invalidLink.subtitle':
            'Deze link om je wachtwoord opnieuw in te stellen is ongeldig of verlopen. Vraag een nieuwe e-mail aan.',
        'auth.resetPassword.invalidLink.cta': 'Naar inloggen',

        'auth.nav.signin': 'Inloggen',
        'auth.nav.settings': 'Instellingen',
        'auth.nav.signout': 'Uitloggen',
    },
    pl: {
        'auth.signin.title': 'Witamy ponownie',
        'auth.signup.title': 'Utwórz konto',
        'auth.signin.subtitle': 'Zaloguj się, aby kontynuować',
        'auth.signup.subtitle': 'Zarejestruj się, aby zacząć',

        'auth.field.name': 'Imię',
        'auth.field.email': 'E-mail',
        'auth.field.password': 'Hasło',

        'auth.error.signin': 'Nie udało się zalogować. Sprawdź swoje dane logowania.',
        'auth.error.signup': 'Nie udało się utworzyć konta.',

        'auth.submit.pending': 'Chwileczkę...',
        'auth.submit.signin': 'Zaloguj się',
        'auth.submit.signup': 'Utwórz konto',

        'auth.toggle.noAccount': 'Nie masz jeszcze konta?',
        'auth.toggle.signup': 'Zarejestruj się',
        'auth.toggle.haveAccount': 'Masz już konto?',
        'auth.toggle.signin': 'Zaloguj się',

        'auth.forgotPassword.link': 'Nie pamiętasz hasła?',
        'auth.forgotPassword.title': 'Zresetuj hasło',
        'auth.forgotPassword.subtitle':
            'Podaj swój adres e-mail, a wyślemy Ci link do zresetowania hasła.',
        'auth.forgotPassword.submit': 'Wyślij link',
        'auth.forgotPassword.error':
            'Nie udało się wysłać linku. Sprawdź swój adres e-mail.',
        'auth.forgotPassword.backToLogin': 'Wróć do logowania',
        'auth.forgotPassword.sent.title': 'E-mail wysłany',
        'auth.forgotPassword.sent.subtitle': 'Wysłaliśmy link do zresetowania hasła na adres:',
        'auth.forgotPassword.sent.cta': 'Wróć do logowania',

        'auth.2fa.title': 'Weryfikacja dwuskładnikowa',
        'auth.2fa.subtitle': 'Wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej.',
        'auth.2fa.codeLabel': 'Kod weryfikacyjny',
        'auth.2fa.error': 'Nieprawidłowy kod. Spróbuj ponownie.',
        'auth.2fa.cancel': 'Anuluj',
        'auth.2fa.verifying': 'Weryfikowanie...',
        'auth.2fa.verify': 'Potwierdź',

        'auth.verifyEmail.title': 'Już prawie!',
        'auth.verifyEmail.subtitle': 'Wysłaliśmy e-mail potwierdzający na adres:',
        'auth.verifyEmail.resend': 'Wyślij e-mail ponownie',
        'auth.verifyEmail.resending': 'Wysyłanie...',
        'auth.verifyEmail.resent': 'E-mail został wysłany ponownie.',
        'auth.verifyEmail.resendError': 'Nie udało się ponownie wysłać e-maila.',
        'auth.verifyEmail.backToLogin': 'Wróć do logowania',
        'auth.verifyEmail.page.successTitle': 'E-mail potwierdzony',
        'auth.verifyEmail.page.successSubtitle':
            'Twój adres e-mail został potwierdzony. Możesz się teraz zalogować.',
        'auth.verifyEmail.page.errorTitle': 'Nieprawidłowy link',
        'auth.verifyEmail.page.errorSubtitle':
            'Ten link potwierdzający jest nieprawidłowy lub wygasł. Poproś o nowy e-mail.',
        'auth.verifyEmail.page.cta': 'Przejdź do logowania',

        'auth.resetPassword.page.title': 'Ustaw nowe hasło',
        'auth.resetPassword.page.subtitle': 'Wprowadź nowe hasło poniżej.',
        'auth.resetPassword.field.newPassword': 'Nowe hasło',
        'auth.resetPassword.field.confirmPassword': 'Potwierdź hasło',
        'auth.resetPassword.submit': 'Zresetuj hasło',
        'auth.resetPassword.mismatchError': 'Hasła nie są zgodne.',
        'auth.resetPassword.error': 'Nie udało się zresetować hasła.',
        'auth.resetPassword.success.title': 'Hasło zmienione',
        'auth.resetPassword.success.subtitle': 'Twoje hasło zostało zmienione. Możesz się teraz zalogować.',
        'auth.resetPassword.success.cta': 'Przejdź do logowania',
        'auth.resetPassword.invalidLink.title': 'Nieprawidłowy link',
        'auth.resetPassword.invalidLink.subtitle':
            'Ten link do resetowania hasła jest nieprawidłowy lub wygasł. Poproś o nowy e-mail.',
        'auth.resetPassword.invalidLink.cta': 'Przejdź do logowania',

        'auth.nav.signin': 'Zaloguj się',
        'auth.nav.settings': 'Ustawienia',
        'auth.nav.signout': 'Wyloguj się',
    },
    ru: {
        'auth.signin.title': 'С возвращением',
        'auth.signup.title': 'Создайте аккаунт',
        'auth.signin.subtitle': 'Войдите, чтобы продолжить',
        'auth.signup.subtitle': 'Зарегистрируйтесь, чтобы начать',

        'auth.field.name': 'Имя',
        'auth.field.email': 'Email',
        'auth.field.password': 'Пароль',

        'auth.error.signin': 'Не удалось войти. Проверьте свои данные.',
        'auth.error.signup': 'Не удалось создать аккаунт.',

        'auth.submit.pending': 'Один момент...',
        'auth.submit.signin': 'Войти',
        'auth.submit.signup': 'Создать аккаунт',

        'auth.toggle.noAccount': 'Нет аккаунта?',
        'auth.toggle.signup': 'Зарегистрироваться',
        'auth.toggle.haveAccount': 'Уже есть аккаунт?',
        'auth.toggle.signin': 'Войти',

        'auth.forgotPassword.link': 'Забыли пароль?',
        'auth.forgotPassword.title': 'Сброс пароля',
        'auth.forgotPassword.subtitle':
            'Введите свой email, и мы отправим ссылку для сброса пароля.',
        'auth.forgotPassword.submit': 'Отправить ссылку',
        'auth.forgotPassword.error':
            'Не удалось отправить ссылку. Проверьте адрес электронной почты.',
        'auth.forgotPassword.backToLogin': 'Назад ко входу',
        'auth.forgotPassword.sent.title': 'Письмо отправлено',
        'auth.forgotPassword.sent.subtitle': 'Мы отправили ссылку для сброса пароля на:',
        'auth.forgotPassword.sent.cta': 'Назад ко входу',

        'auth.2fa.title': 'Двухфакторная проверка',
        'auth.2fa.subtitle': 'Введите 6-значный код из приложения-аутентификатора.',
        'auth.2fa.codeLabel': 'Код подтверждения',
        'auth.2fa.error': 'Неверный код. Попробуйте снова.',
        'auth.2fa.cancel': 'Отмена',
        'auth.2fa.verifying': 'Проверка...',
        'auth.2fa.verify': 'Подтвердить',

        'auth.verifyEmail.title': 'Почти готово!',
        'auth.verifyEmail.subtitle': 'Мы отправили письмо с подтверждением на:',
        'auth.verifyEmail.resend': 'Отправить письмо повторно',
        'auth.verifyEmail.resending': 'Отправка...',
        'auth.verifyEmail.resent': 'Письмо отправлено повторно.',
        'auth.verifyEmail.resendError': 'Не удалось отправить письмо повторно.',
        'auth.verifyEmail.backToLogin': 'Назад ко входу',
        'auth.verifyEmail.page.successTitle': 'Email подтверждён',
        'auth.verifyEmail.page.successSubtitle':
            'Ваш адрес электронной почты подтверждён. Теперь вы можете войти.',
        'auth.verifyEmail.page.errorTitle': 'Недействительная ссылка',
        'auth.verifyEmail.page.errorSubtitle':
            'Эта ссылка подтверждения недействительна или истекла. Запросите новое письмо.',
        'auth.verifyEmail.page.cta': 'Перейти ко входу',

        'auth.resetPassword.page.title': 'Установить новый пароль',
        'auth.resetPassword.page.subtitle': 'Введите новый пароль ниже.',
        'auth.resetPassword.field.newPassword': 'Новый пароль',
        'auth.resetPassword.field.confirmPassword': 'Подтвердите пароль',
        'auth.resetPassword.submit': 'Сбросить пароль',
        'auth.resetPassword.mismatchError': 'Пароли не совпадают.',
        'auth.resetPassword.error': 'Не удалось сбросить пароль.',
        'auth.resetPassword.success.title': 'Пароль изменён',
        'auth.resetPassword.success.subtitle': 'Ваш пароль изменён. Теперь вы можете войти.',
        'auth.resetPassword.success.cta': 'Перейти ко входу',
        'auth.resetPassword.invalidLink.title': 'Недействительная ссылка',
        'auth.resetPassword.invalidLink.subtitle':
            'Эта ссылка для сброса пароля недействительна или истекла. Запросите новое письмо.',
        'auth.resetPassword.invalidLink.cta': 'Перейти ко входу',

        'auth.nav.signin': 'Войти',
        'auth.nav.settings': 'Настройки',
        'auth.nav.signout': 'Выйти',
    },
    ja: {
        'auth.signin.title': 'おかえりなさい',
        'auth.signup.title': 'アカウントを作成',
        'auth.signin.subtitle': 'ログインして続ける',
        'auth.signup.subtitle': '登録して始める',

        'auth.field.name': '名前',
        'auth.field.email': 'メールアドレス',
        'auth.field.password': 'パスワード',

        'auth.error.signin': 'ログインできませんでした。認証情報を確認してください。',
        'auth.error.signup': 'アカウントを作成できませんでした。',

        'auth.submit.pending': 'しばらくお待ちください...',
        'auth.submit.signin': 'ログイン',
        'auth.submit.signup': 'アカウントを作成',

        'auth.toggle.noAccount': 'アカウントをお持ちでないですか？',
        'auth.toggle.signup': '登録する',
        'auth.toggle.haveAccount': 'すでにアカウントをお持ちですか？',
        'auth.toggle.signin': 'ログイン',

        'auth.forgotPassword.link': 'パスワードをお忘れですか？',
        'auth.forgotPassword.title': 'パスワードを再設定',
        'auth.forgotPassword.subtitle':
            'メールアドレスを入力すると、パスワード再設定用のリンクをお送りします。',
        'auth.forgotPassword.submit': 'リンクを送信',
        'auth.forgotPassword.error':
            'リンクを送信できませんでした。メールアドレスをご確認ください。',
        'auth.forgotPassword.backToLogin': 'ログインに戻る',
        'auth.forgotPassword.sent.title': 'メールを送信しました',
        'auth.forgotPassword.sent.subtitle': 'パスワード再設定用のリンクを次の宛先に送信しました：',
        'auth.forgotPassword.sent.cta': 'ログインに戻る',

        'auth.2fa.title': '二段階認証',
        'auth.2fa.subtitle': '認証アプリに表示された6桁のコードを入力してください。',
        'auth.2fa.codeLabel': '確認コード',
        'auth.2fa.error': 'コードが正しくありません。もう一度お試しください。',
        'auth.2fa.cancel': 'キャンセル',
        'auth.2fa.verifying': '確認中...',
        'auth.2fa.verify': '確認',

        'auth.verifyEmail.title': 'あと少しです！',
        'auth.verifyEmail.subtitle': '確認メールを次の宛先に送信しました：',
        'auth.verifyEmail.resend': 'メールを再送信',
        'auth.verifyEmail.resending': '送信中...',
        'auth.verifyEmail.resent': 'メールを再送信しました。',
        'auth.verifyEmail.resendError': 'メールを再送信できませんでした。',
        'auth.verifyEmail.backToLogin': 'ログインに戻る',
        'auth.verifyEmail.page.successTitle': 'メールが確認されました',
        'auth.verifyEmail.page.successSubtitle':
            'メールアドレスが確認されました。ログインできます。',
        'auth.verifyEmail.page.errorTitle': '無効なリンク',
        'auth.verifyEmail.page.errorSubtitle':
            'この確認リンクは無効か期限切れです。新しいメールをリクエストしてください。',
        'auth.verifyEmail.page.cta': 'ログインへ',

        'auth.resetPassword.page.title': '新しいパスワードを設定',
        'auth.resetPassword.page.subtitle': '以下に新しいパスワードを入力してください。',
        'auth.resetPassword.field.newPassword': '新しいパスワード',
        'auth.resetPassword.field.confirmPassword': 'パスワードを確認',
        'auth.resetPassword.submit': 'パスワードを再設定',
        'auth.resetPassword.mismatchError': 'パスワードが一致しません。',
        'auth.resetPassword.error': 'パスワードを再設定できませんでした。',
        'auth.resetPassword.success.title': 'パスワードが変更されました',
        'auth.resetPassword.success.subtitle': 'パスワードが変更されました。ログインできます。',
        'auth.resetPassword.success.cta': 'ログインへ',
        'auth.resetPassword.invalidLink.title': '無効なリンク',
        'auth.resetPassword.invalidLink.subtitle':
            'このパスワード再設定リンクは無効か期限切れです。新しいメールをリクエストしてください。',
        'auth.resetPassword.invalidLink.cta': 'ログインへ',

        'auth.nav.signin': 'ログイン',
        'auth.nav.settings': '設定',
        'auth.nav.signout': 'ログアウト',
    },
    'zh-Hans': {
        'auth.signin.title': '欢迎回来',
        'auth.signup.title': '创建账户',
        'auth.signin.subtitle': '登录以继续',
        'auth.signup.subtitle': '注册以开始使用',

        'auth.field.name': '姓名',
        'auth.field.email': '电子邮箱',
        'auth.field.password': '密码',

        'auth.error.signin': '登录失败，请检查你的账号信息。',
        'auth.error.signup': '无法创建账户。',

        'auth.submit.pending': '请稍候...',
        'auth.submit.signin': '登录',
        'auth.submit.signup': '创建账户',

        'auth.toggle.noAccount': '还没有账户？',
        'auth.toggle.signup': '注册',
        'auth.toggle.haveAccount': '已经有账户了？',
        'auth.toggle.signin': '登录',

        'auth.forgotPassword.link': '忘记密码？',
        'auth.forgotPassword.title': '重置密码',
        'auth.forgotPassword.subtitle':
            '输入你的邮箱，我们会发送一个重置密码的链接。',
        'auth.forgotPassword.submit': '发送链接',
        'auth.forgotPassword.error':
            '链接发送失败，请检查你的邮箱地址。',
        'auth.forgotPassword.backToLogin': '返回登录',
        'auth.forgotPassword.sent.title': '邮件已发送',
        'auth.forgotPassword.sent.subtitle': '我们已将密码重置链接发送至：',
        'auth.forgotPassword.sent.cta': '返回登录',

        'auth.2fa.title': '双重身份验证',
        'auth.2fa.subtitle': '请输入身份验证器应用中显示的 6 位数字代码。',
        'auth.2fa.codeLabel': '验证码',
        'auth.2fa.error': '验证码无效，请重试。',
        'auth.2fa.cancel': '取消',
        'auth.2fa.verifying': '验证中...',
        'auth.2fa.verify': '验证',

        'auth.verifyEmail.title': '就快完成了！',
        'auth.verifyEmail.subtitle': '我们已将确认邮件发送至：',
        'auth.verifyEmail.resend': '重新发送邮件',
        'auth.verifyEmail.resending': '发送中...',
        'auth.verifyEmail.resent': '邮件已重新发送。',
        'auth.verifyEmail.resendError': '无法重新发送邮件。',
        'auth.verifyEmail.backToLogin': '返回登录',
        'auth.verifyEmail.page.successTitle': '邮箱已确认',
        'auth.verifyEmail.page.successSubtitle':
            '你的邮箱地址已确认，现在可以登录了。',
        'auth.verifyEmail.page.errorTitle': '链接无效',
        'auth.verifyEmail.page.errorSubtitle':
            '此确认链接无效或已过期，请重新申请一封邮件。',
        'auth.verifyEmail.page.cta': '前往登录',

        'auth.resetPassword.page.title': '设置新密码',
        'auth.resetPassword.page.subtitle': '请在下方输入新密码。',
        'auth.resetPassword.field.newPassword': '新密码',
        'auth.resetPassword.field.confirmPassword': '确认密码',
        'auth.resetPassword.submit': '重置密码',
        'auth.resetPassword.mismatchError': '两次输入的密码不一致。',
        'auth.resetPassword.error': '无法重置密码。',
        'auth.resetPassword.success.title': '密码已修改',
        'auth.resetPassword.success.subtitle': '你的密码已修改，现在可以登录了。',
        'auth.resetPassword.success.cta': '前往登录',
        'auth.resetPassword.invalidLink.title': '链接无效',
        'auth.resetPassword.invalidLink.subtitle':
            '此密码重置链接无效或已过期，请重新申请一封邮件。',
        'auth.resetPassword.invalidLink.cta': '前往登录',

        'auth.nav.signin': '登录',
        'auth.nav.settings': '设置',
        'auth.nav.signout': '退出登录',
    },
};

export default AuthTranslation;
