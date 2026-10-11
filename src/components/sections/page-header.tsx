import Link from "next/link";

type Pill = { label: string; href: string };

/** Shared listing-page header matching clean ANGKON aesthetic */
export function PageHeader({
  eyebrow,
  title,
  description,
  descriptionHtml,
  meta,
  pills,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  meta?: string;
  pills?: Pill[];
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-6 sm:p-8 lg:p-10 text-white">
      <div className="relative">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F]" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-white/90">{description}</p>
        )}
        {descriptionHtml && (
          <p
            className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-white/90"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
        {meta && (
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/70">{meta}</p>
        )}
        {pills && pills.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {pills.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-full border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 py-1 text-xs font-semibold text-white transition hover:bg-[#400604] hover:text-white hover:border-[#E1B76F]"
              >
                {p.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
