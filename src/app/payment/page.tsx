import { notFound } from "next/navigation";
import { CreditCard, LockKeyhole } from "lucide-react";
import {
  getBookingDetails,
  getTripDetails,
  getTripBookingOptions,
} from "@/lib/exvias/trips";
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
import { StatusBadge } from "@/components/exvias/status-badge";
import { PaymentProofForm } from "@/components/exvias/payment-proof-form";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    bookingId?: string;
    tripId?: string;
    boardingPointId?: string;
    passengerName?: string;
    passengerPhone?: string;
  }>;
}) {
  const params = await searchParams;

  const existingBooking = params.bookingId
    ? await getBookingDetails(params.bookingId)
    : null;

  if (params.bookingId && !existingBooking) notFound();

  const tripId = existingBooking?.trip.id ?? params.tripId;
  const boardingPointId =
    existingBooking?.boardingPoint.id ?? params.boardingPointId;

  if (!tripId || !boardingPointId) notFound();

  const [tripDetails, bookingOptions] = await Promise.all([
    getTripDetails(tripId),
    getTripBookingOptions(tripId).catch(() => null),
  ]);

  if (!tripDetails || !bookingOptions) notFound();

  const boardingPoint =
    existingBooking?.boardingPoint ??
    bookingOptions.points.find((point) => point.id === boardingPointId);

  if (!boardingPoint) notFound();

  const passengerName = existingBooking?.passengerName ?? params.passengerName;
  const passengerPhone = existingBooking?.passengerPhone ?? params.passengerPhone;

  if (!existingBooking && (!passengerName || !passengerPhone)) notFound();

  const driver = tripDetails.driver;
  const yapePhone = driver?.yapePhone ?? driver?.phone;
  const yapeName = driver?.yapeName ?? driver?.user.name;
  const canSubmitProof = Boolean(yapePhone && yapeName);
  const paymentAmount =
    existingBooking?.payment?.amountPen ?? tripDetails.route.depositPen;

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader
        title="Pago de reserva"
        href={`/trip/${tripDetails.id}`}
        subtitle="Adelanto por Yape"
      />
      <ContentArea className="space-y-4">
        <AppCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500">Ruta</p>
              <p className="mt-1 font-black text-[#073FEA]">
                {routeDirectionLabels[tripDetails.direction]}
              </p>
            </div>
            {existingBooking?.payment ? (
              <StatusBadge value={existingBooking.payment.status} />
            ) : (
              <span className="rounded-full bg-[#F4B400]/15 px-3 py-1 text-xs font-black text-[#B37B00]">
                Falta captura
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500">Turno</p>
              <p className="font-black">
                {formatTime(tripDetails.plannedDepartureAt)} (
                {tripDetails.turnLabel})
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Punto de subida</p>
              <p className="font-black">{boardingPoint.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Pasajero</p>
              <p className="font-black">{passengerName}</p>
              <p className="text-xs font-semibold text-slate-500">
                {passengerPhone}
              </p>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span>Precio total</span>
              <strong>{formatPen(tripDetails.route.farePen)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-[10px] bg-[#F4B400]/18 px-3 py-3">
              <span className="font-black text-[#B37B00]">Adelanto (50%)</span>
              <strong className="text-xl text-[#F4B400]">
                {formatPen(paymentAmount)}
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
              <p className="text-lg font-black">
                {yapePhone ?? "Yape no configurado"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {yapeName ?? "Conductor pendiente"}
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-1 text-sm text-slate-700">
            <li>1. Realiza el pago del adelanto.</li>
            <li>2. Sube la captura del comprobante.</li>
            <li>3. Recién al subir la captura se guarda tu asiento.</li>
          </ol>

          {!canSubmitProof && (
            <p className="mt-4 rounded-[10px] bg-[#E53935]/10 p-3 text-xs font-bold text-[#E53935]">
              Este conductor aún no tiene Yape configurado. Pide a EXVIASS que
              lo complete antes de pagar.
            </p>
          )}
          <PaymentProofForm
            bookingId={existingBooking?.id}
            tripId={existingBooking ? undefined : tripDetails.id}
            boardingPointId={existingBooking ? undefined : boardingPoint.id}
            passengerName={existingBooking ? undefined : passengerName}
            passengerPhone={existingBooking ? undefined : passengerPhone}
            disabled={!canSubmitProof}
          />
        </AppCard>

        <p className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <LockKeyhole className="size-3" />
          Tu pago está 100% seguro
        </p>
      </ContentArea>
    </PhoneShell>
  );
}
