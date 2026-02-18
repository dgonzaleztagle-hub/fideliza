# 🎯 BLUEPRINT — Sistema de Fidelización Digital

> Documento base del proyecto. Todo lo que se construya debe respetar estas definiciones.
> Fecha: 17 de Febrero 2026

---

## 1. ¿Qué es?

Un **SaaS independiente** que permite a negocios físicos y presenciales (barberías, tiendas, cafeterías, etc.) tener su propia **tarjeta de lealtad digital** en Google Wallet, sin apps, sin tarjetas de cartón, sin plataformas caras.

**No es un módulo de HojaCero**, es un producto aparte con marca propia. Pero está diseñado con APIs abiertas para que HojaCero (u otro partner) pueda integrarlo como addon a sus clientes.

---

## 2. Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| Backend | Node.js |
| Base de Datos | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Billetera Digital | Google Wallet API (solo Android por ahora) |
| Arquitectura | API-first (todo se consume vía endpoints) |

---

## 3. Flujos Principales

### 3.1 Onboarding del Negocio (Tenant)

```
Landing del producto → Negocio se registra → Trial 14 días gratis
→ Onboarding guiado:
   1. Datos del negocio (nombre, rubro, dirección)
   2. Branding (logo, color principal)
   3. Programa de lealtad (cuántos puntos, cuál es el premio)
   4. Ubicación GPS (para geofencing)
   5. Mensaje de geofencing ("¡Estás cerca! Te falta X para tu premio")
→ Se genera QR único del local
→ Acceso a panel en /cliente
```

### 3.2 Registro de Cliente Final (Primera vez)

```
Cliente escanea QR del local → Se abre web
→ Formulario: Nombre + WhatsApp (email opcional)
→ Se registra en el sistema
→ Se genera tarjeta personalizada (logo y colores del negocio)
→ Botón "Agregar a Google Wallet"
→ Primer punto sumado automáticamente ✅
```

### 3.3 Visita Recurrente (Sumar punto)

```
Cliente escanea el mismo QR → Se abre web
→ Ingresa su número de WhatsApp
→ Sistema lo reconoce → Suma 1 punto automáticamente
→ Le muestra su progreso: "Llevas 6/10 puntos 🎉"
```

### 3.4 Canje de Premio

```
Cliente llega al punto máximo (ej: 10/10)
→ Al escanear y poner WhatsApp:
   - Popup de felicitación 🎉
   - Mensaje: "En tu próxima compra exige tu 20% de descuento"
   - Se genera QR ÚNICO de canje (un solo uso)
→ Próxima visita: cliente muestra el QR de canje
→ Dueño lo escanea desde su panel
→ Sistema valida: ✅ Válido / ❌ Ya usado
→ Contador se resetea, empieza nuevo ciclo
```

### 3.5 Geofencing

```
La tarjeta en Google Wallet tiene la ubicación del local
→ Cuando el cliente pasa cerca, Google le muestra notificación
→ El mensaje es configurable por el negocio desde su panel
```

> ⚠️ Nota: Google controla cuándo y cómo muestra las notificaciones. No es en tiempo real perfecto, pero funciona como recordatorio pasivo.

---

## 4. Reglas de Negocio

| Regla | Definición |
|-------|-----------|
| Puntos por día | Máximo 1 punto por cliente por día |
| Programas por negocio | 1 programa activo (escalable a más en el futuro como feature premium) |
| Identificación del cliente | Por número de WhatsApp |
| QR del local | Estático, siempre el mismo |
| QR de premio | Único, de un solo uso, con validación |
| Plataforma billetera | Solo Google Wallet (Apple queda para el futuro) |

---

## 5. Modelo de Negocio

| Concepto | Detalle |
|----------|---------|
| Precio | $15.990/mes (plan único) |
| Trial | 14 días gratis |
| Cobro | Manual inicialmente (transferencia/link de pago) |
| Escalabilidad | Futuros planes premium con más features (múltiples programas, analytics avanzados, etc.) |

---

## 6. Personalización por Negocio

Cada negocio puede configurar desde su panel:

- **Logo** (se muestra en la tarjeta de Google Wallet)
- **Color principal** (se refleja en la tarjeta)
- **Nombre del negocio** (visible en la tarjeta)
- **Cantidad de puntos** para el premio
- **Descripción del premio** (ej: "20% de descuento", "1 corte gratis")
- **Ubicación GPS** del local (para geofencing)
- **Mensaje de geofencing** (lo que ve el cliente al pasar cerca)

---

## 7. Paneles / Interfaces

### 7.1 Landing del Producto
- Página pública que vende el servicio
- Botón de registro para negocios
- Explica el valor: QR, fidelización, Google Wallet, geofencing

### 7.2 Panel del Negocio (`/cliente`)
- Dashboard con estadísticas (clientes activos, puntos dados, premios canjeados)
- Configuración del programa (puntos, premio, mensaje geo)
- Branding (logo, color)
- QR del local (para descargar/imprimir)
- Lista de clientes registrados
- Validación de QR de premio (escanear y marcar como canjeado)

### 7.3 Página del QR (lo que ve el cliente final)
- Formulario de registro (primera vez)
- Campo WhatsApp (visita recurrente)
- Progreso de puntos
- Popup de premio cuando llega a la meta
- Botón "Agregar a Google Wallet"

---

## 8. Estructura de Base de Datos (Conceptual)

```
tenants (negocios)
├── id, nombre, rubro, dirección
├── logo_url, color_primario
├── lat, lng (geofencing)
├── mensaje_geofencing
├── plan, trial_hasta, estado
└── created_at

programs (programas de lealtad)
├── id, tenant_id
├── puntos_meta (ej: 10)
├── descripcion_premio (ej: "1 corte gratis")
├── activo
└── created_at

customers (clientes finales)
├── id, tenant_id
├── nombre, whatsapp, email (opcional)
├── puntos_actuales
├── pass_id (referencia Google Wallet)
└── created_at

stamps (registro de cada punto dado)
├── id, customer_id, tenant_id
├── fecha
└── created_at

rewards (premios generados)
├── id, customer_id, tenant_id
├── qr_code (único)
├── canjeado (sí/no)
├── fecha_generado, fecha_canjeado
└── created_at
```

---

## 9. APIs Necesarias (API-First)

Diseñadas para que las consuma el propio sistema Y futuros integradores (HojaCero, etc.):

| Endpoint | Descripción |
|----------|-------------|
| `POST /api/tenant/register` | Registrar nuevo negocio |
| `GET /api/tenant/:id` | Datos del negocio |
| `PUT /api/tenant/:id` | Actualizar config/branding |
| `POST /api/customer/register` | Registrar cliente final |
| `POST /api/stamp` | Sumar punto (validando 1/día) |
| `GET /api/customer/:whatsapp` | Buscar cliente por WhatsApp |
| `POST /api/reward/generate` | Generar QR de premio |
| `POST /api/reward/redeem` | Canjear premio (validar QR) |
| `POST /api/wallet/pass` | Generar pase de Google Wallet |

---

## 10. Integración con HojaCero

```
FIDELIZACIÓN (independiente)          HOJACERO (partner)
┌─────────────────────────┐         ┌──────────────────────┐
│  Su propia landing       │         │  Tiene sus clientes   │
│  Su propia marca         │         │  Les construye webs   │
│  Crece solo              │◄─ API ─│  Les activa fideli-   │
│  Miles de negocios       │         │  zación como addon    │
└─────────────────────────┘         └──────────────────────┘
```

- Fidelización expone APIs públicas (con autenticación)
- HojaCero las consume para inyectar el sistema en webs de sus clientes
- Si mañana otro partner quiere integrar, las APIs ya están listas
- **Los productos son independientes pero complementarios**

---

## 11. Credenciales Google Wallet

Para que la firma de tarjetas funcione, se necesita configurar en Google Cloud Console:

1. Crear proyecto en Google Cloud
2. Habilitar la **Google Wallet API**
3. Crear una **Service Account** con rol de editor
4. Descargar la clave JSON de la Service Account
5. Registrar el **Issuer ID** en la consola de Google Pay & Wallet
6. Guardar las credenciales de forma segura (variables de entorno, no en código)

> ⚠️ Se requiere una cuenta de Google Wallet Issuer aprobada por Google. Hay un proceso de revisión.

---

## 12. Fases de Desarrollo

### Fase 1 — MVP (Lo que vamos a construir ahora)
- [ ] Estructura de BD en Supabase
- [ ] API de registro de tenant + onboarding
- [ ] API de registro de cliente final
- [ ] API de sumar punto (con validación 1/día)
- [ ] Generación de pase Google Wallet (JWT firmado)
- [ ] Inyección de geofencing en el pase
- [ ] Generación de QR del local
- [ ] Generación de QR de premio (único/canjeable)
- [ ] Panel del negocio (`/cliente`) básico
- [ ] Página del QR (registro + sumar punto + wallet)
- [ ] Landing del producto

### Fase 2 — Crecimiento (Futuro)
- [ ] Múltiples programas por negocio (premium)
- [ ] Analytics avanzados
- [ ] Cobro automatizado (pasarela de pago)
- [ ] Apple Wallet (cuando se justifique la inversión)
- [ ] Widget inyectable para webs
- [ ] API pública documentada para partners
- [ ] Notificaciones WhatsApp automatizadas
