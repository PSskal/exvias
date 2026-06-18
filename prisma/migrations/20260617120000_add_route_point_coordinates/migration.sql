-- Add coordinates for drawing route pickup maps.
ALTER TABLE "RoutePoint" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "RoutePoint" ADD COLUMN "longitude" DOUBLE PRECISION;
