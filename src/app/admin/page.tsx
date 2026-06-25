import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { CarFront, CreditCard, ListOrdered, UsersRound } from "lucide-react";
import { approvePaymentAction } from "@/app/actions";
import { formatPen } from "@/lib/exvias/constants";
import { getAdminDashboard } from "@/lib/exvias/trips";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageToast } from "@/components/exvias/page-toast";
import { StatusBadge } from "@/components/exvias/status-badge";

export const dynamic = "force-dynamic";

const adminToastTypes = [
  "driverEnabled",
  "driverDisabled",
  "driverReenabled",
  "driverBusy",
  "driverSuspendAfterTrip",
  "driverTripCancelled",
  "driverTripReassigned",
  "driverReassignBlocked",
] as const;

function getAdminToastType(value?: string) {
  return adminToastTypes.find((type) => type === value) ?? null;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/admin");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") redirect("/account");

  const { trips, payments, drivers, metrics } = await getAdminDashboard();
  const publishedTrips = trips.filter((trip) => trip.driver);
  const activeDrivers = drivers.filter((driver) => driver.isActive);
  const incompleteDrivers = drivers.filter(
    (driver) =>
      !driver.phone ||
      !driver.yapePhone ||
      !driver.yapeName ||
      !driver.licensePlate ||
      !driver.vehicleName,
  );

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 pb-10 pt-5 text-zinc-950 sm:px-6">
      <PageToast type={getAdminToastType(params.admin)} />
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1E5BFF]">EXVIASS S.A.</p>
            <h1 className="text-3xl font-black tracking-tight">
              Operaciones del dia
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-500">
              Control rapido de rampa, pagos y estado general. La gestion de
              conductores vive en su propia pestana.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <AdminTab href="/admin" label="Resumen" active />
            <AdminTab href="/admin/schedule" label="Rampa" />
            <AdminTab href="/admin/conductores" label="Conductores" />
          </nav>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Viajes hoy" value={String(metrics.todayTrips)} />
          <MetricCard
            label="Ingreso estimado"
            value={formatPen(metrics.revenueEstimate)}
          />
          <MetricCard
            label="Ocupacion"
            value={`${Math.round(metrics.occupancy * 100)}%`}
          />
          <MetricCard
            label="Publicados"
            value={String(publishedTrips.length)}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <section className="grid gap-5 md:grid-cols-2">
            <ActionCard
              icon={<ListOrdered className="size-5" />}
              title="Rampa"
              description="Ordena por llegada y publica el siguiente turno visible para pasajeros."
              href="/admin/schedule"
              cta="Gestionar rampa"
            />
            <ActionCard
              icon={<UsersRound className="size-5" />}
              title="Conductores"
              description={`${activeDrivers.length} activos · ${incompleteDrivers.length} con datos pendientes.`}
              href="/admin/conductores"
              cta="Abrir conductores"
            />

            <Card className="rounded-[8px] md:col-span-2">
              <CardHeader>
                <CardTitle>Turnos publicados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {publishedTrips.length === 0 ? (
                  <p className="rounded-[8px] bg-zinc-50 p-3 text-sm font-semibold text-zinc-500">
                    Todavia no hay turnos publicados para pasajeros.
                  </p>
                ) : (
                  publishedTrips.slice(0, 6).map((trip) => (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between gap-3 rounded-[8px] bg-zinc-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {trip.turnLabel} - {trip.driver?.user.name}
                        </p>
                        <p className="truncate text-xs font-semibold text-zinc-500">
                          {trip.bookings.length}/{trip.route.capacity} pasajeros
                        </p>
                      </div>
                      <StatusBadge value={trip.status} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <aside>
            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-5 text-[#F4B400]" />
                  Pagos pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.length === 0 ? (
                  <p className="rounded-[8px] bg-zinc-50 p-3 text-sm font-semibold text-zinc-500">
                    Sin pagos pendientes.
                  </p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="rounded-[8px] bg-zinc-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {payment.booking.passengerName}
                          </p>
                          <p className="text-sm font-semibold text-zinc-500">
                            {formatPen(payment.amountPen)}
                          </p>
                          <p className="text-xs font-semibold text-zinc-500">
                            Conductor:{" "}
                            {payment.booking.trip.driver?.user.name ??
                              "Sin asignar"}
                          </p>
                        </div>
                        <StatusBadge value={payment.status} />
                      </div>
                      {payment.status === "SUBMITTED" ? (
                        <form action={approvePaymentAction} className="mt-3">
                          <input
                            type="hidden"
                            name="paymentId"
                            value={payment.id}
                          />
                          <Button className="h-10 w-full rounded-[8px]">
                            Aprobar como admin
                          </Button>
                        </form>
                      ) : (
                        <p className="mt-3 rounded-[8px] bg-white p-2 text-xs font-semibold text-zinc-500">
                          Esperando captura del pasajero.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}

function AdminTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex h-10 items-center rounded-[8px] bg-[#1E5BFF] px-4 text-sm font-black text-white"
          : "inline-flex h-10 items-center rounded-[8px] bg-white px-4 text-sm font-black text-zinc-600 ring-1 ring-zinc-200"
      }
    >
      {label}
    </Link>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="rounded-[8px]">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-[8px] bg-[#1E5BFF]/10 text-[#1E5BFF]">
            {icon}
          </span>
          <div>
            <p className="text-lg font-black">{title}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-500">
              {description}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-zinc-950 px-4 text-sm font-black text-white"
        >
          <CarFront className="size-4" />
          {cta}
        </Link>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[8px]" size="sm">
      <CardContent>
        <p className="text-sm font-semibold text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
