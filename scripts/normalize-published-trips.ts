import "dotenv/config";
import { normalizePublishedTrips } from "../src/lib/exvias/trips";
import prisma from "../src/lib/prisma";

async function main() {
  await normalizePublishedTrips();
  console.log("Turnos publicados normalizados.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
