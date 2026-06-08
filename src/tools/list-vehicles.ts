import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  marca: z.string().optional().describe("Filter by brand (e.g.: Toyota, Honda, Yamaha)"),
  tipo: z
    .string()
    .optional()
    .describe("Filter by body/style type (e.g.: Sedan, SUV, Street, Naked)"),
  precioMin: z.number().optional().describe("Minimum price filter"),
  precioMax: z.number().optional().describe("Maximum price filter"),
  anioMin: z.number().optional().describe("Minimum manufacturing year filter"),
  anioMax: z.number().optional().describe("Maximum manufacturing year filter"),
  transmision: z
    .string()
    .optional()
    .describe("Filter by transmission: Manual or Automatico"),
  combustible: z
    .string()
    .optional()
    .describe("Filter by fuel: Nafta, Diesel, Gas, Hibrido, Electrico"),
  agenciaUsername: z
    .string()
    .optional()
    .describe("Filter by agency username to see a specific agency's catalog"),
};

export const metadata: ToolMetadata = {
  name: "list-vehicles",
  description:
    "List all active vehicle listings in Auto Express Hub. All filters are optional. Public endpoint, no authentication required.",
  annotations: {
    title: "List Vehicles",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function handler(args: InferSchema<typeof schema>) {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    const path = queryString ? `/vehicles?${queryString}` : "/vehicles";

    const client = createApiClient();
    const vehicles = await client.get(path);
    return JSON.stringify({ success: true, vehicles });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
