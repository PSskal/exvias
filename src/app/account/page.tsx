import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import {
  AppCard,
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
} from "@/components/exvias/mobile-shell";
import { SignOutButton } from "@/components/exvias/sign-out-button";

export const dynamic = "force-dynamic";

const roleLabels = {
  PASSENGER: "Pasajero",
  DRIVER: "Conductor",
  ADMIN: "Administrador",
} as const;

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader title="Mi cuenta" subtitle="Perfil EXVIASS" />
      <ContentArea withBottomNav className="space-y-4">
        {user ? <SignedInAccount user={user} /> : <GuestAccount />}
      </ContentArea>
      <BottomNav active="account" />
    </PhoneShell>
  );
}

function SignedInAccount({
  user,
}: {
  user: {
    name?: string | null;
    email: string;
    role?: keyof typeof roleLabels;
  };
}) {
  return (
    <>
      <AppCard className="bg-[#073FEA] text-white">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/15">
            <CircleUserRound className="size-10" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-white/70">
              Cuenta activa
            </p>
            <h1 className="truncate text-2xl font-black">
              {user.name ?? "Pasajero EXVIASS"}
            </h1>
            <p className="mt-1 truncate text-sm font-semibold text-white/75">
              {user.email}
            </p>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <div className="space-y-3">
          <AccountFact icon={<Mail className="size-4" />} label="Correo">
            {user.email}
          </AccountFact>
          <AccountFact icon={<ShieldCheck className="size-4" />} label="Tipo de cuenta">
            {roleLabels[user.role ?? "PASSENGER"]}
          </AccountFact>
        </div>
      </AppCard>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">
          Accesos rápidos
        </h2>
        <AccountLink
          href="/my-trips"
          icon={<CalendarDays className="size-5" />}
          title="Mis viajes"
          description="Revisa tus reservas y estados de pago"
        />
      </section>

      <SignOutButton />
    </>
  );
}

function GuestAccount() {
  return (
    <>
      <AppCard className="space-y-4 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#1E5BFF]/10 text-[#073FEA]">
          <CircleUserRound className="size-8" />
        </div>
        <div>
          <h1 className="text-xl font-black">Aún no has iniciado sesión</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Puedes ver turnos sin cuenta. Para reservar, guardar viajes y subir pagos necesitas ingresar.
          </p>
        </div>
      </AppCard>

      <div className="grid gap-3">
        <Link
          href="/login?callbackURL=/account"
          className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#073FEA] text-sm font-black text-white"
        >
          <LogIn className="size-4" />
          Iniciar sesión
        </Link>
        <Link
          href="/signup?callbackURL=/account"
          className="flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#073FEA]/25 bg-white text-sm font-black text-[#073FEA]"
        >
          <UserPlus className="size-4" />
          Crear cuenta
        </Link>
      </div>
    </>
  );
}

function AccountFact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="truncate text-sm font-black">{children}</p>
      </div>
    </div>
  );
}

function AccountLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[14px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-[#1E5BFF]/10 text-[#073FEA]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black">{title}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{description}</p>
      </div>
      <ChevronRight className="size-5 text-slate-300" />
    </Link>
  );
}
