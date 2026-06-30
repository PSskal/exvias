-- Alertas temporales sobre la vía (control policial, operativo, accidente, etc.)
-- reportadas por conductores para otros conductores de la misma ruta/dirección.
CREATE TYPE "RouteAlertType" AS ENUM ('CONTROL_POLICIAL', 'OPERATIVO', 'ACCIDENTE', 'TRAFICO', 'OTRO');

CREATE TABLE "RouteAlert" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "direction" "RouteDirection" NOT NULL,
    "type" "RouteAlertType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RouteAlert_routeId_direction_expiresAt_idx" ON "RouteAlert"("routeId", "direction", "expiresAt");

ALTER TABLE "RouteAlert" ADD CONSTRAINT "RouteAlert_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteAlert" ADD CONSTRAINT "RouteAlert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
