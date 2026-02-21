# Fidelizacion (Vuelve+)

Plataforma SaaS multi-tenant de fidelizacion para comercios fisicos, con soporte de wallet digital, programas de lealtad y automatizaciones.

## Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase configurado

## Variables de entorno

1. Copiar `.env.example` a `.env.local`.
2. Completar todas las claves.
3. En produccion, configurar las mismas variables en Vercel.

Nota importante:
- `FLOW_WEBHOOK_SECRET` es obligatorio en produccion para pagos.
- `AUTOMATION_CRON_SECRET` y `CRON_SECRET` son obligatorios para jobs automatizados.

## Desarrollo local

```bash
npm install
npm run dev
```

## Validaciones tecnicas

```bash
npm run lint
npm run build
npm audit --omit=dev
```

## Checklist de salida a produccion

1. Base de datos:
   - Ejecutar migraciones en orden (`migrations/001` a `migrations/006`).
   - Verificar que el schema en produccion quedo actualizado.
2. Variables:
   - Cargar todas las variables de `.env.example` en Vercel.
   - Confirmar claves reales de Supabase, Flow y Google Wallet.
3. Seguridad:
   - Confirmar `FLOW_WEBHOOK_SECRET`, `AUTOMATION_CRON_SECRET` y `CRON_SECRET`.
   - Confirmar `SUPER_ADMIN_EMAILS`.
4. Smoke test funcional:
   - Registro de negocio.
   - Creacion de cliente.
   - Marcado de visita/beneficio.
   - Canje de premio.
   - Flujo de cobro y webhook de suscripcion.
5. Operacion:
   - Programar llamados a `/api/automation/daily` y `/api/reward/expire` con sus secretos.
   - Validar logs de errores en Vercel despues del primer ciclo.

## Scripts disponibles

- `npm run dev`: servidor local.
- `npm run lint`: validaciones de codigo.
- `npm run build`: compilacion de produccion.
- `npm run start`: levantar build compilado.
