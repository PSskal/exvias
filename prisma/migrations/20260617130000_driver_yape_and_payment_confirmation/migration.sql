ALTER TABLE "DriverProfile" ADD COLUMN "yapePhone" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "yapeName" TEXT;

ALTER TABLE "Payment" ADD COLUMN "confirmedByDriverId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "confirmedByDriverAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "rejectedReason" TEXT;

CREATE INDEX "Payment_confirmedByDriverId_idx" ON "Payment"("confirmedByDriverId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedByDriverId_fkey" FOREIGN KEY ("confirmedByDriverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
