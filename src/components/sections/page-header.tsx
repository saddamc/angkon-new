import Link from "next/link";

type Pill = { label: string; href: string };

/** Shared listing-page header, styled to match the home hero. */
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
    <section className="relative overflow-hidden rounded-3xl border border-[#5c0f0d] bg-[#2b0403]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,rgba(225,183,111,0.18),transparent_55%)]"
      />
      <div
        aria-hidden
        className="absolute -right-16 top-1/2 hidden h-72 w-72 -translate-y-1/2 rounded-full border border-[#E1B76F]/20 md:block"
      />
      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E1B76F]/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F]" />
          {eyebrow}
        </p>
        <h1 className="font-heading text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#cbb18a] sm:text-base">{description}</p>
        )}
        {descriptionHtml && (
          <p
            className="mt-4 max-w-2xl text-sm leading-relaxed text-[#cbb18a] sm:text-base"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
        {meta && (
          <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-[#E1B76F]/70">{meta}</p>
        )}
        {pills && pills.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {pills.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-full border border-[#5c0f0d] bg-[#400604] px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:border-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604]"
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
