import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusFront,
  Check,
  Clock3,
  CreditCard,
  MapPin,
  Phone,
  Route,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  PaymentStatus,
  TripStatus,
} from "@/lib/generated/prisma/client";
import {
  formatPen,
  formatTime,
  getVehicleOption,
  passengerReservationStatus,
  routeDirectionLabels,
  tripStatusLabels,
} from "@/lib/exvias/constants";
import { getBookingDetails } from "@/lib/exvias/trips";
import {
  AppCard,
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
} from "@/components/exvias/mobile-shell";
import { StatusBadge } from "@/components/exvias/status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function tripPassengerMessage(status: TripStatus) {
  if (status === TripStatus.BOARDING) {
    return {
      title: "Embarque iniciado",
      detail: "Prepárate en tu punto de subida.",
      step: 2,
    };
  }

  if (status === TripStatus.DEPARTED) {
    return {
      title: "Vehículo en ruta",
      detail: "Mantente atento a la llamada del conductor.",
      step: 3,
    };
  }

  if (status === TripStatus.COMPLETED) {
    return {
      title: "Viaje completado",
      detail: "Gracias por viajar con EXVIASS.",
      step: 4,
    };
  }

  return {
    title: "Turno programado",
    detail: "Tu conductor todavía está organizando la salida.",
    step: 1,
  };
}

function statusToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "bg-[#2ECC71] text-white";
  if (tone === "danger") return "bg-[#E53935] text-white";
  if (tone === "neutral") return "bg-slate-950 text-white";
  return "bg-[#F4B400] text-white";
}

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
  const reservationStatus = passengerReservationStatus({
    bookingStatus: booking.status,
    paymentStatus: booking.payment?.status,
  });
  const tripMessage = tripPassengerMessage(booking.trip.status);
  const driver = booking.trip.driver;
  const vehicle = getVehicleOption(driver?.vehicleName);
  const paidAmount = Number(booking.payment?.amountPen ?? 0);
  const fare = Number(booking.trip.route.farePen);
  const dueOnBoarding = Math.max(0, fare - paidAmount);
  const canCallDriver = Boolean(driver?.phone || driver?.yapePhone);
  const driverPhone = driver?.phone ?? driver?.yapePhone;
  const paymentRejected = booking.payment?.status === PaymentStatus.REJECTED;
  const paymentApproved = booking.payment?.status === PaymentStatus.APPROVED;

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader
        title="Seguimiento"
        href="/my-trips"
        subtitle="Estado de tu reserva"
      />
      <ContentArea withBottomNav className="space-y-4">
        <section
          className={`overflow-hidden rounded-[20px] px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.12)] ${statusToneClass(
            reservationStatus.tone,
          )}`}
        >
          <div className="flex items-start gap-4">
            <div className="grid size-13 shrink-0 place-items-center rounded-full bg-white/95 text-slate-950">
              {reservationStatus.tone === "danger" ? (
                <XCircle className="size-7 text-[#E53935]" />
              ) : paymentApproved ? (
                <Check className="size-7 text-[#2ECC71]" />
              ) : (
                <Clock3 className="size-7 text-[#B37B00]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide opacity-75">
                Estado actual
              </p>
              <h1 className="mt-1 text-2xl font-black">
                {reservationStatus.title}
              </h1>
              <p className="mt-1 text-sm font-semibold opacity-85">
                {reservationStatus.description}
              </p>
            </div>
          </div>
        </section>

        <AppCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Viaje
              </p>
              <h2 className="mt-1 text-lg font-black">
                {tripMessage.title}
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                {tripMessage.detail}
              </p>
            </div>
            <StatusBadge value={booking.trip.status} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["Reserva", "Embarque", "En ruta", "Cierre"].map(
              (label, index) => {
                const complete = index + 1 <= tripMessage.step;

                return (
                  <div key={label} className="space-y-1">
                    <div
                      className={
                        complete
                          ? "h-2 rounded-full bg-[#1E5BFF]"
                          : "h-2 rounded-full bg-slate-200"
                      }
                    />
                    <p
                      className={
                        complete
                          ? "text-[10px] font-black text-[#1E5BFF]"
                          : "text-[10px] font-bold text-slate-400"
                      }
                    >
                      {label}
                    </p>
                  </div>
                );
              },
            )}
          </div>
        </AppCard>

        <AppCard className="space-y-4">
          <InfoRow icon={<Route className="size-5" />} label="Ruta">
            <strong className="text-[#073FEA]">
              {routeDirectionLabels[booking.trip.direction]}
            </strong>
          </InfoRow>
          <InfoRow icon={<MapPin className="size-5" />} label="Punto de subida">
            <strong>{booking.boardingPoint.name}</strong>
          </InfoRow>
          <InfoRow icon={<Clock3 className="size-5" />} label="Hora estimada">
            <strong>{formatTime(pickupTime)}</strong>
          </InfoRow>
          <InfoRow icon={<BusFront className="size-5" />} label="Turno">
            <strong>
              {formatTime(booking.trip.plannedDepartureAt)} ·{" "}
              {tripStatusLabels[booking.trip.status]}
            </strong>
          </InfoRow>
        </AppCard>

        <AppCard className="overflow-hidden p-0">
          <div className="relative h-28 bg-gradient-to-b from-slate-100 to-white">
            <Image
              src={vehicle.image}
              alt={vehicle.name}
              fill
              sizes="420px"
              className="object-contain p-2"
            />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Conductor
                </p>
                <h2 className="truncate text-lg font-black">
                  {driver?.user.name ?? "Por asignar"}
                </h2>
                <p className="truncate text-sm font-semibold text-slate-500">
                  {driver
                    ? `${vehicle.shortName} · ${driver.licensePlate ?? "Placa pendiente"}`
                    : "EXVIASS asignará el vehículo"}
                </p>
              </div>
              {driver ? (
                <span className="rounded-full bg-[#2ECC71]/12 px-3 py-1 text-xs font-black text-[#1c7c44]">
                  Asignado
                </span>
              ) : null}
            </div>

            {canCallDriver ? (
              <Button asChild className="h-11 w-full rounded-[13px] bg-[#1E5BFF] font-black">
                <a href={`tel:${driverPhone}`}>
                  <Phone className="size-4" />
                  Llamar conductor
                </a>
              </Button>
            ) : (
              <p className="rounded-[12px] bg-[#F5F7FA] p-3 text-sm font-semibold text-slate-500">
                El teléfono del conductor aparecerá cuando esté configurado.
              </p>
            )}
          </div>
        </AppCard>

        <AppCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-[#F4B400]" />
              <h2 className="font-black">Pago</h2>
            </div>
            <StatusBadge value={booking.payment?.status ?? booking.status} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PaymentBox label="Adelanto" value={formatPen(paidAmount)} />
            <PaymentBox label="Al abordar" value={formatPen(dueOnBoarding)} />
          </div>
          <p className="flex items-center gap-2 rounded-[12px] bg-[#F5F7FA] p-3 text-xs font-semibold text-slate-500">
            <ShieldCheck className="size-4 text-[#2ECC71]" />
            El conductor confirma el Yape antes de asegurar el asiento.
          </p>
        </AppCard>

        <div className="grid gap-3">
          {paymentRejected ? (
            <Button asChild className="h-12 rounded-[14px] bg-[#E53935] text-base font-black hover:bg-[#d12f2f]">
              <Link href={`/payment?bookingId=${booking.id}`}>
                Subir nueva captura
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="h-12 rounded-[14px] text-base font-black">
            <Link href="/my-trips">Ver mis viajes</Link>
          </Button>
        </div>
      </ContentArea>
      <BottomNav active="my" />
    </PhoneShell>
  );
}

function PaymentBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[#F5F7FA] p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
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
    <div className="grid grid-cols-[36px_1fr] gap-3">
      <div className="grid size-9 place-items-center rounded-xl bg-[#1E5BFF]/10 text-[#073FEA]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <div className="mt-0.5 truncate text-sm">{children}</div>
      </div>
    </div>
  );
}
