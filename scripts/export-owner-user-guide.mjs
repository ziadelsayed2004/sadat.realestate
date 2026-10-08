import { writeFileSync } from 'node:fs';
import { GUIDE_SECTIONS } from '../apps/web/src/features/admin_user_guide/content.ts';
import { sectionsForAudience } from '../apps/web/src/features/admin_user_guide/account-guides.ts';
import { guideAsMarkdown } from '../apps/web/src/features/admin_user_guide/export.ts';

writeFileSync(new URL('../docs/operations/owner-user-guide.ar.md', import.meta.url), guideAsMarkdown(sectionsForAudience(GUIDE_SECTIONS, 'owner-admin'), 'ar'), 'utf8');
console.log('Updated docs/operations/owner-user-guide.ar.md from the live guide content.');
