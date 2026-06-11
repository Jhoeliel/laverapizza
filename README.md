# La Vera Pizza — Gestión de Pedidos

App web PWA para gestionar pedidos en tiempo real de **La Vera Pizza**, una pizzería delivery en Chimbote, Perú.

---

## Demo

**URL activa:** https://jhoeliel.github.io/laverapizza/

---

## Funcionalidades

### Turnos
- Abrir y cerrar turno de trabajo
- Cada turno registra hora de inicio, fin, total de pedidos y monto recaudado
- Solo se muestran los pedidos del turno activo
- Sincronización automática entre dispositivos — si otro dispositivo abre un turno, la app lo adopta

### Pedidos
- **Registro rápido:** solo requiere tipo (Delivery/Pickup) y productos
- Los datos adicionales (teléfono, pago, delivery) se completan en la card del pedido
- Estados: Preparando → Retrasado → Entregado → Finalizado
- Timer en tiempo real sincronizado entre dispositivos (basado en fecha ISO guardada en Sheets)
- Alerta sonora al llegar a 30 minutos (auto-cambia a Retrasado)
- Solo se puede Finalizar un pedido si está Pagado

### Cards de pedido
Cada card muestra y permite editar:
- Teléfono del cliente
- Importe delivery (no suma al total si el tipo es Pickup)
- Tipo de pedido: Delivery / Pickup
- Método de pago: Efectivo / Yape/Plin
- Estado del pago: Pendiente / Pagado
- Estado del pedido (selector)

### Catálogo
- Cargado automáticamente desde Google Sheets
- Búsqueda por texto con autocompletado
- Soporte para pizzas con 2do sabor (precio = ceil((p1+p2)/2))

### Sincronización multi-dispositivo
- Lectura vía **JSONP** (evita bloqueo CORS de GitHub Pages)
- Escritura vía **JSONP** con parámetros GET al Apps Script
- Sync cada 10 segundos
- Protección contra condición de carrera: cambios locales bloqueados 30s antes de ser sobreescritos por el sync

### Estadísticas en tiempo real
- Pedidos activos
- Pedidos retrasados
- Monto recaudado (solo pedidos Pagados)

---

## Stack técnico

| Componente | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla (ES5) |
| Hosting | GitHub Pages + Cloudflare Pages |
| Backend | Google Apps Script |
| Base de datos | Google Sheets |
| PWA | Manifest embebido en base64, sin Service Worker |

---

## Arquitectura

```
App (GitHub Pages / Cloudflare Pages)
    ↕ JSONP (GET con callback)
Google Apps Script (doGet)
    ↕ SpreadsheetApp
Google Sheets
    ├── Pedidos   (col: ID, Fecha, Hora, Tipo, Telefono, Productos,
    │              Subtotal, Delivery, Total, Pago, Estado, Notas,
    │              Estado Pago, Turno ID, Fecha ISO)
    ├── Turnos    (col: Turno ID, Inicio, Fin, Total Pedidos, Recaudado, Estado)
    └── Catalogo  (col: Nombre, Precio)
```

---

## Acciones del Apps Script

| Acción | Descripción |
|---|---|
| `getTurnoActivo` | Devuelve turno activo + pedidos + maxId global |
| `insert` | Registra un pedido nuevo |
| `updateStatus` | Actualiza estado del pedido (col 11) |
| `updateEstadoPago` | Actualiza estado de pago (col 13) |
| `updatePago` | Actualiza método de pago (col 10) |
| `updateDelivery` | Actualiza delivery y total (col 8-9) |
| `updateTipo` | Actualiza tipo delivery/pickup (col 4) |
| `updateTel` | Actualiza teléfono (col 5) |
| `updateNotas` | Actualiza notas (col 12) |
| `abrirTurno` | Crea registro de turno nuevo |
| `cerrarTurno` | Marca turno como cerrado |

---

## Archivos del repositorio

```
/
├── index.html        ← App completa (single file)
└── manifest.json     ← PWA manifest (opcional, embebido en el HTML)
```

---

## IDs de pedidos

Los pedidos registrados con la app actual usan `Date.now()` como ID (timestamp en ms), garantizando unicidad entre dispositivos. Los pedidos históricos anteriores usan formato `#001`, `#002`, etc. — el Apps Script maneja ambos formatos con `sameId()`.

---

## Configuración

Para deployar en otra cuenta, editar en `index.html`:

```javascript
// URL del Apps Script desplegado como webapp pública
var API_URL = "https://script.google.com/macros/s/.../exec";

// URL del catálogo en Google Sheets (gviz CSV)
// Formato: https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&gid=0
```

---

## Requisitos del Apps Script

El script debe estar desplegado como **Aplicación web** con:
- **Ejecutar como:** Yo (propietario)
- **Quién tiene acceso:** Cualquier persona

El código completo del Apps Script está en [`apps-script/Code.gs`](apps-script/Code.gs) *(ver rama del repositorio)*.

---

## Desarrollado por

**Jhoeliel** — Arquitecto de Soluciones Digitales  
Chimbote, Perú
