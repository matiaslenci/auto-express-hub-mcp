import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  jwt: z.string().describe("JWT token of the agency that owns the vehicle"),
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

export default async function handler({ jwt, vehicleId }: InferSchema<typeof schema>) {
  try {
    const client = createApiClient({ jwt });
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
