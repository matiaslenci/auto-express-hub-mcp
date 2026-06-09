import { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types";
import { createOAuthRouter } from "./oauth-router";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.OAUTH_JWT_SECRET || process.env.MCP_API_KEY || "dev-secret";
  return new TextEncoder().encode(secret);
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const validKey = process.env.MCP_API_KEY;

  // Dev mode: no key set → allow all
  if (!validKey) {
    console.warn("[MCP] Warning: MCP_API_KEY is not set. Server is unprotected.");
    next();
    return;
  }

  // Bearer JWT (OAuth flow — Claude.ai)
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    jwtVerify(token, getJwtSecret())
      .then(({ payload }) => {
        const backendJwt = payload["backendJwt"] as string | undefined;
        (req as Request & { auth?: AuthInfo }).auth = {
          token,
          clientId: (payload["client_id"] as string) ?? "unknown",
          scopes: [],
          expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
          extra: backendJwt ? { backendJwt } : {},
        };
        next();
      })
      .catch(() => {
        // Fall back to API key check before rejecting
        if (req.headers["x-api-key"] === validKey) {
          next();
        } else {
          res.status(401).json({ error: "Unauthorized" });
        }
      });
    return;
  }

  // x-api-key header (legacy — Claude Desktop / dev)
  if (req.headers["x-api-key"] === validKey) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export default {
  middleware: authMiddleware,
  router: createOAuthRouter(),
};
