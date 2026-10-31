# Featured advertisement identity logo

The small advertiser identity image in homepage promotions used the organization's cover (`imageUrl`). It now uses the dedicated `logoUrl` in both the administrator preview options and the public publication resolver. Missing or empty logos do not fall back to the cover.

The small image uses `object-fit: contain` without a circular crop so wide and square logos remain complete. The promotion's large image remains independent.

Validation includes advertiser resolution with distinct cover/logo values and missing logos, plus desktop/tablet/mobile browser checks in Arabic and English using a wide logo. Generated captures remain in ignored test output directories. No production records or uploaded files are changed.
