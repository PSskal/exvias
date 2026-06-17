import { notFound } from "next/navigation";
import { CreditCard, LockKeyhole, Upload } from "lucide-react";
import { submitPaymentProofAction } from "@/app/actions";
import { getBookingDetails } from "@/lib/exvias/trips";
import {
  formatPen,
  formatTime,
  routeDirectionLabels,
} from "@/lib/exvias/constants";
import {
  BlueHeader,
  ContentArea,
  PhoneShell,
  StatusBar,
  AppCard,
} from "@/components/exvias/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/exvias/status-badge";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;
  if (!bookingId) notFound();

  const booking = await getBookingDetails(bookingId);
  if (!booking) notFound();

  const yapePhone = process.env.YAPE_PHONE ?? "Configura YAPE_PHONE";
  const yapeName = process.env.YAPE_NAME ?? "EXVIASS S.A.";

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader title="Pago de reserva" href={`/trip/${booking.trip.id}`} subtitle="Adelanto por Yape" />
      <ContentArea className="space-y-4">
        <AppCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500">Ruta</p>
              <p className="mt-1 font-black text-[#073FEA]">
                {routeDirectionLabels[booking.trip.direction]}
              </p>
            </div>
            {booking.payment && <StatusBadge value={booking.payment.status} />}
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500">Turno</p>
              <p className="font-black">
                {formatTime(booking.trip.plannedDepartureAt)} ({booking.trip.turnLabel})
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Punto de subida</p>
              <p className="font-black">{booking.boardingPoint.name}</p>
            </div>
            <div className="flex justify-between">
              <span>Pasajeros</span>
              <strong>1 pasajero</strong>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span>Precio total</span>
              <strong>{formatPen(booking.trip.route.farePen)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-[10px] bg-[#F4B400]/18 px-3 py-3">
              <span className="font-black text-[#B37B00]">Adelanto (50%)</span>
              <strong className="text-xl text-[#F4B400]">
                {formatPen(booking.payment?.amountPen ?? booking.trip.route.depositPen)}
              </strong>
            </div>
          </div>
        </AppCard>

        <AppCard>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-[#073FEA]" />
            <h2 className="font-black">Método de pago</h2>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[10px] bg-slate-50 p-3">
            <div className="grid size-12 place-items-center rounded-full bg-[#1E5BFF]/10 text-lg font-black text-[#073FEA]">
              Y
            </div>
            <div>
              <p className="text-lg font-black">{yapePhone}</p>
              <p className="text-xs font-semibold text-slate-500">{yapeName}</p>
            </div>
          </div>

          <ol className="mt-4 space-y-1 text-sm text-slate-700">
            <li>1. Realiza el pago del adelanto.</li>
            <li>2. Sube la captura o registra el código de operación.</li>
          </ol>

          <form action={submitPaymentProofAction} className="mt-4 space-y-3">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div className="space-y-2">
              <Label htmlFor="proofFile">Captura</Label>
              <Input
                id="proofFile"
                name="proofFile"
                type="file"
                accept="image/*"
                className="h-11 rounded-[10px] bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proofUrl">Código de operación</Label>
              <Input
                id="proofUrl"
                name="proofUrl"
                placeholder="Ej. 982341"
                className="h-11 rounded-[10px] bg-slate-50"
              />
            </div>
            <Button className="h-12 w-full rounded-[10px] bg-[#12B85F] text-base font-black hover:bg-[#10a957]">
              <Upload className="size-4" />
              Ya pagué, subir captura
            </Button>
          </form>
        </AppCard>

        <p className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <LockKeyhole className="size-3" />
          Tu pago está 100% seguro
        </p>
      </ContentArea>
    </PhoneShell>
  );
}
