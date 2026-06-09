import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata, type ToolExtraArguments } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  vehicleId: z.string().uuid().describe("The vehicle's unique identifier (UUID)"),
};

export const metadata: ToolMetadata = {
  name: "delete-vehicle",
  description:
    "Permanently delete a vehicle listing. Only the owner agency can delete. This action cannot be undone.",
  annotations: {
    title: "Delete Vehicle Listing",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
};

export default async function handler(
  { vehicleId }: InferSchema<typeof schema>,
  extra: ToolExtraArguments
) {
  const backendJwt = extra.authInfo?.extra?.backendJwt as string | undefined;
  if (!backendJwt) {
    return JSON.stringify({
      success: false,
      error: "Autenticación requerida. Conectá tu cuenta de Auto Express Hub desde la página de integración de Claude.",
    });
  }
  try {
    const client = createApiClient({ jwt: backendJwt });
    await client.delete(`/vehicles/${vehicleId}`);
    return JSON.stringify({
      success: true,
      message: `Vehicle ${vehicleId} deleted successfully`,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
