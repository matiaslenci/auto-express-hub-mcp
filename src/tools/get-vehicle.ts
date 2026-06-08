import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  vehicleId: z.string().uuid().describe("The vehicle's unique identifier (UUID)"),
};

export const metadata: ToolMetadata = {
  name: "get-vehicle",
  description:
    "Get detailed information about a specific vehicle by its ID. Public endpoint, no authentication required.",
  annotations: {
    title: "Get Vehicle Details",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function handler({ vehicleId }: InferSchema<typeof schema>) {
  try {
    const client = createApiClient();
    const vehicle = await client.get(`/vehicles/${vehicleId}`);
    return JSON.stringify({ success: true, vehicle });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
