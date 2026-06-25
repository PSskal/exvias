ALTER TABLE "DriverProfile"
ADD COLUMN "suspendAfterTrip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspensionReason" TEXT;
