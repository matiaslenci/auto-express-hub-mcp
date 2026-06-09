import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata, type ToolExtraArguments } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {};

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

export default async function handler(
  _args: InferSchema<typeof schema>,
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
    const vehicles = await client.get("/vehicles/my-vehicles");
    return JSON.stringify({ success: true, vehicles });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
