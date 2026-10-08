import type { ReactNode } from "react";

const DISCLAIMER_LINKS = [
  {
    label: "Service Public",
    title: "Service Public Entreprendre — Application Outre-mer",
    href: "https://entreprendre.service-public.gouv.fr/actualites/A15683",
  },
  {
    label: "FAQ DGFiP",
    title: "impots.gouv.fr — FAQ facturation électronique, Q. 2.9 (entreprises COM)",
    href: "https://www.impots.gouv.fr/foire-aux-questions-japprofondis-la-facturation-electronique",
  },
  {
    label: "PDF COM",
    title: "impots.gouv.fr — FAQ DROM/COM (PDF)",
    href: "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/faq_drom.pdf",
  },
] as const;

function WaveDivider() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[28vh] min-h-32 lg:h-[24vh]"
    >
      <svg
        className="absolute bottom-0 h-full w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,192 C240,256 480,128 720,160 C960,192 1200,96 1440,144 L1440,320 L0,320 Z"
          className="fill-[#c5e4e7]/55 dark:fill-teal-950/35"
        />
        <path
          d="M0,224 C360,288 540,176 900,208 C1080,224 1260,192 1440,208 L1440,320 L0,320 Z"
          className="fill-[#9dd4db]/45 dark:fill-teal-900/25"
        />
        <path
          d="M0,256 C300,288 600,240 960,256 C1200,268 1320,248 1440,256 L1440,320 L0,320 Z"
          className="fill-[#7ec8cf]/35 dark:fill-teal-800/15"
        />
      </svg>
    </div>
  );
}

function BenefitIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800/8 text-teal-800 ring-1 ring-teal-800/10 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/15">
      {children}
    </div>
  );
}

function FactureSketch() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-8 -top-16 z-10 hidden w-40 rotate-[10deg] select-none lg:block xl:-right-12 xl:-top-[4.5rem] xl:w-44 xl:rotate-[12deg]"
    >
      <div className="rounded-lg border border-white/60 bg-white/95 p-3 shadow-xl shadow-teal-900/10 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
            Facture
          </p>
          <span className="rounded bg-teal-50 px-1 py-0.5 text-[7px] font-medium text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            ME
          </span>
        </div>
        <div className="space-y-1.5 border-t border-dashed border-stone-200 pt-2 dark:border-stone-700">
          {[0.88, 0.62, 0.74].map((width, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div
                className="h-0.5 rounded-full bg-stone-200 dark:bg-stone-700"
                style={{ width: `${width * 100}%` }}
              />
              <div className="h-0.5 w-5 shrink-0 rounded-full bg-stone-100 dark:bg-stone-800" />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-1.5 dark:border-stone-700">
          <span className="text-[8px] font-medium text-stone-500">TTC</span>
          <span className="text-[10px] font-semibold tabular-nums text-teal-800 dark:text-teal-300">
            1 240 €
          </span>
        </div>
      </div>
    </div>
  );
}

function DisclaimerAside({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Hors facturation électronique métropole"
      className={
        compact
          ? "mt-4 shrink-0 rounded-xl border border-teal-800/10 bg-white/50 px-4 py-2.5 backdrop-blur-sm dark:border-teal-500/15 dark:bg-stone-900/40 lg:hidden"
          : "mt-6 w-full max-w-xl rounded-xl border border-teal-800/10 bg-white/50 px-4 py-3 backdrop-blur-sm dark:border-teal-500/15 dark:bg-stone-900/40"
      }
    >
      {!compact && (
        <div className="flex gap-3">
          <svg
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-teal-900/90 dark:text-teal-200/90">
              Hors facturation électronique métropole
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Cet outil émet des factures PDF — pas des factures électroniques
              structurées via une plateforme agréée (réforme 2026–2027).
            </p>
            <blockquote className="mt-2 border-l-2 border-teal-800/20 pl-2.5 text-[11px] italic leading-relaxed text-stone-600 max-h-[740px]:hidden dark:border-teal-500/25 dark:text-stone-400">
              « Les opérateurs établis […] à Saint-Barthélemy […] n&apos;entrent
              pas dans le champ de la facturation électronique, la TVA n&apos;y
              étant pas applicable et les opérateurs qui y sont situés n&apos;ayant
              pas la qualité d&apos;assujetti. »
            </blockquote>
            <p className="mt-1 text-[10px] text-stone-400 max-h-[740px]:hidden dark:text-stone-500">
              DGFiP — FAQ facturation électronique, question 2.9
            </p>
          </div>
        </div>
      )}
      {compact && (
        <p className="text-xs font-semibold text-teal-900/90 dark:text-teal-200/90">
          Hors facturation électronique métropole
        </p>
      )}
      <div
        className={`grid grid-cols-3 gap-2 ${compact ? "mt-2" : "mt-3 border-t border-teal-800/8 pt-3 dark:border-teal-500/10"}`}
      >
        {DISCLAIMER_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.title}
            className="truncate text-center text-[11px] text-teal-800 underline decoration-teal-800/30 underline-offset-2 hover:decoration-teal-800/60 dark:text-teal-300 dark:decoration-teal-300/30 dark:hover:decoration-teal-300/60"
          >
            {link.label}
          </a>
        ))}
      </div>
    </aside>
  );
}

const BENEFITS = [
  {
    title: "Factures PDF conformes",
    description:
      "Format français professionnel, prêt à envoyer — pas de plateforme agréée requise.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "Suivi du chiffre d'affaires",
    description:
      "CA encaissé, factures à encaisser et obligations, pour chacune de vos entreprises.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Cotisations CPS DROM",
    description: "Micro-entreprise : taux réduits Saint-Barth intégrés (BIC, BNC, location meublée).",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#faf6f0] font-[family-name:var(--font-geist-sans)] dark:bg-[#0c1719]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 20% -5%, rgba(255,214,170,0.4) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 100% 10%, rgba(126,200,207,0.18) 0%, transparent 50%)",
        }}
      />

      <WaveDivider />

      <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center px-5 py-5 sm:px-8 lg:gap-12 lg:px-8 lg:py-6 xl:gap-20">
        <section className="hidden min-w-0 flex-1 lg:block">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-900/80 backdrop-blur-sm dark:border-teal-500/20 dark:bg-teal-950/40 dark:text-teal-200/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d4846a]" />
            Saint-Barthélemy
          </div>

          <h1 className="max-w-lg text-3xl font-semibold leading-[1.15] tracking-tight text-[#1a454f] dark:text-teal-50 sm:text-4xl">
            Alizé
          </h1>
          <p className="mt-2 text-sm font-medium text-teal-800/70 dark:text-teal-400/80">
            Micro-entreprise · Société · CPS
          </p>
          <p className="mt-4 max-w-md text-base leading-relaxed text-stone-600 dark:text-stone-400">
            Factures conformes, suivi du chiffre d&apos;affaires, cotisations CPS
            et obligations territoriales, pensé pour les entrepreneurs de
            l&apos;île.
          </p>

          <ul className="mt-6 space-y-3">
            {BENEFITS.map((item) => (
              <li key={item.title} className="flex items-start gap-3.5">
                <BenefitIcon>{item.icon}</BenefitIcon>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <DisclaimerAside />

          <p className="mt-4 text-xs text-stone-400 dark:text-stone-600">
            Micro-entreprises, entreprises individuelles et sociétés · Artisans
            · Commerçants · Professions libérales
          </p>
        </section>

        <main className="relative mx-auto flex w-full min-w-0 flex-col justify-center lg:mx-0 lg:max-w-[420px] lg:shrink-0">
          <div className="mb-4 shrink-0 text-center lg:hidden">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1a454f] dark:text-teal-50">
              Alizé
            </h1>
            <p className="mt-1 text-sm text-teal-800/70 dark:text-teal-400/80">
              Facturation · Saint-Barth
            </p>
          </div>

          <div className="relative z-0 shrink-0">{children}</div>
          <FactureSketch />
          <DisclaimerAside compact />
          <p className="mt-3 shrink-0 text-center text-xs text-stone-400 dark:text-stone-600 lg:hidden">
            Micro-entreprises, entreprises individuelles et sociétés
          </p>
        </main>
      </div>
    </div>
  );
}
