# Publicar Lukas: Vercel + Supabase + notificaciones push

Orden recomendado: **1 → 2** para tener la app en tu iPhone con notificaciones de prueba hoy. **3** prepara Supabase para la fase 2 (login por invitación, datos compartidos y avisos automáticos de cada tarea).

---

## 1. Llaves (en tu computadora, una sola vez)

```bash
npx web-push generate-vapid-keys   # llaves para notificaciones push
openssl rand -hex 32               # secreto para el cron de avisos
```

Guarda los tres valores; van como variables de entorno en Vercel:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | "Public Key" de web-push |
| `VAPID_PRIVATE_KEY` | "Private Key" de web-push (secreta) |
| `VAPID_SUBJECT` | `mailto:` + tu correo (lo usan Apple/Google para contactarte si algo falla) |
| `CRON_SECRET` | el valor de `openssl rand` (secreto) |

> Las llaves VAPID no se cambian después: si las cambias, cada dispositivo tiene que volver a activar las notificaciones.

## 2. Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New… → Project** → importa `andres1298/reminders` (si no aparece, **Adjust GitHub App Permissions** y dale acceso al repo).
2. Framework: **Next.js** (lo detecta solo). No cambies los comandos de build.
3. **Environment Variables**: agrega las cuatro de la sección 1 (marca Production y Preview).
4. **Rama de producción.** El código está en `claude/lukas-design-system` y `main` todavía no lo tiene. Elige una:
   - **Recomendado:** fusiona el PR de `claude/lukas-design-system` a `main` y despliega `main`.
   - **Rápido:** después de crear el proyecto, en **Settings → Environments → Production → Branch Tracking** cambia la rama a `claude/lukas-design-system`.
5. **Deploy.** Te queda una URL tipo `https://reminders-xxxx.vercel.app`. Si quieres `lukas.vercel.app` (si está libre), cambia el nombre del proyecto en **Settings → General**.
6. En el **iPhone (iOS 16.4 o más)**:
   1. Abre la URL en **Safari** → **Compartir** → **Agregar a inicio**.
   2. Abre Lukas **desde el ícono** (las notificaciones solo funcionan en la app instalada).
   3. **Ajustes → Notificaciones → Activar notificaciones** → permite.
   4. **Enviar una de prueba**: debe llegar "🐾 Lukas · Las notificaciones funcionan".

> Las variables `NEXT_PUBLIC_*` se incrustan al compilar: si cambias alguna, haz **Redeploy**.

## 3. Supabase

### 3.1 Crear el proyecto
1. [supabase.com](https://supabase.com) → **New project** → nombre `lukas`, región **East US (North Virginia)** (la más cercana a Costa Rica y la misma zona que Vercel por defecto), plan **Free**.
2. Guarda la contraseña de la base de datos en tu gestor de contraseñas.

### 3.2 Crear las tablas
Opción A, desde el navegador: **SQL Editor → New query**, pega y ejecuta **en este orden**:
1. `supabase/migrations/20261011000000_init.sql`
2. `supabase/migrations/20261012000000_push.sql`
3. `supabase/migrations/20261013000000_accounts.sql` (perfil automático al crear un usuario y "Deshacer" de borrados)
4. `supabase/migrations/20261014000000_super_admin.sql` (panel de super admin; el super admin deja de poder leer tareas de hogares ajenos)
5. `supabase/migrations/20261015000000_groceries.sql` (lista de compras: pestaña Súper). Mientras no se corra, la app funciona igual y Súper aparece vacía.

Opción B, con la CLI:
```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>   # el ref está en la URL del dashboard
npx supabase db push
```

### 3.3 Llaves de la API → Vercel
**Project Settings → API Keys / Data API**:

| Variable en Vercel | Dónde está |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` / *publishable* |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` / *secret*: **nunca** con prefijo `NEXT_PUBLIC_` ni en el navegador |

Después de agregarlas: **Redeploy** en Vercel.

### 3.4 Autenticación
1. **Authentication → Sign In / Providers → Email**: activado. **Desactiva "Allow new users to sign up"**: el registro es solo por invitación y lo hace el servidor con la service key (SPEC §4.1).
2. **Authentication → URL Configuration**:
   - Site URL: tu URL de Vercel.
   - Redirect URLs: `https://<tu-app>.vercel.app/**` y `http://localhost:3000/**`.
3. **Correos (SMTP)**: el SMTP de Supabase solo manda a miembros del equipo del proyecto, así que no sirve para invitar (SPEC §9.1). Para usar Gmail:
   1. En tu cuenta de Google activa la verificación en dos pasos → **Contraseñas de aplicaciones** → crea una para "Lukas".
   2. **Authentication → Emails → SMTP Settings**: host `smtp.gmail.com`, puerto `465`, usuario = tu Gmail, contraseña = la de aplicación, remitente "Lukas".
4. **Authentication → Emails → Templates → Reset Password**: cambia el enlace por
   `{{ .SiteURL }}/nueva-contrasena?token_hash={{ .TokenHash }}&type=recovery`.
   Así el enlace funciona aunque se abra en otro navegador que el que lo pidió (en iPhone, la app instalada y Safari no comparten cookies).

### 3.5 Avisos automáticos cada minuto (pg_cron → Vercel)
El cron de Vercel en el plan gratuito corre solo una vez al día, así que el reloj lo pone Supabase:

1. **Database → Extensions**: activa **pg_cron** y **pg_net**.
2. En el **SQL Editor** (cambia los dos valores):

```sql
select vault.create_secret('<CRON_SECRET>', 'lukas_cron_secret');
select vault.create_secret('https://<tu-app>.vercel.app', 'lukas_app_url');

select cron.schedule('lukas-avisos', '* * * * *', $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'lukas_app_url')
           || '/api/cron/notifications',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lukas_cron_secret')
    ),
    timeout_milliseconds := 10000
  );
$$);
```

3. Para comprobarlo, a los dos minutos:
```sql
select status_code, content from net._http_response order by created desc limit 3;
-- esperado: 200 y {"sent":0} mientras no haya tareas en Supabase
```

Ese llamado cada minuto también cuenta como actividad, lo que evita que Supabase pause el proyecto gratuito por inactividad (SPEC §14).

### 3.6 Tu cuenta y super admin
El registro es solo por invitación, así que la primera cuenta se crea a mano:

1. **Authentication → Users → Add user → Create new user**: tu correo y una contraseña, con **Auto Confirm User** marcado. El perfil se crea solo.
2. Márcate como super admin:
```sql
update public.profiles set is_super_admin = true
where id = (select id from auth.users where email = '<tu correo>');
```
3. Abre la app, entra con ese correo y contraseña, y crea tu hogar. Desde **Ajustes → Hogar → Invitar a alguien** compartes un enlace con quienes viven contigo: con él crean su cuenta y entran directo a tu hogar (no se manda ningún correo).
4. En el iPhone, la app instalada guarda su sesión aparte de Safari: entra una vez desde el ícono y activa las notificaciones en **Ajustes**.
5. Como super admin, en **Ajustes** aparece **Panel de administración**: crear hogares para otras personas (te da un enlace para que entren como admin), quitar personas, cambiar roles y desactivar hogares. Las tareas de esos hogares no se ven desde el panel.

---

## Qué funciona en cada etapa

| Etapa | Notificaciones |
|---|---|
| Hecho 1 + 2 | Activar en el iPhone y recibir la de **prueba**. Las tareas siguen guardadas en el teléfono. |
| Hecho 3 | El cron corre cada minuto y responde `{"sent":0}`. |
| Hecho 3.6 (fase 2a) | Login por invitación, tareas compartidas en Supabase y la suscripción de cada dispositivo guardada en tu cuenta: **llega un aviso a la hora de cada tarea** al responsable (o a todo el hogar si es "Cualquiera"). |
