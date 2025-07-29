# SpinPal Reborn - Instrucciones de Despliegue

Este documento proporciona una guía completa para configurar y desplegar la aplicación SpinPal Reborn en Firebase.

## 1. Requisitos Previos

- Una cuenta de Google.
- Una cuenta de GitHub.

## 2. Configuración de Entorno

La aplicación utiliza variables de entorno para gestionar las claves de API y la configuración de servicios externos. Deberás configurar estas variables directamente en Firebase App Hosting.

### 2.1. Configuración de Firebase

La aplicación depende de Firebase para la autenticación de usuarios y la base de datos (Firestore).

**Paso A: Crear Proyecto en Firebase**
1.  Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2.  Haz clic en "Añadir proyecto" y sigue los pasos para crear un nuevo proyecto.

**Paso B: Habilitar App Hosting**
1. Dentro de tu proyecto, en el menú de la izquierda, selecciona **App Hosting**.
2. Sigue el asistente para crear un nuevo "backend". Se te pedirá que conectes un repositorio de GitHub. Asegúrate de que el repositorio esté vacío o contenga la versión actualizada de esta aplicación.

**Paso C: Obtener Credenciales y Configurar Variables de Entorno**
1.  Dentro de tu proyecto de Firebase, ve a "Configuración del proyecto" (el icono del engranaje).
2.  En la pestaña "General", baja hasta "Tus aplicaciones" y haz clic en el icono de web (`</>`).
3.  Dale un apodo a tu aplicación y registra la aplicación.
4.  Después de registrarla, Firebase te mostrará un objeto de configuración **"CDN"**.
5.  Ve a la consola de **App Hosting**, selecciona tu backend y ve a la pestaña de "Settings" o "Configuración". Aquí podrás añadir las siguientes variables de entorno usando los valores que acabas de obtener:

    ```env
    # Credenciales de Firebase
    NEXT_PUBLIC_FIREBASE_API_KEY="TU_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="TU_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="TU_APP_ID"
    ```

**Paso D: Configurar Servicios de Firebase**
1.  **Authentication**: En la consola de Firebase, ve a la sección "Authentication".
    -   Ve a la pestaña "Sign-in method".
    -   Habilita los proveedores **"Correo electrónico/Contraseña"** y **"Google"**.
    -   Crea tu usuario administrador con el correo `grupomanso@gmail.com`.
2.  **Firestore**: En la consola de Firebase, ve a la sección "Firestore Database".
    -   Crea una base de datos en **modo de prueba**.
3.  **Storage**: En la consola de Firebase, ve a la sección "Storage" y habilítalo.

### 2.2. Configuración de Gemini y Resend

1.  Obtén tus claves de API de [Google AI Studio](https://aistudio.google.com/app/apikey) y [Resend](https://resend.com/).
2.  Añádelas como variables de entorno en la configuración de tu backend de App Hosting:
    ```env
    # Clave de API de Gemini
    GEMINI_API_KEY="TU_CLAVE_DE_GEMINI_API"
    # Clave de API de Resend
    RESEND_API_KEY="re_TU_CLAVE_DE_RESEND"
    ```

## 3. Reglas de Seguridad

Copia y pega estas reglas en las secciones correspondientes de la consola de Firebase ("Firestore Database" -> "Reglas" y "Storage" -> "Reglas").

### 3.1. Reglas de Firestore

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSuperAdmin() {
      return request.auth != null && request.auth.token.email == 'grupomanso@gmail.com';
    }

    function isGameClient(gameId) {
      return request.auth != null && request.auth.token.email == get(/databases/$(database)/documents/games/$(gameId)).data.clientEmail;
    }

    match /games/{gameId} {
      allow read: if true;
      allow create, delete: if isSuperAdmin();
      allow update: if
            isSuperAdmin() ||
            (isGameClient(gameId) && request.resource.data.clientEmail == resource.data.clientEmail) ||
            (request.auth == null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['plays', 'prizesAwarded', 'spinRequest', 'lastResult']));
    }

    match /games/{gameId}/customers/{customerId} {
      allow read: if isSuperAdmin() || isGameClient(gameId) || request.auth == null;
      allow create: if true;
      allow delete: if isSuperAdmin() || isGameClient(gameId);
      allow update: if isSuperAdmin() || isGameClient(gameId) ||
                    (request.auth == null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hasPlayed', 'prizeWonName', 'prizeWonAt']));
    }

    match /outbound_emails/{emailId} {
      allow create: if true;
      allow read, delete: if isSuperAdmin();
    }

    match /health_check/{doc} {
      allow read, write: if true;
    }
  }
}
```

### 3.2. Reglas de Storage

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Permite la lectura pública de cualquier archivo.
    match /{allPaths=**} {
      allow read;
    }

    // Solo permite la escritura a usuarios autenticados.
    match /{allPaths=**} {
      allow write: if request.auth != null;
    }
  }
}
```

## 4. Despliegue

Una vez que tu repositorio de GitHub esté conectado a Firebase App Hosting, cualquier cambio (un "commit") que se haga a la rama principal (`main` o `master`) disparará un nuevo despliegue automáticamente. También puedes iniciar despliegues manualmente desde la consola de App Hosting.
