# Guía de Configuración de Firebase para SpinPal Reborn

Sigue estas instrucciones para configurar los servicios de Firebase necesarios para que tu aplicación funcione correctamente.

## 1. Configuración del Proyecto y Credenciales (`.env`)

Si aún no lo has hecho, asegúrate de que tu archivo `.env` en la raíz del proyecto esté completo con las credenciales de tu aplicación de Firebase. Puedes encontrar una guía detallada dentro del mismo archivo `.env`.

## 2. Habilitar Autenticación con Correo Electrónico y Contraseña

Para que el login de administrador funcione, necesitas habilitar este método de inicio de sesión en Firebase.

1.  **Ve a la sección de Autenticación en tu Consola de Firebase.**
    *   **Enlace directo:** `https://console.firebase.google.com/project/{{TU_PROJECT_ID}}/authentication/providers`
    *   (No olvides reemplazar `{{TU_PROJECT_ID}}` con el ID de tu proyecto, que puedes encontrar en el archivo `.env`).

2.  **Habilita el proveedor "Correo electrónico/Contraseña".**
    *   En la pestaña "Sign-in method", busca "Correo electrónico/Contraseña" en la lista de proveedores.
    *   Haz clic en el lápiz para editar, activa el interruptor y guarda los cambios.

3.  **Crea un usuario administrador.**
    *   Ve a la pestaña "Users" (Usuarios) y haz clic en "Add user" (Añadir usuario).
    *   Introduce un correo electrónico y una contraseña. Usarás estas credenciales para acceder al panel de administrador en `/login`.

## 3. Crear y Configurar la Base de Datos Firestore

Firestore almacenará todos los datos de tus juegos y clientes.

1.  **Ve a la sección de Cloud Firestore.**
    *   **Enlace directo:** `https://console.firebase.google.com/project/{{TU_PROJECT_ID}}/firestore`
    *   (Reemplaza `{{TU_PROJECT_ID}}` con el ID de tu proyecto).

2.  **Crea la base de datos.**
    *   Haz clic en "Crear base de datos".
    *   Selecciona **"Iniciar en modo de prueba"**. Esto establece reglas de seguridad que permiten leer y escribir temporalmente. Es ideal para el desarrollo inicial.
    *   Elige una ubicación para tus servidores (la más cercana a tus usuarios es una buena opción).
    *   Haz clic en "Habilitar".

3.  **Actualiza las reglas de seguridad.**
    *   Una vez creada la base de datos, ve a la pestaña **"Reglas"**.
    *   Copia todo el contenido del archivo `firestore.rules` que se encuentra en tu proyecto.
    *   Pega el contenido en el editor de reglas de la consola de Firebase, reemplazando lo que haya.
    *   Haz clic en **"Publicar"**.

## 4. Habilitar la API de Cloud Firestore (Si es necesario)

Si en la página de "Conexiones" ves un error de `PERMISSION_DENIED` y un botón para habilitar la API, significa que este servicio no está activo en tu proyecto de Google Cloud.

1.  Haz clic en el botón "Habilitar API de Firestore" en la página de "Conexiones" de tu aplicación.
2.  Serás redirigido a la consola de Google Cloud. Haz clic en el botón azul que dice **"HABILITAR"**.
3.  Espera unos minutos a que los cambios se apliquen y vuelve a comprobar la página de "Conexiones".

¡Con estos pasos, tu proyecto de SpinPal Reborn estará listo para funcionar!
