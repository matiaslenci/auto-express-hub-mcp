# Autenticación del MCP Server

## Flujo OAuth 2.0 (Claude.ai)

El servidor implementa el flujo OAuth 2.0 con PKCE según RFC 8414. El usuario se autentica **una sola vez** con sus credenciales de Auto Express Hub y Claude.ai almacena el token automáticamente.

### Cómo conectarse desde Claude.ai

1. Agregar el servidor MCP en Claude.ai → el cliente abre la página de autorización.
2. Ingresar el correo electrónico y contraseña de la cuenta de Auto Express Hub.
3. Hacer clic en **Autorizar** → el MCP llama al backend, obtiene el JWT y redirige de vuelta a Claude.ai.
4. Todos los tools autenticados funcionan automáticamente. El token dura **14 días**.
5. Al vencer, Claude.ai muestra un botón de re-autorización → repetir el paso 2.

### Flujo técnico

```
Claude.ai → GET /oauth/authorize (muestra formulario email+password)
         ← HTML con formulario

Claude.ai → POST /oauth/authorize (email, password, code_challenge, redirect_uri)
          → MCP llama POST /auth/login en el backend
          ← backend devuelve { access_token: "<backend_jwt>" }
          → MCP emite auth_code JWT (5 min) con backendJwt embebido
          ← redirect a redirect_uri?code=<auth_code>

Claude.ai → POST /oauth/token (code, code_verifier)
          → MCP verifica PKCE y el auth_code
          → MCP emite access_token JWT (14 días) con backendJwt embebido
          ← { access_token, token_type: "Bearer", expires_in: 1209600 }

Claude.ai → POST /mcp (Authorization: Bearer <access_token>)
          → middleware verifica el access_token, extrae backendJwt, adjunta req.auth
          → tool handler lee extra.authInfo.extra.backendJwt
          → tool llama al backend con ese JWT
```

### Endpoints OAuth

| Endpoint | Descripción |
|----------|-------------|
| `GET /.well-known/oauth-authorization-server` | Metadata del servidor (RFC 8414) |
| `GET /oauth/authorize` | Muestra el formulario de login |
| `POST /oauth/authorize` | Procesa credenciales, llama al backend, redirige con auth code |
| `POST /oauth/token` | Intercambia auth code por access token |

---

## Fallback x-api-key (Claude Desktop / desarrollo local)

Para Claude Desktop o pruebas locales se puede usar el header `x-api-key` con el valor de `MCP_API_KEY`. En este modo **no se adjunta** información de usuario al contexto, por lo que los tools autenticados devolverán un error indicando que se debe conectar la cuenta vía OAuth.

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `AUTO_EXPRESS_HUB_API_URL` | Sí | URL base del backend (ej: `https://api.autoexpresshub.com`) |
| `MCP_API_KEY` | Sí en producción | Protege el servidor y firma los tokens OAuth como fallback |
| `OAUTH_JWT_SECRET` | Recomendada | Secreto dedicado para firmar tokens OAuth (prioridad sobre `MCP_API_KEY`) |
| `OAUTH_CLIENT_ID` | Opcional | Valida el `client_id` en el token endpoint |
| `OAUTH_CLIENT_SECRET` | Opcional | Valida el `client_secret` en el token endpoint |
| `PORT` | Opcional | Puerto del servidor (default: 3002) |

---

## Tools autenticados

Los siguientes tools requieren que el usuario esté conectado vía OAuth. Si `extra.authInfo.extra.backendJwt` no está presente, devuelven un error descriptivo en lugar de fallar silenciosamente.

| Tool | Descripción |
|------|-------------|
| `create-vehicle` | Crea una publicación de vehículo |
| `update-vehicle` | Modifica una publicación existente |
| `delete-vehicle` | Elimina una publicación |
| `get-my-vehicles` | Lista los vehículos de la agencia autenticada |

## Tools públicos

No requieren autenticación.

| Tool | Descripción |
|------|-------------|
| `list-vehicles` | Lista vehículos del catálogo público |
| `get-vehicle` | Obtiene el detalle de un vehículo |
| `upload-vehicle-image` | Sube una imagen (requiere auth del backend separadamente) |
