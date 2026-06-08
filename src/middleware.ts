import { apiKeyAuthMiddleware, type Middleware } from "xmcp";

const middleware: Middleware = apiKeyAuthMiddleware({
  headerName: "x-api-key",
  validateApiKey: async (apiKey) => {
    const validKey = process.env.MCP_API_KEY;
    if (!validKey) {
      // Dev mode: allow all requests if MCP_API_KEY is not set
      console.warn("[MCP] Warning: MCP_API_KEY is not set. Server is unprotected.");
      return true;
    }
    return apiKey === validKey;
  },
});

export default middleware;
