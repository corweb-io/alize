"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-teal-900/8 bg-white/80 backdrop-blur-md dark:border-teal-500/10 dark:bg-stone-950/80">
      <div className="h-0.5 bg-gradient-to-r from-[#d4846a]/70 via-teal-600/70 to-[#1a454f]/70" />
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400 lg:hidden">
          Alizé
        </p>
        <p className="hidden text-sm text-stone-500 dark:text-stone-400 lg:block">
          Espace entrepreneur
        </p>
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden max-w-[220px] truncate text-sm text-stone-600 dark:text-stone-400 sm:block">
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-teal-900/10 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-teal-50/80 hover:text-teal-900 dark:border-teal-500/20 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-teal-100"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
