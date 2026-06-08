# Guía de desarrollo y pruebas

---

## Puertos con todo corriendo

| Servicio | Puerto | Cómo arranca |
|---|---|---|
| Backend API | `3001` | Docker |
| Postgres | `5432` | Docker |
| Servidor MCP | `3002` | `pnpm dev` |
| MCP Inspector | `6274` | `npx @modelcontextprotocol/inspector` |

---

## Opción A — Solo MCP Inspector (sin backend)

Útil para verificar que el servidor arranca, el middleware funciona y los schemas son correctos. Las tools que llaman a la API van a devolver error de conexión (esperado).

**1. Crear `.env.local`**

```
MCP_API_KEY=dev-key
PORT=3002
```

**2. Arrancar el servidor MCP**

```bash
pnpm dev
```

**3. Abrir el Inspector**

```bash
npx @modelcontextprotocol/inspector
```

Ir a `http://localhost:6274` y configurar:

- Transport: `Streamable HTTP`
- URL: `http://localhost:3002/mcp`
- Header: `x-api-key` → `dev-key`

Click **Connect**.

**Qué podés probar sin backend:**

- Pestaña **Tools** → ver los 6 tools con sus schemas completos
- Pestaña **Resources** → ejecutar `vehicle-options` → devuelve todas las opciones válidas
- Intentar conectar sin el header `x-api-key` → debe rechazar con 401

---

## Opción B — Stack completo (end-to-end)

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- [Bun](https://bun.sh) instalado (el backend lo usa)

### 1. Levantar el backend con Docker

```bash
cd ../auto-express-hub-back
docker-compose up -d
```

Esperá ~30 segundos. Verificar que levantó:

```bash
curl http://localhost:3001
```

### 2. Configurar el servidor MCP

Crear `auto-express-hub-mcp/.env.local`:

```
AUTO_EXPRESS_HUB_API_URL=http://localhost:3001
MCP_API_KEY=dev-key
PORT=3002
```

### 3. Arrancar el servidor MCP

```bash
cd ../auto-express-hub-mcp
pnpm dev
```

Deberías ver:

```
XMCP  Server running at http://0.0.0.0:3002/mcp
XMCP  Registered 6 tools, 1 resource
```

### 4. Registrar una agencia de prueba y obtener el JWT

```bash
# Registrar
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agencia-test",
    "email": "test@test.com",
    "password": "Test1234!"
  }'

# Login — copiar el access_token de la respuesta
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234!"
  }'
```

### 5. Abrir el Inspector

```bash
npx @modelcontextprotocol/inspector
```

Ir a `http://localhost:6274`:

- URL: `http://localhost:3002/mcp`
- Header: `x-api-key` → `dev-key`

---

## Casos de prueba en el Inspector

### Resource: vehicle-options

Pestaña **Resources** → `vehicle-options` → **Read Resource**

Respuesta esperada: JSON con `marcas`, `tipos`, `colores`, `combustibles`, `transmisiones`, `monedas`.

---

### Tool: list-vehicles (sin JWT)

Pestaña **Tools** → `list-vehicles` → dejar todos los campos vacíos → **Run Tool**

Respuesta esperada:
```json
{ "success": true, "vehicles": [...] }
```

---

### Tool: create-vehicle (requiere JWT)

```json
{
  "jwt": "eyJhbGciOi...",
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

Respuesta esperada:
```json
{ "success": true, "vehicle": { "id": "uuid...", ... } }
```

---

### Tool: get-my-vehicles (requiere JWT)

```json
{ "jwt": "eyJhbGciOi..." }
```

Respuesta esperada: lista de vehículos de la agencia.

---

### Tool: delete-vehicle (requiere JWT)

```json
{
  "jwt": "eyJhbGciOi...",
  "vehicleId": "uuid-del-vehiculo-creado"
}
```

Respuesta esperada:
```json
{ "success": true, "message": "Vehicle uuid... deleted successfully" }
```

---

### Verificar que el middleware rechaza requests sin API key

```bash
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Respuesta esperada: `401 Unauthorized`

---

## Conectar a Claude Desktop (local)

Editar `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "auto-express-hub": {
      "url": "http://localhost:3002/mcp",
      "headers": {
        "x-api-key": "dev-key"
      }
    }
  }
}
```

Reiniciar Claude Desktop. Para verificar que conectó, decirle:

> "Leé el recurso vehicle-options"

Si Claude lista las marcas y tipos, la conexión funciona.

---

## Apagar todo

```bash
# Detener el backend y la base de datos
cd ../auto-express-hub-back
docker-compose down

# El servidor MCP se detiene con Ctrl+C en su terminal
```

Para destruir los datos de la base de datos (reset completo):

```bash
docker-compose down -v
```
