# Auto Express Hub — Servidor MCP

Servidor MCP para [Auto Express Hub](https://autoexpresshub.com), construido con [xmcp](https://xmcp.dev). Permite que asistentes de IA (Claude Desktop, ChatGPT, Cursor, etc.) gestionen el catálogo de vehículos de una agencia mediante lenguaje natural.

---

## Tabla de contenidos

- [¿Qué es esto?](#qué-es-esto)
- [Tools disponibles](#tools-disponibles)
- [Resources disponibles](#resources-disponibles)
- [Requisitos](#requisitos)
- [Instalación y desarrollo local](#instalación-y-desarrollo-local)
- [Variables de entorno](#variables-de-entorno)
- [Conectar clientes de IA](#conectar-clientes-de-ia)
  - [Claude Desktop](#claude-desktop)
  - [Cursor](#cursor)
  - [ChatGPT](#chatgpt-via-mcp-connect)
- [Deploy en Vercel](#deploy-en-vercel)
- [Autenticación](#autenticación)
- [Ejemplos de uso](#ejemplos-de-uso)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Siguientes pasos](#siguientes-pasos)

---

## ¿Qué es esto?

Este repositorio es el **servidor MCP** de Auto Express Hub. Un servidor MCP expone herramientas (tools) y recursos (resources) que los modelos de IA pueden invocar directamente, igual que llamarían a una función.

Con este servidor conectado, podés decirle a Claude:

> "Cargame un Toyota Corolla 2022, blanco, automático, nafta, 45.000 km. Precio USD 18.500. Está en Córdoba."

Y Claude lo publica solo en el catálogo de tu agencia.

**Flujo:**

```
Cliente IA (Claude / ChatGPT / Cursor)
        │  MCP over HTTP
        ▼
auto-express-hub-mcp  (este repo, port 3001)
        │  REST API + JWT
        ▼
auto-express-hub-back  (tu backend, port 3000)
```

---

## Tools disponibles

| Tool | Auth | Descripción |
|---|:---:|---|
| `create-vehicle` | JWT | Crea una nueva publicación de vehículo |
| `list-vehicles` | No | Lista vehículos con filtros opcionales |
| `get-vehicle` | No | Obtiene el detalle de un vehículo por ID |
| `update-vehicle` | JWT | Actualiza una publicación (solo el dueño) |
| `delete-vehicle` | JWT | Elimina una publicación (solo el dueño) |
| `get-my-vehicles` | JWT | Lista todos los vehículos de la agencia autenticada |

### Parámetros principales de `create-vehicle`

| Campo | Tipo | Requerido | Notas |
|---|---|:---:|---|
| `jwt` | string | Sí | Token JWT de la agencia |
| `marca` | string | Sí | Ver opciones en `vehicle-options` |
| `tipoVehiculo` | `AUTO` \| `MOTO` | Sí | Categoría del vehículo |
| `modelo` | string | Sí | Ej: Corolla, Civic, CBR600 |
| `anio` | number | Sí | Entre 1990 y 2026 |
| `precio` | number | No | Omitir si `moneda` es `CONSULTAR` |
| `moneda` | `ARS` \| `USD` \| `CONSULTAR` | Sí | |
| `tipo` | string | Sí | Ej: Sedan, SUV, Street, Naked |
| `transmision` | string | Sí | `Manual` o `Automatico` |
| `combustible` | string | Sí | Nafta, Diesel, Gas, Hibrido, Electrico |
| `kilometraje` | number | Sí | En kilómetros, mínimo 0 |
| `color` | string | Sí | Blanco, Negro, Gris, Plata, Rojo, Azul, Verde, Otro |
| `descripcion` | string | No | Texto libre |
| `localidad` | string | No | Ciudad o provincia |
| `fotos` | string[] | No | Nombres de archivo `.webp` |
| `activo` | boolean | No | Default: `true` |

`update-vehicle` acepta los mismos campos pero todos opcionales (PATCH). `delete-vehicle` solo requiere `jwt` y `vehicleId`.

---

## Resources disponibles

| Resource | URI | Descripción |
|---|---|---|
| `vehicle-options` | `vehicle-options` | Todas las opciones válidas para marca, tipo, color, combustible, transmision y moneda |

El servidor le indica a los modelos que lean este recurso antes de crear o actualizar un vehículo, garantizando que los valores enviados a la API siempre sean correctos.

---

## Requisitos

- **Node.js 20+** — [descargar](https://nodejs.org)
- **pnpm** — `npm install -g pnpm`
- **Backend de Auto Express Hub** corriendo y accesible (local o desplegado)

---

## Instalación y desarrollo local

```bash
# 1. Clonar o ir al directorio del proyecto
cd auto-express-hub-mcp

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (ver sección Variables de entorno)

# 4. Iniciar en modo desarrollo (hot reload)
pnpm dev
```

El servidor arranca en `http://localhost:3001/mcp`.

Para verificar que está corriendo, podés hacer:

```bash
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Desarrollo con hot reload |
| `pnpm build` | Compilar para producción |
| `pnpm start` | Ejecutar el build (`node dist/http.js`) |

---

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores:

```bash
# URL base del backend de Auto Express Hub
AUTO_EXPRESS_HUB_API_URL=http://localhost:3000

# Clave secreta para proteger el servidor MCP
MCP_API_KEY=mcp_sk_replace_with_real_key
```

| Variable | Descripción | Default |
|---|---|---|
| `AUTO_EXPRESS_HUB_API_URL` | URL base del backend REST | `http://localhost:3000` |
| `MCP_API_KEY` | Clave que deben enviar los clientes en `x-api-key` | Sin default — requerido en producción |

> Si `MCP_API_KEY` no está configurada, el servidor loguea un warning y acepta todas las requests. Esto es útil en desarrollo local pero **nunca dejarlo sin configurar en producción**.

---

## Conectar clientes de IA

### Claude Desktop

**Ubicación del archivo de configuración:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Desarrollo local:**

```json
{
  "mcpServers": {
    "auto-express-hub": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "x-api-key": "dev-key"
      }
    }
  }
}
```

**Producción (Vercel):**

```json
{
  "mcpServers": {
    "auto-express-hub": {
      "url": "https://auto-express-hub-mcp.vercel.app/mcp",
      "headers": {
        "x-api-key": "mcp_sk_tu_clave_real"
      }
    }
  }
}
```

Después de editar el archivo, **reiniciar Claude Desktop** para que tome los cambios.

---

### Cursor

1. Ir a `Cursor > Settings > MCP`
2. Agregar servidor con:
   - **URL:** `http://localhost:3001/mcp` (o la URL de Vercel)
   - **Headers:** `x-api-key: tu-clave`

---

### ChatGPT via MCP Connect

1. Ir a [chatgpt.com](https://chatgpt.com) > Settings > Connected apps > MCP
2. Ingresar:
   - **URL:** `https://auto-express-hub-mcp.vercel.app/mcp`
   - **Header name:** `x-api-key`
   - **Header value:** tu `MCP_API_KEY`

---

## Deploy en Vercel

### Prerequisito: tener el backend desplegado

El servidor MCP llama al backend. Necesitás tener `auto-express-hub-back` desplegado y con una URL pública antes de deployar el MCP.

### Pasos

```bash
# 1. Crear repositorio en GitHub y subir este directorio
git init
git add .
git commit -m "feat: auto express hub mcp server"
git remote add origin https://github.com/tu-usuario/auto-express-hub-mcp.git
git push -u origin main
```

2. Ir a [vercel.com/new](https://vercel.com/new) e importar el repositorio.

3. En **Environment Variables**, agregar:

   | Key | Value |
   |---|---|
   | `AUTO_EXPRESS_HUB_API_URL` | URL pública de tu backend, ej: `https://api.autoexpresshub.com` |
   | `MCP_API_KEY` | Un string seguro, ej: `mcp_sk_abc123xyz` |

4. Click en **Deploy**.

El `vercel.json` ya tiene la configuración necesaria:

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install"
}
```

### Verificar el deploy

```bash
curl -X POST https://auto-express-hub-mcp.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-clave" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Debería devolver los 6 tools registrados.

---

## Autenticación

El sistema usa dos capas de autenticación independientes:

### 1. API Key del servidor MCP (`MCP_API_KEY`)

Protege el servidor MCP en sí. Todos los clientes (Claude, Cursor, ChatGPT) deben enviar esta clave en el header `x-api-key`. Sin ella, la request es rechazada con 401 antes de ejecutar cualquier tool.

```
Cliente IA ──[x-api-key: mcp_sk_xxx]──► Servidor MCP
```

### 2. JWT de la agencia

Las tools que modifican datos (`create-vehicle`, `update-vehicle`, `delete-vehicle`, `get-my-vehicles`) reciben el JWT como parámetro `jwt`. Este token lo obtiene cada agencia al iniciar sesión en la web de Auto Express Hub. El servidor MCP lo reenvía al backend en el header `Authorization: Bearer <jwt>`.

```
Servidor MCP ──[Authorization: Bearer eyJ...]──► Backend API
```

El backend valida el JWT y garantiza que cada agencia solo pueda modificar sus propios vehículos.

**Cómo obtener el JWT:**
1. Iniciar sesión en la app web de Auto Express Hub
2. Abrir DevTools > Application > Local Storage (o copiar desde la app)
3. Pasarlo como parámetro `jwt` al invocar las tools autenticadas

---

## Ejemplos de uso

### Cargar un vehículo nuevo

> "Cargame un Toyota Corolla 2022, blanco, automático, nafta, 45.000 km. Precio USD 18.500. Está en Córdoba."

Claude invoca `create-vehicle` con:

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "marca": "Toyota",
  "tipoVehiculo": "AUTO",
  "modelo": "Corolla",
  "anio": 2022,
  "precio": 18500,
  "moneda": "USD",
  "tipo": "Sedan",
  "transmision": "Automatico",
  "combustible": "Nafta",
  "kilometraje": 45000,
  "color": "Blanco",
  "localidad": "Cordoba"
}
```

---

### Ver el catálogo propio

> "Mostrame todos mis autos publicados."

Claude invoca `get-my-vehicles` con:

```json
{ "jwt": "eyJhbGciOi..." }
```

---

### Buscar vehículos con filtros

> "Busca SUVs automáticas entre $15.000 y $30.000 dólares."

Claude invoca `list-vehicles` con:

```json
{
  "tipo": "SUV",
  "transmision": "Automatico",
  "precioMin": 15000,
  "precioMax": 30000
}
```

---

### Actualizar precio de un vehículo

> "Actualizá el precio del Corolla (ID: abc-123) a $17.000 USD."

Claude invoca `update-vehicle` con:

```json
{
  "jwt": "eyJhbGciOi...",
  "vehicleId": "abc-123",
  "precio": 17000,
  "moneda": "USD"
}
```

---

### Dar de baja una publicación

> "Desactivá el Ford Ranger que tengo publicado (ID: xyz-456)."

Claude invoca `update-vehicle` con:

```json
{
  "jwt": "eyJhbGciOi...",
  "vehicleId": "xyz-456",
  "activo": false
}
```

---

## Estructura del proyecto

```
auto-express-hub-mcp/
├── src/
│   ├── tools/                    # Cada archivo = una tool MCP
│   │   ├── create-vehicle.ts     # POST /vehicles
│   │   ├── list-vehicles.ts      # GET  /vehicles
│   │   ├── get-vehicle.ts        # GET  /vehicles/:id
│   │   ├── update-vehicle.ts     # PATCH /vehicles/:id
│   │   ├── delete-vehicle.ts     # DELETE /vehicles/:id
│   │   └── get-my-vehicles.ts    # GET  /vehicles/my-vehicles
│   ├── resources/
│   │   └── vehicle-options.ts    # Listas de valores válidos
│   ├── middleware.ts             # API Key auth (x-api-key)
│   └── lib/
│       └── api-client.ts        # Cliente HTTP con Bearer JWT
├── xmcp.config.ts               # Puerto 3001, endpoint /mcp, CORS
├── vercel.json                  # Configuración de deploy
├── .env.example                 # Template de variables de entorno
├── package.json
└── tsconfig.json
```

---

## Siguientes pasos

### Funcionalidades pendientes

- [ ] **Tool `get-agency-catalog`** — obtener el catálogo público de una agencia por username (`GET /vehicles/user/:username`), útil para que la IA responda consultas de compradores
- [ ] **Tool `register-view`** — registrar una vista en un vehículo (`POST /vehicles/:id/view`) para analytics
- [ ] **Tool `register-whatsapp-click`** — registrar clic de WhatsApp (`POST /vehicles/:id/whatsapp`)
- [ ] **Tool `upload-photo`** — subir fotos de vehículos si el backend expone un endpoint de upload
- [ ] **Autenticación OAuth** — en lugar de pasar el JWT como parámetro, implementar un flujo OAuth para que el cliente MCP obtenga el token automáticamente (xmcp soporta `jwtAuthMiddleware`)
- [ ] **Resource `agency-stats`** — exponer métricas de la agencia (vistas totales, clics de WhatsApp, vehículos activos)

### Mejoras técnicas

- [ ] **Upgradear `zod` a v4** — la versión instalada (3.x) es compatible, pero zod v4 tiene mejor performance. Requiere ajustar las importaciones: `import { z } from "zod/v4"`
- [ ] **Pinear versión de xmcp** — cambiar `"xmcp": "latest"` a `"xmcp": "0.6.10"` en `package.json` para builds determinísticos
- [ ] **Tests de integración** — agregar tests que levanten el servidor MCP y ejecuten las tools contra el backend de staging
- [ ] **Monitoreo** — agregar logs estructurados para rastrear qué tools se invocan y desde qué cliente

### Deploy y operaciones

- [ ] **Dominio propio** — configurar un dominio como `mcp.autoexpresshub.com` apuntando al deployment de Vercel
- [ ] **Rotar `MCP_API_KEY`** — generar una clave nueva y actualizarla en Vercel + en los configs de los clientes cuando sea necesario
- [ ] **Configurar `AUTO_EXPRESS_HUB_API_URL`** en Vercel apuntando al backend de producción antes del primer deploy

### Para conectar la primera agencia

1. Deployar el backend (`auto-express-hub-back`) y obtener su URL pública
2. Deployar este servidor en Vercel con las variables de entorno correctas
3. Iniciar sesión en la app web de Auto Express Hub y copiar el JWT
4. Agregar la configuración MCP a Claude Desktop (ver sección [Claude Desktop](#claude-desktop))
5. Reiniciar Claude Desktop
6. Decirle a Claude: "Leé el recurso vehicle-options" — si lo hace, la conexión funciona
