-- Las alertas de ruta no dependen del sentido de viaje: es el mismo camino
-- físico, así que un control/operativo aplica a ambas direcciones.
DROP INDEX "RouteAlert_routeId_direction_expiresAt_idx";

ALTER TABLE "RouteAlert" DROP COLUMN "direction";

CREATE INDEX "RouteAlert_routeId_expiresAt_idx" ON "RouteAlert"("routeId", "expiresAt");
