import { Router, Request, Response, urlencoded, json } from "express";
import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.OAUTH_JWT_SECRET || process.env.MCP_API_KEY || "dev-secret";
  return new TextEncoder().encode(secret);
}

function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createOAuthRouter(): Router {
  const router = Router();

  // RFC 8414 — OAuth 2.0 Authorization Server Metadata
  router.get(
    "/.well-known/oauth-authorization-server",
    (req: Request, res: Response) => {
      const base = `${req.protocol}://${req.get("host")}`;
      res.json({
        issuer: base,
        authorization_endpoint: `${base}/oauth/authorize`,
        token_endpoint: `${base}/oauth/token`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: [
          "client_secret_post",
          "client_secret_basic",
          "none",
        ],
      });
    }
  );

  // Authorization endpoint — show login form
  router.get("/oauth/authorize", (req: Request, res: Response) => {
    const q = req.query as Record<string, string>;

    if (q.response_type !== "code") {
      res.status(400).json({ error: "unsupported_response_type" });
      return;
    }
    if (!q.redirect_uri) {
      res
        .status(400)
        .json({ error: "invalid_request", error_description: "redirect_uri required" });
      return;
    }

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Auto Express Hub — Autorizar</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;max-width:400px;margin:80px auto;padding:0 20px;color:#111}
    h1{font-size:1.3rem;margin-bottom:6px}
    p{color:#555;font-size:.95rem;margin-bottom:24px}
    label{display:block;font-size:.9rem;font-weight:600;margin-bottom:6px}
    input[type=password]{width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:1rem}
    input[type=password]:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
    button{margin-top:14px;width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;font-weight:600}
    button:hover{background:#1d4ed8}
  </style>
</head>
<body>
  <h1>Auto Express Hub MCP</h1>
  <p>Ingresá tu API Key para autorizar el acceso desde Claude.ai.</p>
  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="client_id"             value="${esc(q.client_id || "")}" />
    <input type="hidden" name="redirect_uri"          value="${esc(q.redirect_uri || "")}" />
    <input type="hidden" name="state"                 value="${esc(q.state || "")}" />
    <input type="hidden" name="code_challenge"        value="${esc(q.code_challenge || "")}" />
    <input type="hidden" name="code_challenge_method" value="${esc(q.code_challenge_method || "")}" />
    <label for="api_key">API Key</label>
    <input type="password" id="api_key" name="api_key" placeholder="tu_api_key" required autofocus />
    <button type="submit">Autorizar</button>
  </form>
</body>
</html>`);
  });

  // Authorization endpoint — process form submission
  router.post(
    "/oauth/authorize",
    urlencoded({ extended: false }),
    async (req: Request, res: Response) => {
      const b = req.body as Record<string, string>;
      const validKey = process.env.MCP_API_KEY;

      if (validKey && b.api_key !== validKey) {
        res.status(401).send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Error</title>
<style>body{font-family:system-ui,sans-serif;max-width:400px;margin:80px auto;padding:0 20px}</style>
</head><body>
<h2>API Key inválida</h2>
<p>La clave ingresada no es correcta. <a href="javascript:history.back()">← Volver</a></p>
</body></html>`);
        return;
      }

      if (!b.redirect_uri) {
        res.status(400).json({ error: "invalid_request" });
        return;
      }

      const code = await new SignJWT({
        type: "auth_code",
        client_id: b.client_id || null,
        code_challenge: b.code_challenge || null,
        code_challenge_method: b.code_challenge_method || null,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(getJwtSecret());

      const redirectUrl = new URL(b.redirect_uri);
      redirectUrl.searchParams.set("code", code);
      if (b.state) redirectUrl.searchParams.set("state", b.state);

      res.redirect(redirectUrl.toString());
    }
  );

  // Token endpoint — exchange auth code for access token
  router.post(
    "/oauth/token",
    urlencoded({ extended: false }),
    json(),
    async (req: Request, res: Response) => {
      const b = req.body as Record<string, string>;

      if (b.grant_type !== "authorization_code") {
        res.status(400).json({ error: "unsupported_grant_type" });
        return;
      }

      // Validate client credentials when configured
      const expectedClientId = process.env.OAUTH_CLIENT_ID;
      const expectedClientSecret = process.env.OAUTH_CLIENT_SECRET;
      if (expectedClientId && b.client_id !== expectedClientId) {
        res.status(401).json({ error: "invalid_client" });
        return;
      }
      if (expectedClientSecret && b.client_secret !== expectedClientSecret) {
        res.status(401).json({ error: "invalid_client" });
        return;
      }

      if (!b.code) {
        res.status(400).json({ error: "invalid_grant", error_description: "code required" });
        return;
      }

      try {
        const secret = getJwtSecret();
        const { payload } = await jwtVerify(b.code, secret);

        if (payload["type"] !== "auth_code") {
          res.status(400).json({ error: "invalid_grant" });
          return;
        }

        // PKCE verification
        const storedChallenge = payload["code_challenge"] as string | null;
        const storedMethod = payload["code_challenge_method"] as string | null;

        if (storedChallenge && storedMethod === "S256") {
          if (!b.code_verifier) {
            res
              .status(400)
              .json({ error: "invalid_grant", error_description: "code_verifier required" });
            return;
          }
          const computed = createHash("sha256")
            .update(b.code_verifier)
            .digest("base64url");
          if (computed !== storedChallenge) {
            res
              .status(400)
              .json({ error: "invalid_grant", error_description: "PKCE verification failed" });
            return;
          }
        }

        // Issue access token
        const accessToken = await new SignJWT({
          sub: "mcp-client",
          client_id: payload["client_id"],
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(secret);

        res.json({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600,
        });
      } catch {
        res.status(400).json({ error: "invalid_grant", error_description: "Invalid or expired code" });
      }
    }
  );

  return router;
}
