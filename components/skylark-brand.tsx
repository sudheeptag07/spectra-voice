import Link from 'next/link';

type Props = {
  compact?: boolean;
};

export function SkylarkBrand({ compact = false }: Props) {
  return (
    <Link href="/" className="inline-flex items-center p-0">
      <img
        src="/skylark-logo.svg"
        alt="Skylark Drones"
        className={compact ? 'h-8 w-auto md:h-9' : 'h-10 w-auto md:h-12'}
      />
    </Link>
  );
}
