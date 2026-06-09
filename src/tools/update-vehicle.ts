import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  jwt: z.string().describe("JWT token of the agency that owns the vehicle"),
  vehicleId: z.string().uuid().describe("The vehicle's unique identifier (UUID)"),
  marca: z.string().optional().describe("Vehicle brand (optional)"),
  tipoVehiculo: z
    .enum(["AUTO", "MOTO"])
    .optional()
    .describe("Vehicle category: AUTO or MOTO (optional)"),
  modelo: z.string().optional().describe("Vehicle model (optional)"),
  anio: z
    .number()
    .int()
    .min(1990)
    .max(2026)
    .optional()
    .describe("Manufacturing year 1990-2026 (optional)"),
  precio: z.number().optional().describe("Price (optional)"),
  moneda: z
    .enum(["ARS", "USD", "CONSULTAR"])
    .optional()
    .describe("Currency: ARS, USD, or CONSULTAR (optional)"),
  tipo: z.string().optional().describe("Body/style type (optional)"),
  transmision: z.string().optional().describe("Transmission: Manual or Automatico (optional)"),
  combustible: z.string().optional().describe("Fuel type (optional)"),
  kilometraje: z.number().int().min(0).optional().describe("Odometer in kilometers (optional)"),
  color: z.string().optional().describe("Vehicle color (optional)"),
  descripcion: z.string().optional().describe("Vehicle description (optional)"),
  localidad: z.string().optional().describe("City or province (optional)"),
  fotos: z.array(z.string()).max(20).optional().describe("Array of photo filenames .webp (optional, max 20). Get filenames by calling upload-vehicle-image first."),
  activo: z.boolean().optional().describe("Whether the listing is active (optional)"),
};

export const metadata: ToolMetadata = {
  name: "update-vehicle",
  description:
    "Update an existing vehicle listing. Only the owner agency can update. Send only the fields you want to change — all fields are optional.",
  annotations: {
    title: "Update Vehicle Listing",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function handler(args: InferSchema<typeof schema>) {
  const { jwt, vehicleId, ...fields } = args;
  try {
    const payload = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    const client = createApiClient({ jwt });
    const vehicle = await client.patch(`/vehicles/${vehicleId}`, payload);
    return JSON.stringify({ success: true, vehicle });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
