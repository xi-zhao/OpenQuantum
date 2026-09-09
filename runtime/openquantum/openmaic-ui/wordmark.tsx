import { DEFAULT_BRAND, type BrandConfig } from '@/lib/brand/brand-config';

type Props = {
  brand?: Pick<BrandConfig, 'productName' | 'markSrc'>;
  className?: string;
  'data-testid'?: string;
};

/** Text stays selectable by the brand config instead of being baked into a bitmap. */
export function LearningWordmark({ brand = DEFAULT_BRAND, className = '', ...props }: Props) {
  return (
    <span
      {...props}
      role="img"
      aria-label={brand.productName}
      className={`oq-learning-wordmark inline-flex h-[1em] shrink-0 items-center gap-[0.18em] whitespace-nowrap align-middle leading-none ${className}`}
    >
      <img src={brand.markSrc} alt="" aria-hidden="true" className="block h-full w-auto shrink-0" />
      <span aria-hidden="true" className="text-[0.6em] font-semibold tracking-tight text-foreground">
        {brand.productName}
      </span>
    </span>
  );
}
