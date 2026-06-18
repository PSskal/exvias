"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { submitPaymentProofAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentProofForm({
  bookingId,
  tripId,
  boardingPointId,
  passengerName,
  passengerPhone,
  disabled,
}: {
  bookingId?: string;
  tripId?: string;
  boardingPointId?: string;
  passengerName?: string;
  passengerPhone?: string;
  disabled: boolean;
}) {
  const [fileName, setFileName] = useState("");

  return (
    <form action={submitPaymentProofAction} className="mt-4 space-y-3">
      {bookingId ? <input type="hidden" name="bookingId" value={bookingId} /> : null}
      {tripId ? <input type="hidden" name="tripId" value={tripId} /> : null}
      {boardingPointId ? (
        <input type="hidden" name="boardingPointId" value={boardingPointId} />
      ) : null}
      {passengerName ? (
        <input type="hidden" name="passengerName" value={passengerName} />
      ) : null}
      {passengerPhone ? (
        <input type="hidden" name="passengerPhone" value={passengerPhone} />
      ) : null}
      <input type="hidden" name="proofUrl" value={fileName} />
      <div className="space-y-2">
        <Label htmlFor="proofFile">Captura obligatoria</Label>
        <Input
          id="proofFile"
          type="file"
          accept="image/*"
          required
          disabled={disabled}
          onChange={(event) => {
            setFileName(event.currentTarget.files?.[0]?.name ?? "");
          }}
          className="h-11 rounded-[10px] bg-slate-50"
        />
      </div>
      <Button
        className="h-12 w-full rounded-[10px] bg-[#12B85F] text-base font-black hover:bg-[#10a957]"
        disabled={disabled || !fileName}
      >
        <Upload className="size-4" />
        Ya pagué, subir captura
      </Button>
    </form>
  );
}
