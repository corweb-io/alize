"use client";

import { useState } from "react";
import AuthShell from "@/components/auth/auth-shell";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type AuthStep = "email" | "otp";
type MessageKind = "success" | "error" | null;

function StepProgress({ step }: { step: AuthStep }) {
  const steps: AuthStep[] = ["email", "otp"];
  const current = steps.indexOf(step);

  return (
    <div className="mb-5 flex gap-2">
      {steps.map((id, index) => (
        <div
          key={id}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            index <= current
              ? "bg-teal-700 dark:bg-teal-500"
              : "bg-stone-200 dark:bg-stone-700"
          }`}
        />
      ))}
    </div>
  );
}

function StatusMessage({
  message,
  kind,
}: {
  message: string;
  kind: MessageKind;
}) {
  if (!kind) return null;

  const isSuccess = kind === "success";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm ${
        isSuccess
          ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-100 dark:ring-teal-900/50"
          : "bg-red-50 text-red-800 ring-1 ring-red-100 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/50"
      }`}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {isSuccess ? "✓" : "!"}
      </span>
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<MessageKind>(null);

  const [supabase] = useState(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  });

  const clearMessage = () => {
    setMessage("");
    setMessageKind(null);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    clearMessage();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) {
        setMessage(error.message);
        setMessageKind("error");
        toast.error("Envoi impossible", { description: error.message });
        setLoading(false);
      } else {
        setMessage("Consultez vos emails pour le code de vérification.");
        setMessageKind("success");
        toast.success("Code envoyé", {
          description: "Vérifiez votre boîte mail",
        });
        setStep("otp");
        setLoading(false);
      }
    } catch (err) {
      console.error("Unexpected error sending OTP:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(errorMessage);
      setMessageKind("error");
      toast.error("Envoi impossible", { description: errorMessage });
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    clearMessage();

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        setMessage(error.message);
        setMessageKind("error");
        toast.error("Code invalide", { description: error.message });
        setLoading(false);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setMessage(
          "Connexion réussie, mais la session n'a pas pu être établie."
        );
        setMessageKind("error");
        toast.error("Erreur de session", {
          description:
            sessionError?.message || "Impossible d'établir la session",
        });
        setLoading(false);
        return;
      }

      const user = session.user;

      if (user) {
        try {
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            updated_at: new Date().toISOString(),
          });
        } catch (profileErr) {
          console.error("Unexpected error creating profile:", profileErr);
        }
      }

      toast.success("Bienvenue !");
      window.location.replace("/b");
    } catch (err) {
      console.error("Unexpected error during OTP verification:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(errorMessage);
      setMessageKind("error");
      toast.error("Vérification échouée", { description: errorMessage });
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-2xl shadow-teal-900/8 ring-1 ring-teal-900/5 backdrop-blur-md dark:border-stone-700/80 dark:bg-stone-900/90 dark:shadow-none dark:ring-teal-500/10">
        <div className="h-1.5 bg-gradient-to-r from-[#d4846a] via-teal-600 to-[#1a454f]" />

        <div className="p-6 sm:p-7">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800/55 dark:text-teal-400/70">
            {step === "email" ? "Étape 1 · Connexion" : "Étape 2 · Vérification"}
          </p>

          <StepProgress step={step} />

          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[#1a454f] dark:text-teal-50">
              {step === "email" ? "Bonjour" : "Vérifiez votre email"}
            </h2>
            <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {step === "email" ? (
                "Connectez-vous ou créez votre espace micro-entreprise en quelques secondes — sans mot de passe."
              ) : (
                <>
                  Saisissez le code à 6 chiffres envoyé à{" "}
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {email}
                  </span>
                </>
              )}
            </p>
          </div>

          {step === "email" ? (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              <Input
                id="email"
                name="email"
                type="email"
                label="Adresse email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="py-2.5"
              />

              {message && (
                <StatusMessage message={message} kind={messageKind} />
              )}

              <Button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-2.5"
              >
                {loading ? "Envoi en cours…" : "Recevoir mon code"}
              </Button>

              <p className="text-center text-xs leading-relaxed text-stone-400 dark:text-stone-500">
                Première visite ? Votre compte micro-entreprise sera créé
                automatiquement.
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <div>
                <label
                  htmlFor="otp"
                  className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Code à 6 chiffres
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="block w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] text-stone-900 placeholder-stone-300 transition-shadow focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-600/10 dark:border-stone-600 dark:bg-stone-800/80 dark:text-white dark:placeholder-stone-600 dark:focus:bg-stone-800"
                  placeholder="······"
                  autoFocus
                />
                <p className="mt-2.5 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
                  Rien reçu ? Vérifiez vos spams ou changez d&apos;adresse email.
                </p>
              </div>

              {message && (
                <StatusMessage message={message} kind={messageKind} />
              )}

              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2.5"
                >
                  {loading ? "Vérification…" : "Accéder à mon espace"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    clearMessage();
                  }}
                  className="w-full rounded-md py-2.5 text-sm text-stone-500 transition-colors hover:bg-stone-50 hover:text-teal-900 dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-teal-200"
                >
                  Changer d&apos;adresse email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
