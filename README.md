# SpinPal Reborn

Aplicación de ruleta de premios interactiva. Este repositorio está conectado a Firebase App Hosting para despliegues automáticos.

## Supabase Storage (assets de ruleta)

- Crear bucket `spinpal-assets` en tu proyecto Supabase y dejarlo público (lectura).
- Completar variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- Endpoint para subir: `POST /api/upload-url` con JSON `{ fileName, contentType, folder? }` → devuelve `signedUrl` y `publicUrl`.
- Subida: `fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })` y guarda `publicUrl` en Firestore (backgroundImage, borderImage, etc.).
