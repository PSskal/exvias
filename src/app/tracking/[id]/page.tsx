import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusFront,
  Check,
  Clock,
  MapPin,
  Phone,
  Star,
  UserRound,
} from "lucide-react";
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

export const dynamic = "force-dynamic";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingDetails(id);

  if (!booking) notFound();

  const pickupTime = booking.trip.plannedDepartureAt
    ? new Date(
        booking.trip.plannedDepartureAt.getTime() +
          booking.boardingPoint.minuteOffset * 60_000,
      )
    : null;

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader title="Detalle del viaje" href="/my-trips" subtitle="Estado de tu reserva" />
      <ContentArea className="space-y-4">
        {booking.payment?.status === "SUBMITTED" || booking.payment?.status === "APPROVED" ? (
          <section className="rounded-[18px] bg-[#12B85F] px-5 py-7 text-center text-white shadow-lg">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-white text-[#12B85F]">
              <Check className="size-9 stroke-[3]" />
            </div>
            <h1 className="mt-4 text-xl font-black">¡Tu viaje está reservado!</h1>
            <p className="text-sm text-white/85">Gracias por tu reserva</p>
          </section>
        ) : null}

        <AppCard>
          <div className="rounded-[10px] bg-[#2ECC71]/12 p-3">
            <p className="text-xs font-bold text-slate-500">Estado actual</p>
            <p className="text-2xl font-black text-[#12B85F]">
              {booking.trip.status === "ACTIVE" ? "En camino" : "Reservado"}
            </p>
            <p className="text-sm text-slate-600">
              El vehículo se dirige a tu punto de subida.
            </p>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <InfoRow icon={<BusFront className="size-5" />} label="Ruta">
              <strong className="text-[#073FEA]">
                {routeDirectionLabels[booking.trip.direction]}
              </strong>
            </InfoRow>
            <InfoRow icon={<MapPin className="size-5" />} label="Punto de subida">
              <strong>{booking.boardingPoint.name}</strong>
            </InfoRow>
            <InfoRow icon={<Clock className="size-5" />} label="Hora estimada de paso">
              <strong>{formatTime(pickupTime)}</strong>
            </InfoRow>
            <InfoRow icon={<Clock className="size-5" />} label="Saldo al abordar">
              <strong>{formatPen(booking.amountDuePen)}</strong>
            </InfoRow>
            <InfoRow icon={<BusFront className="size-5" />} label="Vehículo">
              <strong>{booking.trip.driver?.licensePlate ?? "Por asignar"}</strong>
            </InfoRow>
            <InfoRow icon={<UserRound className="size-5" />} label="Conductor">
              <div className="flex items-center gap-2">
                <strong>{booking.trip.driver?.user.name ?? "Por asignar"}</strong>
                {booking.trip.driver && (
                  <span className="inline-flex items-center gap-1 text-sm font-black">
                    4.8 <Star className="size-4 fill-[#F4B400] text-[#F4B400]" />
                  </span>
                )}
              </div>
            </InfoRow>
          </div>
        </AppCard>

        <div className="grid gap-3">
          <Button asChild className="h-12 rounded-[10px] bg-[#073FEA] text-base font-black">
            <Link href="/my-trips">Ver mis viajes</Link>
          </Button>
          <Button variant="outline" className="h-12 rounded-[10px] text-base font-black">
            <Phone className="size-4" />
            Contactar conductor
          </Button>
        </div>
      </ContentArea>
    </PhoneShell>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-3">
      <div className="text-slate-500">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
