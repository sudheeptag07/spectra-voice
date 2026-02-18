import Link from 'next/link';

type Props = {
  compact?: boolean;
};

export function SkylarkBrand({ compact = false }: Props) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-white/[0.04]">
      <img
        src="/skylark-logo.svg"
        alt="Skylark Drones"
        className={compact ? 'h-8 w-auto' : 'h-10 w-auto md:h-12'}
      />
      <div className="text-left">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Skylark Drones</p>
        <p className="text-sm text-slate-300">Spectra Voice</p>
      </div>
    </Link>
  );
}
