import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Home,
  MapPinned,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PhoneShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F5F7FA] px-0 py-0 text-slate-950 sm:grid sm:place-items-start sm:bg-[#E9EEF6] sm:px-6 sm:py-8 lg:py-10">
      <div
        className={cn(
          "relative mx-auto min-h-screen w-full bg-[#F5F7FA] sm:max-w-[460px] sm:overflow-hidden sm:rounded-[18px] sm:shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:ring-1 sm:ring-black/10",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export function StatusBar() {
  return null;
}

export function BrandMark() {
  return (
    <div className="relative h-14 w-40 overflow-hidden">
      <Image
        src="/brand/exviass-logo.png"
        alt="EXVIASS S.A."
        fill
        priority
        sizes="160px"
        className="object-contain object-left"
      />
    </div>
  );
}

export function HomeTopBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-5">
      <BrandMark />
      <button className="relative grid size-10 place-items-center rounded-full bg-white text-[#0B2E86] shadow-sm">
        <Bell className="size-5" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-[#E53935]" />
      </button>
    </div>
  );
}

export function BlueHeader({
  title,
  href = "/",
  action,
  subtitle,
}: {
  title: string;
  href?: string;
  action?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-[#073FEA] text-white">
      <div className="flex min-h-14 items-center justify-between px-4 py-2">
        <Link href={href} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-sm font-bold">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[11px] font-semibold text-white/75">{subtitle}</p> : null}
        </div>
        <div className="grid size-9 place-items-center">{action}</div>
      </div>
    </div>
  );
}

export function BottomNav({ active }: { active: "home" | "trips" | "my" | "account" }) {
  const items = [
    { id: "home", label: "Inicio", href: "/", icon: Home },
    { id: "trips", label: "Turnos", href: "/trips", icon: MapPinned },
    { id: "my", label: "Mis viajes", href: "/my-trips", icon: CalendarDays },
    { id: "account", label: "Mi cuenta", href: "/account", icon: UserRound },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full border-t border-slate-200 bg-white/95 px-3 pb-3 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:absolute sm:max-w-[460px] sm:rounded-b-[18px]">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold",
                isActive ? "text-[#1E5BFF]" : "text-slate-400",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ContentArea({
  children,
  withBottomNav = false,
  className,
}: {
  children: React.ReactNode;
  withBottomNav?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("px-5 pt-5", withBottomNav ? "pb-28" : "pb-8", className)}>
      {children}
    </div>
  );
}

export function AppCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-white/80 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
