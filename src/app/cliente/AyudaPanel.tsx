'use client'

import { useState } from 'react'

interface HelpSection {
    id: string
    icon: string
    title: string
    subtitle: string
    articles: HelpArticle[]
}

interface HelpArticle {
    question: string
    answer: string
}

const helpData: HelpSection[] = [
    {
        id: 'bienvenida',
        icon: '👋',
        title: '¿Qué es Vuelve+?',
        subtitle: 'Conoce la plataforma y sus beneficios',
        articles: [
            {
                question: '¿Qué es Vuelve+ y para qué sirve?',
                answer: `<strong>Vuelve+</strong> es una plataforma de fidelización digital que te permite crear un programa de lealtad para tu negocio sin necesidad de conocimientos técnicos.

<em>En palabras simples:</em> Reemplaza la clásica "tarjeta de sellos" de cartón por un sistema digital moderno que funciona desde cualquier celular.

<strong>¿Qué puedes lograr?</strong>
• <strong>Más clientes que vuelven:</strong> Un programa de puntos/sellos incentiva a tus clientes a regresar
• <strong>Conocer a tus clientes:</strong> Sabrás quiénes son tus clientes más fieles, cuántas veces vienen y cuándo
• <strong>Marketing directo:</strong> Envía ofertas y promociones a tus clientes por WhatsApp
• <strong>Cero papel:</strong> Todo digital, sin tarjetas físicas que se pierdan
• <strong>Google Wallet:</strong> Tus clientes pueden guardar su tarjeta de lealtad en la billetera digital de su celular`
            },
            {
                question: '¿Cómo funciona el proceso completo?',
                answer: `El flujo completo de Vuelve+ es así:

<strong>1. 📱 Cliente visita tu negocio</strong>
Tu cliente escanea el código QR que pones en tu local (mostrador, mesa, puerta)

<strong>2. ✍️ Se registra (solo la primera vez)</strong>
Ingresa su nombre y WhatsApp. Solo toma 10 segundos.

<strong>3. ⭐ Acumula puntos</strong>
Cada vez que compra, ingresa su WhatsApp en la página QR y recibe un punto/sello

<strong>4. 🎁 Gana premios</strong>
Cuando llega a la meta (ej: 10 sellos), gana un premio automáticamente — puede ser un descuento, un producto gratis, un regalo, etc.

<strong>5. 🎫 Canjea su premio</strong>
El sistema genera un código QR único. El cliente lo muestra, tú lo canjeas desde tu panel, y listo.

<em>¡Todo es automático! No tienes que hacer cálculos ni llevar registros a mano.</em>`
            },
            {
                question: '¿Cuánto cuesta Vuelve+?',
                answer: `Vuelve+ tiene un <strong>periodo de prueba gratuito de 14 días</strong> donde puedes probar todas las funciones sin restricciones.

Después del trial, puedes activar uno de los planes disponibles (Pyme, Pro o Full) directamente desde tu panel con pago por Flow.

<em>Tip: Aprovecha el trial para configurar todo, invitar a tus primeros clientes y ver los resultados antes de decidir.</em>`
            }
        ]
    },
    {
        id: 'dashboard',
        icon: '📊',
        title: 'Dashboard',
        subtitle: 'Tu panel de control principal',
        articles: [
            {
                question: '¿Qué veo en el Dashboard?',
                answer: `El Dashboard es tu pantalla principal donde ves un resumen de todo lo que pasa en tu programa de lealtad:

<strong>📊 Tarjetas de resumen:</strong>
• <strong>Total Clientes:</strong> Cuántas personas se han registrado en tu programa hasta hoy
• <strong>Puntos Dados:</strong> La cantidad total de puntos/sellos que has entregado
• <strong>Premios Canjeados:</strong> Cuántos premios han sido reclamados por tus clientes
• <strong>Visitas Hoy:</strong> Cuántas personas han ingresado puntos el día de hoy

<strong>¿Para qué sirve?</strong>
Te da una foto rápida de la salud de tu programa. Si ves que las visitas de hoy son bajas, quizás es momento de enviar una notificación a tus clientes 😉`
            },
            {
                question: '¿Cada cuánto se actualizan los números?',
                answer: `Los datos se actualizan <strong>en tiempo real</strong> cada vez que cargas la página o presionas "🔄 Refrescar datos" en el menú lateral.

<em>Tip: Si acabas de registrar un punto y no lo ves reflejado, presiona el botón refrescar.</em>`
            }
        ]
    },
    {
        id: 'clientes',
        icon: '👥',
        title: 'Clientes',
        subtitle: 'Gestiona tu base de clientes',
        articles: [
            {
                question: '¿Cómo veo la información de mis clientes?',
                answer: `En la pestaña <strong>"Clientes"</strong> encontrarás la lista completa de personas registradas en tu programa.

<strong>Para cada cliente puedes ver:</strong>
• <strong>Nombre:</strong> El nombre que ingresó al registrarse
• <strong>WhatsApp:</strong> Su número de contacto
• <strong>Puntos actuales:</strong> Cuántos puntos tiene acumulados ahora
• <strong>Puntos históricos:</strong> Total de puntos que ha ganado desde que se registró
• <strong>Premios canjeados:</strong> Cuántas veces ha reclamado un premio
• <strong>Fecha de registro:</strong> Cuándo se unió a tu programa`
            },
            {
                question: '¿Cómo busco un cliente específico?',
                answer: `Usa la <strong>barra de búsqueda</strong> en la parte superior de la lista de clientes.

Puedes buscar por:
• <strong>Nombre:</strong> Escribe parte del nombre (ej: "María")
• <strong>WhatsApp:</strong> Busca por número (ej: "9876")

La búsqueda es instantánea — los resultados se filtran mientras escribes.`
            },
            {
                question: '¿Quiénes son mis mejores clientes?',
                answer: `Revisa la pestaña <strong>"Analytics"</strong> — ahí tienes una sección de <strong>"Top Clientes"</strong> que muestra a tus clientes más fieles ordenados por cantidad de puntos.

<em>Tip: ¡Estos son los clientes que deberías mimar! Considera enviarles una notificación personalizada o un beneficio especial.</em>`
            }
        ]
    },
    {
        id: 'qr',
        icon: '🎫',
        title: 'QR y Canje de Premios',
        subtitle: 'Tu código QR y cómo canjear premios',
        articles: [
            {
                question: '¿Dónde está mi código QR?',
                answer: `En la pestaña <strong>"QR y Canje"</strong> encontrarás tu código QR único.

<strong>¿Qué hacer con él?</strong>
• <strong>Imprímelo</strong> y ponlo en tu mostrador, caja, o mesas
• <strong>Compártelo</strong> por WhatsApp o redes sociales
• <strong>Agrégalo</strong> a tu menú, tarjetas de presentación, o flyers

Cuando un cliente escanea ese QR con la cámara de su celular, llega directamente a tu página de fidelización donde puede registrarse o sumar puntos.`
            },
            {
                question: '¿Cómo funciona el canje de premios?',
                answer: `Cuando un cliente llega a la meta de puntos (ej: 10 sellos), el sistema genera automáticamente un <strong>código QR de premio</strong>.

<strong>Para canjear un premio:</strong>
1. El cliente te muestra su código de premio (lo recibe en pantalla o por WhatsApp)
2. Tú vas a la pestaña <strong>"QR y Canje"</strong>
3. Puedes <strong>escanear</strong> el QR del cliente con tu cámara, o <strong>escribir</strong> el código manualmente
4. Presionas <strong>"Canjear"</strong>
5. ¡Listo! El premio queda marcado como canjeado

<em>Importante: Cada código de premio solo se puede usar UNA vez. Una vez canjeado, no se puede volver a usar.</em>`
            },
            {
                question: '¿Puedo escanear con la cámara directamente?',
                answer: `¡Sí! En la sección de canje verás un botón <strong>"📷 Escanear QR"</strong>.

Al presionarlo, se abrirá la cámara de tu dispositivo. Apunta al código QR del premio del cliente y el sistema lo detectará automáticamente.

<em>Nota: Tu navegador te pedirá permiso para usar la cámara la primera vez. Asegúrate de aceptar.</em>`
            },
            {
                question: '¿Qué pasa si un cliente pierde su código de premio?',
                answer: `No hay problema. El premio queda registrado en el sistema.

<strong>¿Cómo recuperarlo?</strong>
El cliente puede ir a <strong>/mi-tarjeta</strong> (desde tu mismo sitio), ingresar su WhatsApp, y ver todos sus premios pendientes con sus códigos QR.

<em>Otra opción: Tú puedes buscar al cliente en tu lista de clientes y verificar sus premios pendientes.</em>`
            }
        ]
    },
    {
        id: 'tipos-programa',
        icon: '🎯',
        title: 'Tipos de Programa',
        subtitle: 'Sellos, cashback, multipase y más',
        articles: [
            {
                question: '¿Qué tipos de programa puedo crear?',
                answer: `Vuelve+ soporta <strong>8 tipos de programa</strong> diferentes:

<strong>⭐ Sellos (el clásico)</strong>
El más popular. El cliente acumula sellos con cada visita. Al llegar a la meta, gana un premio.
<em>Ejemplo: "Compra 10 cafés y el 11° es gratis"</em>

<strong>💰 Cashback</strong>
El cliente acumula un porcentaje de lo que gasta como saldo a favor.
<em>Ejemplo: "Gana un 5% de cada compra para usar después"</em>

<strong>🎫 Multipase</strong>
El cliente compra un pase con X cantidad de usos.
<em>Ejemplo: "Pase de 10 clases de yoga"</em>

<strong>📊 Descuento por Niveles</strong>
El descuento sube a medida que el cliente acumula visitas.
<em>Ejemplo: "5 visitas = 5% off, 10 visitas = 10% off, 20 visitas = 20% off"</em>

<strong>👑 Membresía VIP</strong>
Acceso a beneficios exclusivos por un tiempo determinado.
<em>Ejemplo: "Membresía Gold con 15% de descuento permanente"</em>

<strong>🤝 Afiliación</strong>
Registro como socio/afiliado con beneficios especiales.
<em>Ejemplo: "Club de socios con acceso a preventas"</em>

<strong>🎟️ Cupón</strong>
Descuento puntual que se entrega y canjea una sola vez.
<em>Ejemplo: "20% de descuento en tu próxima compra"</em>

<strong>🎁 Tarjeta Regalo</strong>
Saldo cargado que el cliente puede gastar.
<em>Ejemplo: "Gift card de $20.000"</em>`
            },
            {
                question: '¿Cómo activo la Membresía VIP?',
                answer: `Activar el modo VIP es muy sencillo y te permite dar un trato preferencial a tus clientes más leales.

<strong>Pasos para activar:</strong>
1. Ve a la pestaña <strong>"Configuración"</strong>
2. Presiona <strong>"✏️ Editar"</strong>
3. En <strong>"Motor de programa"</strong>, selecciona <strong>"👑 Membresía VIP"</strong>
4. Guarda los cambios para activar el modo membresía

<strong>¿Qué cambia al ser VIP?</strong>
• Los clientes se sienten parte de un club exclusivo
• Puedes definir beneficios permanentes (como descuentos fijos)
• Las tarjetas en Google Wallet muestran el estatus VIP del cliente

<em>Tip: Puedes cambiar entre motores de programa cuando quieras desde Configuración.</em>`
            },
            {
                question: '¿Puedo cambiar el tipo de programa después?',
                answer: `Sí, puedes cambiar el tipo de programa desde la pestaña <strong>"Configuración"</strong>.

<strong>⚠️ Importante:</strong> Si cambias el tipo de programa cuando ya tienes clientes activos, ten en cuenta que:
• Los puntos existentes se mantienen
• La dinámica del programa cambiará para todos los clientes
• Es recomendable notificar a tus clientes sobre el cambio

<em>Tip: Lo ideal es definir bien tu tipo de programa al inicio. Si tienes dudas, empieza con "Sellos" que es el más simple y efectivo.</em>`
            }
        ]
    },
    {
        id: 'analytics',
        icon: '📈',
        title: 'Analytics',
        subtitle: 'Entiende tus métricas y toma decisiones',
        articles: [
            {
                question: '¿Qué métricas me muestra Analytics?',
                answer: `La pestaña Analytics te da información detallada para entender cómo va tu programa:

<strong>📊 Resumen general:</strong>
• <strong>Clientes nuevos esta semana:</strong> Cuántas personas se unieron en los últimos 7 días
• <strong>Premios pendientes:</strong> Cuántos premios están listos para canjear pero no han sido reclamados
• <strong>Crecimiento mensual:</strong> El porcentaje de crecimiento de clientes respecto al mes anterior

<strong>📈 Gráfico de visitas:</strong>
Un gráfico de los últimos 14 días mostrando cuántas visitas (stamps) tuviste cada día. Esto te ayuda a identificar:
• <strong>Días más activos:</strong> ¿Cuándo viene más gente?
• <strong>Tendencias:</strong> ¿Está subiendo o bajando la actividad?

<strong>🏆 Top clientes:</strong>
Los clientes con más puntos acumulados — tus clientes más fieles.`
            },
            {
                question: '¿Cómo uso estas métricas para vender más?',
                answer: `<strong>Estrategia 1: Apunta a los días flojos</strong>
Si ves que los martes son tu día más bajo, envía una notificación el lunes: "¡Mañana sellos dobles! 🎉"

<strong>Estrategia 2: Reactiva clientes inactivos</strong>
Si el crecimiento mensual baja, es momento de enviar una notificación masiva recordando tu programa

<strong>Estrategia 3: Premia a tus top clientes</strong>
Identifica a tus top 5 clientes y envíales un agradecimiento especial o beneficio exclusivo

<strong>Estrategia 4: Monitorea premios pendientes</strong>
Si hay muchos premios sin canjear, recuerda a tus clientes que tienen premios esperándoles

<em>¡Los datos son poder! Revisa Analytics al menos una vez por semana.</em>`
            }
        ]
    },
    {
        id: 'notificaciones',
        icon: '📢',
        title: 'Notificaciones',
        subtitle: 'Comunícate con tus clientes',
        articles: [
            {
                question: '¿Cómo envío una notificación a mis clientes?',
                answer: `Ve a la pestaña <strong>"Notificaciones"</strong> y sigue estos pasos:

<strong>1. Escribe un título</strong>
Algo corto y llamativo. Ej: "¡Oferta especial hoy!" o "¡Tienes un premio esperándote!"

<strong>2. Escribe el mensaje</strong>
El contenido de la notificación. Ej: "Hoy todos los cafés con 20% de descuento. ¡Te esperamos! ☕"

<strong>3. Elige el segmento</strong>
• <strong>Todos:</strong> Se envía a todos tus clientes registrados
• <strong>Activos:</strong> Solo a los que han venido en los últimos 30 días
• <strong>Inactivos:</strong> A los que no han venido hace más de 30 días
• <strong>Con premio:</strong> Solo a los que tienen un premio pendiente por canjear

<strong>4. Presiona "Enviar"</strong>
¡Y listo! La notificación se envía automáticamente.`
            },
            {
                question: '¿Por dónde reciben las notificaciones mis clientes?',
                answer: `Las notificaciones se envían como <strong>mensajes push</strong> y quedan registradas en el historial.

Si tus clientes tienen la <strong>tarjeta en Google Wallet</strong>, recibirán notificaciones directamente en su celular cuando estén cerca de tu negocio (geofencing).

<em>Tip: No abuses de las notificaciones. 1-2 por semana es lo ideal. Si mandas muchas, los clientes se cansan.</em>`
            },
            {
                question: '¿Puedo ver el historial de notificaciones enviadas?',
                answer: `Sí, debajo del formulario de envío verás el <strong>historial completo</strong> de todas las notificaciones que has enviado.

Para cada una puedes ver:
• La fecha y hora de envío
• El título y mensaje
• A qué segmento se envió`
            }
        ]
    },
    {
        id: 'configuracion',
        icon: '⚙️',
        title: 'Configuración',
        subtitle: 'Personaliza tu programa',
        articles: [
            {
                question: '¿Qué puedo configurar?',
                answer: `En la pestaña "Configuración" puedes ajustar todo tu programa:

<strong>🏪 Datos del negocio:</strong>
• <strong>Nombre:</strong> El nombre de tu negocio (aparece en QR y en la tarjeta del cliente)
• <strong>Rubro:</strong> A qué se dedica tu negocio (ej: Cafetería, Peluquería, Gimnasio)
• <strong>Dirección:</strong> La dirección física de tu local
• <strong>Color principal:</strong> El color de tu marca — se usa en toda la interfaz del cliente

<strong>🎯 Programa de lealtad:</strong>
• <strong>Puntos meta:</strong> Cuántos puntos necesita un cliente para ganar el premio (ej: 10)
• <strong>Descripción del premio:</strong> Qué gana tu cliente (ej: "1 café gratis", "20% de descuento")
• <strong>Tipo de premio:</strong> Si es un descuento, algo gratis, un regalo, u otro

<strong>📍 Geofencing & Google Wallet:</strong>
• <strong>Latitud y Longitud:</strong> Las coordenadas de tu negocio
• <strong>Mensaje de proximidad:</strong> Lo que ve el cliente cuando pasa cerca de tu local

<strong>💳 Plan:</strong>
• Tu plan actual y fecha de expiración del trial`
            },
            {
                question: '¿Cómo edito mi configuración?',
                answer: `<strong>Paso a paso:</strong>
1. Ve a la pestaña <strong>"Configuración"</strong>
2. Presiona el botón <strong>"✏️ Editar"</strong> arriba a la derecha
3. Modifica los campos que quieras
4. Presiona <strong>"💾 Guardar"</strong>
5. Verás un mensaje <strong>"✅ Guardado correctamente"</strong>

Si te arrepientes, presiona <strong>"Cancelar"</strong> y los cambios se descartan.

<em>Tip: ¡Elige bien tu color principal! Ese color aparece en los botones y la interfaz que ven tus clientes.</em>`
            },
            {
                question: '¿Cómo configuro Geofencing?',
                answer: `<strong>¿Qué es Geofencing?</strong>
Es una función que envía una notificación automática cuando un cliente con Google Wallet pasa cerca de tu negocio. ¡Es como un imán digital!

<strong>¿Cómo configurarlo?</strong>
1. Abre <strong>Google Maps</strong> en tu computador
2. Busca tu negocio
3. Haz <strong>clic derecho</strong> sobre tu ubicación exacta
4. El primer dato que aparece son las <strong>coordenadas</strong> (ej: -33.4489, -70.6693)
5. Copia la primera cifra como <strong>Latitud</strong> y la segunda como <strong>Longitud</strong>
6. Escribe un <strong>mensaje de proximidad</strong> llamativo (ej: "¡Estás cerca! Pasa a sumar puntos 🎉")
7. Guarda los cambios

<em>Ahora, cuando un cliente con tu tarjeta en Google Wallet pase por la zona, recibirá tu mensaje automáticamente.</em>`
            }
        ]
    },
    {
        id: 'google-wallet',
        icon: '💳',
        title: 'Google Wallet',
        subtitle: 'Tarjeta digital para tus clientes',
        articles: [
            {
                question: '¿Qué es la integración con Google Wallet?',
                answer: `Google Wallet es la <strong>billetera digital</strong> de Google, instalada en todos los celulares Android.

<strong>¿Qué hace Vuelve+ con Google Wallet?</strong>
Después de que un cliente suma un punto, aparece un botón <strong>"Agregar a Google Wallet"</strong>. Al presionarlo, la tarjeta de lealtad de tu negocio se guarda en su billetera digital.

<strong>Beneficios para tu cliente:</strong>
• 📱 Siempre tiene su tarjeta a mano (no necesita buscar la página)
• 🔔 Recibe notificaciones cuando pasa cerca de tu negocio
• ⭐ Ve su progreso de puntos actualizado

<strong>Beneficios para ti:</strong>
• 📍 Marketing por ubicación (geofencing) automático
• 🎯 Mayor retención — el cliente tiene tu marca en su celular
• ✨ Imagen profesional y moderna`
            },
            {
                question: '¿Necesito hacer algo para que funcione?',
                answer: `<strong>Para el funcionamiento básico:</strong> No necesitas hacer nada especial. El botón aparece automáticamente después de cada visita del cliente.

<strong>Para activar las notificaciones por ubicación:</strong> Configura las coordenadas de tu negocio en la pestaña "Configuración" → sección "Geofencing & Google Wallet".

<em>Nota: Esta función requiere que tu plan tenga Google Wallet habilitado. Consulta con tu ejecutivo si no ves el botón.</em>`
            }
        ]
    },
    {
        id: 'mi-tarjeta',
        icon: '📱',
        title: 'Mi Tarjeta (Cliente)',
        subtitle: 'La vista del cliente final',
        articles: [
            {
                question: '¿Qué es la página "Mi Tarjeta"?',
                answer: `<strong>"Mi Tarjeta"</strong> es una página pública donde tus clientes pueden ver su progreso en todos los programas de lealtad en los que participan.

<strong>¿Cómo funciona?</strong>
1. El cliente va a la página <strong>/mi-tarjeta</strong>
2. Ingresa su número de WhatsApp
3. Ve todas sus tarjetas activas con su progreso

<strong>¿Qué puede ver?</strong>
• ⭐ Cuántos puntos/sellos tiene
• 🎁 Premios pendientes por canjear (con código QR)
• 📊 Progreso visual hacia el siguiente premio
• 🏢 Links a cada negocio donde tiene tarjeta

<em>Tip: Puedes decirles a tus clientes que revisen su progreso ahí. También hay un link "📱 Ver mi tarjeta" en el pie de tu página QR.</em>`
            }
        ]
    },
    {
        id: 'faq',
        icon: '❓',
        title: 'Preguntas Frecuentes',
        subtitle: 'Dudas comunes resueltas',
        articles: [
            {
                question: '¿Qué pasa si un cliente se registra dos veces?',
                answer: `El sistema identifica a cada cliente por su <strong>número de WhatsApp</strong>. Si alguien intenta registrarse con un WhatsApp que ya existe, el sistema simplemente reconoce que ya está registrado y suma el punto a su cuenta existente.

<em>No se crean duplicados 👍</em>`
            },
            {
                question: '¿Puede un cliente sumar más de un punto al día?',
                answer: `Depende del tipo de programa:

• <strong>Sellos:</strong> Solo 1 sello por día (para evitar abusos)
• <strong>Cashback:</strong> Puede registrar múltiples compras al día
• <strong>Multipase y Gift Card:</strong> Puede registrar múltiples consumos al día
• <strong>Otros tipos:</strong> Generalmente 1 registro por día

<em>Esto está diseñado para proteger tu programa de usos indebidos.</em>`
            },
            {
                question: '¿Puedo tener mi programa en otro idioma?',
                answer: `Actualmente Vuelve+ está disponible solo en <strong>español</strong>.`
            },
            {
                question: '¿Los datos de mis clientes están seguros?',
                answer: `Sí. Vuelve+ utiliza <strong>Supabase</strong> (PostgreSQL) como base de datos, con encriptación en tránsito y en reposo.

• Los datos se almacenan de forma segura en servidores profesionales
• Solo tú puedes ver los datos de tus clientes
• No compartimos información con terceros
• Cumplimos con las mejores prácticas de seguridad de la industria`
            },
            {
                question: '¿Los premios tienen fecha de vencimiento?',
                answer: `Sí. Los premios no canjeados expiran automáticamente después de <strong>30 días</strong>.

Esto se hace para mantener tu programa limpio y evitar acumulación de premios antiguos.

<em>El cliente recibe recordatorios para canjear sus premios antes de que expiren.</em>`
            },
            {
                question: '¿Qué hago si tengo un problema técnico?',
                answer: `<strong>Opciones de soporte:</strong>
1. Revisa esta sección de ayuda — la mayoría de las dudas están cubiertas aquí
2. Usa el botón de <strong>Soporte</strong> dentro del panel (WhatsApp)
3. Comparte tu slug del negocio y una captura del error para resolver más rápido

<em>Tip: Si algo no se ve bien, prueba refrescar la página (F5) o cerrar y abrir el navegador.</em>`
            }
        ]
    }
]

export default function AyudaPanel() {
    const [selectedSection, setSelectedSection] = useState<string | null>(null)
    const [openArticles, setOpenArticles] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    function toggleArticle(key: string) {
        setOpenArticles(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    // Filtrar secciones y artículos por búsqueda
    const filteredSections = searchQuery.trim()
        ? helpData.map(section => ({
            ...section,
            articles: section.articles.filter(a =>
                a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.answer.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(s => s.articles.length > 0)
        : helpData

    const activeSection = selectedSection
        ? filteredSections.find(s => s.id === selectedSection)
        : null

    return (
        <div className="ayuda-container">
            {/* Header */}
            <div className="cliente-content-header">
                <div>
                    <h1>Centro de Ayuda</h1>
                    <p className="cliente-content-subtitle">
                        Todo lo que necesitas saber sobre Vuelve+
                    </p>
                </div>
            </div>

            {/* Buscador */}
            <div className="ayuda-search">
                <div className="ayuda-search-icon">🔍</div>
                <input
                    type="text"
                    placeholder="Buscar en la ayuda... (ej: canjear, QR, cashback)"
                    value={searchQuery}
                    onChange={e => {
                        setSearchQuery(e.target.value)
                        if (e.target.value.trim()) setSelectedSection(null)
                    }}
                />
                {searchQuery && (
                    <button
                        className="ayuda-search-clear"
                        onClick={() => setSearchQuery('')}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Vista de secciones o detalle */}
            {!selectedSection && !searchQuery.trim() ? (
                /* Grid de secciones */
                <div className="ayuda-grid">
                    {filteredSections.map(section => (
                        <button
                            key={section.id}
                            className="ayuda-section-card"
                            onClick={() => setSelectedSection(section.id)}
                        >
                            <span className="ayuda-section-icon">{section.icon}</span>
                            <h3>{section.title}</h3>
                            <p>{section.subtitle}</p>
                            <span className="ayuda-section-count">
                                {section.articles.length} {section.articles.length === 1 ? 'artículo' : 'artículos'}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                /* Detalle de sección o resultados de búsqueda */
                <div className="ayuda-detail">
                    {!searchQuery.trim() && (
                        <button
                            className="ayuda-back"
                            onClick={() => setSelectedSection(null)}
                        >
                            ← Volver al índice
                        </button>
                    )}

                    {searchQuery.trim() && (
                        <p className="ayuda-search-results">
                            {filteredSections.reduce((acc, s) => acc + s.articles.length, 0)} resultado(s) para &quot;{searchQuery}&quot;
                        </p>
                    )}

                    {(searchQuery.trim() ? filteredSections : (activeSection ? [activeSection] : [])).map(section => (
                        <div key={section.id} className="ayuda-section-detail">
                            {searchQuery.trim() && (
                                <h2 className="ayuda-section-title">
                                    <span>{section.icon}</span> {section.title}
                                </h2>
                            )}
                            {!searchQuery.trim() && activeSection && (
                                <h2 className="ayuda-section-title">
                                    <span>{activeSection.icon}</span> {activeSection.title}
                                </h2>
                            )}

                            <div className="ayuda-articles">
                                {section.articles.map((article, idx) => {
                                    const key = `${section.id}-${idx}`
                                    const isOpen = openArticles.has(key)
                                    return (
                                        <div key={key} className={`ayuda-article ${isOpen ? 'open' : ''}`}>
                                            <button
                                                className="ayuda-article-header"
                                                onClick={() => toggleArticle(key)}
                                            >
                                                <span className="ayuda-article-question">
                                                    {article.question}
                                                </span>
                                                <span className={`ayuda-article-chevron ${isOpen ? 'rotated' : ''}`}>
                                                    ▾
                                                </span>
                                            </button>
                                            {isOpen && (
                                                <div
                                                    className="ayuda-article-body"
                                                    dangerouslySetInnerHTML={{ __html: article.answer }}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {filteredSections.length === 0 && searchQuery.trim() && (
                        <div className="ayuda-no-results">
                            <span className="ayuda-no-results-icon">🔍</span>
                            <p>No encontramos resultados para &quot;{searchQuery}&quot;</p>
                            <p className="ayuda-no-results-hint">
                                Prueba con otras palabras o revisa las secciones del índice
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Quick help footer */}
            <div className="ayuda-footer">
                <p>¿No encontraste lo que buscabas?</p>
                <p className="ayuda-footer-hint">
                    Usa el botón de soporte del panel para ayuda personalizada
                </p>
            </div>
        </div>
    )
}
