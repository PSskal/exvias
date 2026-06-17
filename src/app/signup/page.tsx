"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackURL") ?? "/";
  const callbackURL =
    requestedCallback.startsWith("/") && !requestedCallback.startsWith("//")
      ? requestedCallback
      : "/";
  const [form, setForm] = useState({ name: "", email: "", pass: "" });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !loading &&
    !loadingGoogle &&
    form.name &&
    form.email &&
    form.pass &&
    accepted;

  async function handleSignup() {
    if (form.pass.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.pass,
      callbackURL,
    });

    if (error) {
      setError(traducirError(error.code));
      setLoading(false);
      return;
    }

    window.location.assign(callbackURL);
  }

  async function handleGoogle() {
    if (!accepted) {
      setError("Debes aceptar los términos y la política de privacidad.");
      return;
    }

    setLoadingGoogle(true);
    setError(null);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });

    if (error) {
      setError("No se pudo registrar con Google. Inténtalo nuevamente.");
      setLoadingGoogle(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F5F7FA] px-5 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-md flex-col">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#073FEA]">
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>

        <div className="mt-10">
          <div className="relative h-24 w-full overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-slate-200/70">
            <Image
              src="/brand/exviass-logo.png"
              alt="EXVIASS S.A."
              fill
              priority
              sizes="(max-width: 480px) 100vw, 420px"
              className="object-contain p-3"
            />
          </div>
          <h1 className="mt-2 text-3xl font-black">Crea tu cuenta</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Crea tu perfil de pasajero para reservar turnos y guardar tus comprobantes.
          </p>
        </div>

        <div className="mt-8 rounded-[14px] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.10)]">
          <div className="mb-5 flex items-center gap-2 rounded-[12px] bg-[#1E5BFF]/8 px-3 py-3 text-sm font-bold text-[#073FEA]">
            <ShieldCheck className="size-4" />
            Tus datos quedan asociados a tus reservas.
          </div>

          <div className="space-y-3">
            <Field icon={<UserRound className="size-4" />} label="Nombre completo">
              <input
                placeholder="Ej. Juan Pérez"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </Field>

            <Field icon={<Mail className="size-4" />} label="Correo electrónico">
              <input
                placeholder="tu.correo@ejemplo.com"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </Field>

            <Field icon={<LockKeyhole className="size-4" />} label="Contraseña">
              <input
                placeholder="Mínimo 8 caracteres"
                type="password"
                value={form.pass}
                onChange={(event) => setForm({ ...form, pass: event.target.value })}
                className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 accent-[#073FEA]"
            />
            <span>
              Acepto los términos y la política de privacidad de EXVIASS S.A.
            </span>
          </label>

          {error && (
            <div className="mt-3 rounded-[10px] bg-[#E53935]/10 px-3 py-2 text-center text-sm font-bold text-[#E53935]">
              {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={!canSubmit}
            className="mt-5 h-12 w-full rounded-[10px] bg-[#073FEA] text-base font-black text-white disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">o</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading || loadingGoogle}
            className="h-12 w-full rounded-[10px] border border-slate-200 bg-white text-sm font-black text-slate-800 disabled:opacity-50"
          >
            {loadingGoogle ? "Conectando..." : "Registrarme con Google"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-slate-600">
          ¿Ya tienes cuenta?{" "}
          <Link href={`/login?callbackURL=${encodeURIComponent(callbackURL)}`} className="font-black text-[#073FEA]">
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <span className="flex h-12 items-center gap-2 rounded-[10px] bg-slate-50 px-3 text-slate-400 ring-1 ring-slate-200">
        {icon}
        {children}
      </span>
    </label>
  );
}

function traducirError(code?: string): string {
  const errores: Record<string, string> = {
    USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo.",
    EMAIL_ALREADY_EXISTS: "Ya existe una cuenta con ese correo.",
    INVALID_EMAIL: "El correo no es válido.",
    PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
    TOO_MANY_REQUESTS: "Demasiados intentos. Espera un momento.",
  };

  return errores[code ?? ""] ?? "No se pudo crear la cuenta. Inténtalo nuevamente.";
}
