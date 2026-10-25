import { createContext, type ReactNode } from 'react';
import { usePublicPriceRounding } from './contact.tsx';

export const PublicPriceRoundingContext = createContext(false);

export function PublicPriceDisplay({ initialValue, active, children }: { initialValue?: boolean | undefined; active: boolean; children: ReactNode }) {
  const rounding = usePublicPriceRounding(initialValue, active);
  return <PublicPriceRoundingContext.Provider value={rounding}>{children}</PublicPriceRoundingContext.Provider>;
}
