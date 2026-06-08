import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  name: "vehicle-options",
  title: "Vehicle Valid Options",
  description:
    "All valid options for vehicle fields: brands by category, body types, colors, fuels, transmissions, and currencies. Read this resource before creating or updating a vehicle to ensure correct values.",
};

const MARCAS_AUTO = [
  "Toyota", "Volkswagen", "Fiat", "Renault", "Peugeot", "Ford", "Chevrolet",
  "Citroën", "Jeep", "Nissan", "BAIC", "Mercedes-Benz", "Hyundai", "Kia",
  "Honda", "Audi", "BMW", "Mitsubishi", "Subaru", "Land Rover", "Jaguar",
  "Volvo", "Suzuki", "Chery", "GWM", "Dodge", "Mini", "Tesla",
  "Jaguar Land Rover", "Otro",
];

const MARCAS_MOTO = [
  "Honda", "Yamaha", "Suzuki", "Kawasaki", "Bajaj", "Zanella", "Motomel",
  "Corven", "Gilera", "Beta", "Benelli", "Royal Enfield", "KTM", "Ducati",
  "Harley-Davidson", "BMW", "Triumph", "TVS", "CF Moto", "Kymco", "Voge", "Otro",
];

const TIPOS_AUTO = ["Sedan", "SUV", "Pickup", "Hatchback", "Coupe", "Van"];
const TIPOS_MOTO = [
  "Street", "Naked", "Deportiva", "Touring", "Enduro",
  "Cross", "Custom", "Scooter", "Trail", "Cuatrimoto",
];
const TRANSMISIONES = ["Manual", "Automatico"];
const COMBUSTIBLES = ["Nafta", "Diesel", "Gas", "Hibrido", "Electrico"];
const COLORES = ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul", "Verde", "Otro"];
const MONEDAS = ["ARS", "USD", "CONSULTAR"];

export default function handler() {
  return JSON.stringify(
    {
      tiposVehiculo: ["AUTO", "MOTO"],
      marcas: {
        AUTO: MARCAS_AUTO,
        MOTO: MARCAS_MOTO,
      },
      tipos: {
        AUTO: TIPOS_AUTO,
        MOTO: TIPOS_MOTO,
      },
      transmisiones: TRANSMISIONES,
      combustibles: COMBUSTIBLES,
      colores: COLORES,
      monedas: MONEDAS,
      anioRange: { min: 1990, max: 2026 },
      notas: [
        "Use marcas.AUTO for tipoVehiculo=AUTO and marcas.MOTO for tipoVehiculo=MOTO.",
        "Use tipos.AUTO for body types when tipoVehiculo=AUTO, tipos.MOTO for tipoVehiculo=MOTO.",
        "If moneda=CONSULTAR, omit the precio field.",
      ],
    },
    null,
    2
  );
}
