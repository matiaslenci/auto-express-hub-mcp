import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata } from "xmcp";

const BASE_URL = process.env.AUTO_EXPRESS_HUB_API_URL ?? "http://localhost:3000";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS_PER_VEHICLE = 20;

export const schema = {
  jwt: z
    .string()
    .describe("JWT token of the agency (obtained from login in Auto Express Hub)"),
  imageBase64: z
    .string()
    .min(1)
    .describe(
      "The image file content encoded as base64. The 'data:<mime>;base64,' prefix is accepted but optional. Decoded size must be <= 10 MB."
    ),
  mimeType: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .describe("MIME type of the source image. The backend re-encodes everything to .webp."),
};

export const metadata: ToolMetadata = {
  name: "upload-vehicle-image",
  description:
    "Upload ONE vehicle image and get back a filename to pass later in the 'fotos' array of create-vehicle or update-vehicle. " +
    "Each call uploads a single image — for multiple photos, call this tool once per image. " +
    `IMPORTANT: a vehicle listing supports at most ${MAX_PHOTOS_PER_VEHICLE} photos. ` +
    "If the user wants to upload more than 5 images in a single request, STOP and confirm with them before proceeding (each upload consumes bandwidth and tokens). " +
    `Never upload more than ${MAX_PHOTOS_PER_VEHICLE} images for the same vehicle.`,
  annotations: {
    title: "Upload Vehicle Image",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function handler({
  jwt,
  imageBase64,
  mimeType,
}: InferSchema<typeof schema>) {
  try {
    const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleaned, "base64");

    if (buffer.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Invalid base64 input — decoded to 0 bytes.",
      });
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      return JSON.stringify({
        success: false,
        error: `Image too large (${sizeMB} MB). Maximum is 10 MB.`,
      });
    }

    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), `upload.${ext}`);

    const res = await fetch(`${BASE_URL}/uploads/vehicle-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status}: ${errorText}`);
    }

    const { filename } = (await res.json()) as { filename: string };

    return JSON.stringify({
      success: true,
      filename,
      hint: `Add this filename to the 'fotos' array of create-vehicle or update-vehicle. Reminder: max ${MAX_PHOTOS_PER_VEHICLE} photos per vehicle.`,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
