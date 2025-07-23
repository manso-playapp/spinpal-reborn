
# SpinPal Reborn - Instrucciones de Despliegue

Este documento proporciona una guía completa para instalar, configurar y desplegar la aplicación SpinPal Reborn en tu propio servidor o entorno de desarrollo.

## 1. Requisitos Previos

Antes de empezar, asegúrate de tener instalado lo siguiente en tu sistema:
- **Node.js**: Versión 18.x o superior.
- **npm**: Generalmente se instala junto con Node.js.

## 2. Instalación

Sigue estos pasos para poner en marcha el proyecto:

1.  **Descarga y descomprime el código** en una carpeta de tu elección.
2.  Abre una terminal en la carpeta del proyecto.
3.  Instala todas las dependencias necesarias ejecutando el siguiente comando:
    ```bash
    npm install
    ```

## 3. Configuración de Entorno

La aplicación utiliza variables de entorno para gestionar las claves de API y la configuración de servicios externos.

1.  En la raíz del proyecto, crea un nuevo archivo llamado `.env.local`.
2.  Copia el contenido del archivo `.env` (que está vacío) a tu nuevo archivo `.env.local`.
3.  Rellena las variables en `.env.local` como se describe en las siguientes secciones.

### 3.1. Configuración de Firebase

La aplicación depende de Firebase para la autenticación de usuarios y la base de datos (Firestore).

**Paso A: Crear Proyecto en Firebase**
1.  Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2.  Haz clic en "Añadir proyecto" y sigue los pasos para crear un nuevo proyecto.

**Paso B: Crear una Aplicación Web**
1.  Dentro de tu proyecto de Firebase, ve a "Configuración del proyecto" (el icono del engranaje).
2.  En la pestaña "General", baja hasta "Tus aplicaciones" y haz clic en el icono de web (`</>`).
3.  Dale un apodo a tu aplicación y registra la aplicación.

**Paso C: Obtener Credenciales**
1.  Después de registrar la aplicación, Firebase te mostrará un objeto de configuración. Selecciona la opción **"CDN"**.
2.  Copia los valores de este objeto y pégalos en tu archivo `.env.local`:

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
    -   Habilita los proveedores **"Correo electrónico/Contraseña"** (para el administrador) y **"Google"** (para los clientes).
    -   Ve a la pestaña "Users" y crea tu usuario administrador con el correo `grupomanso@gmail.com` para tener acceso a todas las funciones.
2.  **Firestore**: En la consola de Firebase, ve a la sección "Firestore Database".
    -   Haz clic en "Crear base de datos".
    -   Inicia en **modo de prueba** (podrás cambiarlo más tarde).
    -   Elige una ubicación para tus servidores y haz clic en "Habilitar".

### 3.2. Configuración de Gemini API (para IA)

La aplicación utiliza Genkit para conectarse a la API de Google Gemini.
1.  Visita [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Crea una nueva clave de API.
3.  Añade la clave a tu archivo `.env.local`:
    ```env
    # Clave de API de Gemini
    GEMINI_API_KEY="TU_CLAVE_DE_GEMINI_API"
    ```

### 3.3. Configuración de Resend (para Emails)

La aplicación utiliza Resend para enviar correos de notificación de premios.
1.  Crea una cuenta en [Resend](https://resend.com/).
2.  Ve a la sección "API Keys" y crea una nueva clave.
3.  Añade la clave a tu archivo `.env.local`:
    ```env
    # Clave de API de Resend
    RESEND_API_KEY="re_TU_CLAVE_DE_RESEND"
    ```
4.  **Dominio de Envío**: Para asegurar que los correos lleguen a la bandeja de entrada, debes verificar tu dominio en Resend y configurar DKIM y DMARC. Sigue las instrucciones de la sección "Domains" en Resend.
5.  **Actualiza el Remitente**: Una vez verificado tu dominio, cambia la dirección de correo del remitente en el archivo `src/ai/flows/prize-notification-flow.ts` (busca la variable `fromAddress`) a una dirección de tu propio dominio (ej: `noreply@tuempresa.com`).

## 4. Reglas de Seguridad de Firestore

Estas reglas son cruciales para proteger tu base de datos.
1.  En la consola de Firebase, ve a "Firestore Database" y luego a la pestaña "Reglas".
2.  Copia y pega el siguiente contenido, reemplazando las reglas existentes:

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
3.  Haz clic en **"Publicar"**.

## 5. Ejecutar la Aplicación

### Desarrollo
Para ejecutar la aplicación en modo de desarrollo en tu máquina local:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:9002`.

### Producción
Para compilar la aplicación para producción y luego ejecutarla:
1.  **Compilar el proyecto:**
    ```bash
    npm run build
    ```
2.  **Iniciar el servidor de producción:**
    ```bash
    npm run start
    ```
La aplicación se ejecutará optimizada para producción. Deberás configurar un proxy inverso (como Nginx o Apache) si deseas servirla en el puerto 80 (HTTP) o 443 (HTTPS).
