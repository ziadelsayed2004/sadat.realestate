import { createElement } from 'react';
import { DEFAULT_DESIGN_ASSETS, resolveDesignAsset, type DesignAssetCatalog } from './assets.ts';

export interface BrandMarkProps {
  readonly label: string;
  readonly assets?: DesignAssetCatalog | undefined;
}

export function BrandMark({ label, assets = DEFAULT_DESIGN_ASSETS }: BrandMarkProps) {
  const logoPath = resolveDesignAsset(assets, 'logo');
  const mark = logoPath === undefined
    ? label
    : createElement('img', {
        src: logoPath,
        alt: label,
        className: 'brand-image',
        decoding: 'async',
        fetchPriority: 'high',
        width: 636,
        height: 557
      });

  return createElement('a', { className: 'brand', href: '/', 'aria-label': label }, mark);
}
