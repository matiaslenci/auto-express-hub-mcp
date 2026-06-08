import type { XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: {
    port: Number(process.env.PORT ?? 3002),
    host: "0.0.0.0",
    endpoint: "/mcp",
    cors: {
      origin: "*",
      credentials: true,
    },
  },
  paths: {
    prompts: false,
  },
  template: {
    name: "Auto Express Hub MCP",
    description: "MCP server for managing vehicle catalogs in Auto Express Hub",
    instructions:
      "Always read the vehicle-options resource first to get valid values for marca, tipo, color, combustible, transmision, and moneda before creating or updating a vehicle.",
  },
};

export default config;
