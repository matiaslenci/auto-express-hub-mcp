import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  jwt: z.string().describe("JWT token of the authenticated agency"),
};

export const metadata: ToolMetadata = {
  name: "get-my-vehicles",
  description:
    "Get all vehicle listings belonging to the authenticated agency. Returns both active and inactive listings.",
  annotations: {
    title: "My Agency's Vehicles",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function handler({ jwt }: InferSchema<typeof schema>) {
  try {
    const client = createApiClient({ jwt });
    const vehicles = await client.get("/vehicles/my-vehicles");
    return JSON.stringify({ success: true, vehicles });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
