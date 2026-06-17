"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#E53935]/25 bg-white text-sm font-black text-[#E53935] disabled:opacity-60"
    >
      <LogOut className="size-4" />
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
