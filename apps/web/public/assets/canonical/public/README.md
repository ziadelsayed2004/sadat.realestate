# Canonical Public Figma Assets

The complete raw-image export captured from every approved Public frame lives
under `../../figma/public/PUB-01` through `PUB-12` (158 source images). Named
files in this folder are the stable, semantic copies used by the application
and seed records. Duplicate bytes were verified with SHA-256; the raw archive
is retained so each visual can be traced back to its screen without depending
on Figma's short-lived download URLs.

These category illustrations are exact exported image assets from the approved
Figma file `Odl1Epn2u6lIEuIMmABT7o`, node `6017:10922`
(`PropertyCategoriesCarousel`). They are used as the repository fallback when
the public API does not provide a category image URL.

`home-hero-sadat-city.png` is the exact hero image export from node `6017:10855`
(`Image (مدينة السادات)`) in the same approved Figma file. The Public parity
fixture uses it for the deterministic home response; production API content
still takes precedence when an explicit banner image URL is present.

The remaining named images are exact exports from the Public home/listing
nodes. Their filenames identify the fixture role; they are used only by the
deterministic Public parity responses and keep the visual evidence tied to
source nodes rather than screenshot crops.

| Files | Figma source nodes |
| --- | --- |
| `banner-elite-compound.png` | `6017:10923` / `2051:1835` |
| `property-home.png`, `property-villa.png`, `property-duplex.png` | `6017:10940`, `6017:11011`, `6017:11082` |
| `article-buying-guide.png`, `article-investment.png`, `article-services.png` | `6017:11169`, `6017:11188`, `6017:11207` |
| `community-mohamed.png`, `community-hanaa.png` | `6017:11248`, `6017:11273` |
| `about-team.png` | `6017:11341` |
| `listing-property-*.png` | `6017:12132`, `6017:12203`, `6017:12274`, `6017:12324`, `6017:12389`, `6017:12448` |
| `listing-provider-*.png` | `6017:12190`, `6017:12261`, `6017:12311`, `6017:12376`, `6017:12435`, `6017:12505` |

| File | Figma category |
| --- | --- |
| `category-villa.png` | فيلا |
| `category-duplex.png` | دوبلكس |
| `category-roof.png` | رووف |
| `category-room.png` | غرفة |
| `category-full-commercial-building.png` | مبنى تجاري كامل |
| `category-showrooms.png` | صالات عرض |
| `category-restaurants-cafes.png` | مطاعم وكافيهات |

The `category-all` export is intentionally not used: the active “all” card
uses the existing transparent brand mark so its dark background remains
correct in the listing rail.
