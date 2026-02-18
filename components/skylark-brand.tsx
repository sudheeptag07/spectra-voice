import Link from 'next/link';

type Props = {
  compact?: boolean;
};

export function SkylarkBrand({ compact = false }: Props) {
  return (
    <Link href="/" className="inline-flex items-center rounded-xl px-2 py-1 transition hover:bg-white/[0.04]">
      <img
        src="/skylark-logo.svg"
        alt="Skylark Drones"
        className={compact ? 'h-9 w-auto' : 'h-11 w-auto md:h-14'}
      />
    </Link>
  );
}
