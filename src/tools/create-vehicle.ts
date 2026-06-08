import { z } from "zod/v4";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { createApiClient } from "../lib/api-client";

export const schema = {
  jwt: z.string().describe("JWT token of the agency (obtained from login in Auto Express Hub)"),
  marca: z
    .string()
    .describe(
      "Vehicle brand. AUTO options: Toyota, Volkswagen, Fiat, Renault, Peugeot, Ford, Chevrolet, Citroën, Jeep, Nissan, BAIC, Mercedes-Benz, Hyundai, Kia, Honda, Audi, BMW, Mitsubishi, Subaru, Land Rover, Jaguar, Volvo, Suzuki, Chery, GWM, Dodge, Mini, Tesla, Otro. MOTO options: Honda, Yamaha, Suzuki, Kawasaki, Bajaj, Zanella, Motomel, Corven, Gilera, Beta, Benelli, Royal Enfield, KTM, Ducati, Harley-Davidson, BMW, Triumph, TVS, CF Moto, Kymco, Voge, Otro"
    ),
  tipoVehiculo: z.enum(["AUTO", "MOTO"]).describe("Vehicle category: AUTO or MOTO"),
  modelo: z.string().describe("Vehicle model. E.g.: Corolla, Civic, Sandero, CBR600"),
  anio: z.number().int().min(1990).max(2026).describe("Manufacturing year, between 1990 and 2026"),
  precio: z
    .number()
    .optional()
    .describe("Price as a number. Omit this field if moneda is CONSULTAR"),
  moneda: z
    .enum(["ARS", "USD", "CONSULTAR"])
    .describe("Currency: ARS (Argentine pesos), USD (dollars), or CONSULTAR (price on request)"),
  tipo: z
    .string()
    .describe(
      "Body/style type. For AUTO: Sedan, SUV, Pickup, Hatchback, Coupe, Van. For MOTO: Street, Naked, Deportiva, Touring, Enduro, Cross, Custom, Scooter, Trail, Cuatrimoto"
    ),
  transmision: z
    .string()
    .describe("Transmission type: Manual or Automatico"),
  combustible: z
    .string()
    .describe("Fuel type: Nafta, Diesel, Gas, Hibrido, Electrico"),
  kilometraje: z.number().int().min(0).describe("Odometer reading in kilometers"),
  color: z
    .string()
    .describe("Vehicle color: Blanco, Negro, Gris, Plata, Rojo, Azul, Verde, Otro"),
  descripcion: z
    .string()
    .optional()
    .describe("Free text description of the vehicle (optional)"),
  localidad: z
    .string()
    .optional()
    .describe("City or province where the vehicle is located (optional). E.g.: Cordoba, Buenos Aires, Mendoza"),
  fotos: z
    .array(z.string())
    .optional()
    .describe("Array of photo filenames in .webp format (optional). E.g.: [\"photo1.webp\", \"photo2.webp\"]"),
  activo: z
    .boolean()
    .optional()
    .describe("Whether the listing should be active and visible (default: true)"),
};

export const metadata: ToolMetadata = {
  name: "create-vehicle",
  description:
    "Create a new vehicle listing in Auto Express Hub. Use the vehicle-options resource to get valid values before calling this tool.",
  annotations: {
    title: "Create Vehicle Listing",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function handler(args: InferSchema<typeof schema>) {
  const { jwt, ...vehicleData } = args;
  try {
    const client = createApiClient({ jwt });
    const vehicle = await client.post("/vehicles", vehicleData);
    return JSON.stringify({ success: true, vehicle });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
