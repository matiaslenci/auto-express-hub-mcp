import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata, type ToolExtraArguments } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
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
  fotos: z
    .array(
      z
        .string()
        .regex(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i,
          "Each filename must be a UUID returned by upload-vehicle-image, e.g. 'd2002bf6-2a4c-4e57-bf7a-7d2a742580cb.webp'. Do NOT invent filenames."
        )
    )
    .max(20)
    .optional()
    .describe(
      "Array of photo filenames (optional, max 20). Each filename MUST be a value returned by upload-vehicle-image (UUID .webp format). NEVER invent filenames."
    ),
  activo: z.boolean().optional().describe("Whether the listing is active (optional)"),
};

export const metadata: ToolMetadata = {
  name: "update-vehicle",
  description:
    "Update an existing vehicle listing. Only the owner agency can update. Send only the fields you want to change — all fields are optional. " +
    "IMPORTANT: 'fotos' only accepts filenames returned by upload-vehicle-image (UUID format). If the user attached new images, call upload-vehicle-image first for each one. Never invent descriptive filenames.",
  annotations: {
    title: "Update Vehicle Listing",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function handler(
  args: InferSchema<typeof schema>,
  extra: ToolExtraArguments
) {
  const backendJwt = extra.authInfo?.extra?.backendJwt as string | undefined;
  if (!backendJwt) {
    return JSON.stringify({
      success: false,
      error: "Autenticación requerida. Conectá tu cuenta de Auto Express Hub desde la página de integración de Claude.",
    });
  }
  const { vehicleId, ...fields } = args;
  try {
    const payload = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    const client = createApiClient({ jwt: backendJwt });
    const vehicle = await client.patch(`/vehicles/${vehicleId}`, payload);
    return JSON.stringify({ success: true, vehicle });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
