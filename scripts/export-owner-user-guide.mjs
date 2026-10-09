import { writeFileSync } from 'node:fs';
import { GUIDE_SECTIONS } from '../apps/web/src/features/admin_user_guide/content.ts';
import { sectionsForAudience } from '../apps/web/src/features/admin_user_guide/account-guides.ts';
import { guideAsMarkdown } from '../apps/web/src/features/admin_user_guide/export.ts';
import { guideAsHtml } from '../apps/web/src/features/admin_user_guide/catalog-export.ts';

writeFileSync(new URL('../docs/operations/owner-user-guide.ar.md', import.meta.url), `${guideAsMarkdown(sectionsForAudience(GUIDE_SECTIONS, 'owner-admin'), 'ar').trimEnd()}\n`, 'utf8');
writeFileSync(new URL('../docs/operations/user-catalog.ar.html', import.meta.url), guideAsHtml(GUIDE_SECTIONS), 'utf8');
for (const [audience, filename] of [['seeker', 'seeker'], ['individual_broker', 'individual'], ['brokerage_office', 'office'], ['developer', 'company'], ['staff-admin', 'staff']]) {
  writeFileSync(new URL(`../docs/operations/user-guide-${filename}.ar.md`, import.meta.url), `${guideAsMarkdown(sectionsForAudience(GUIDE_SECTIONS, audience), 'ar').trimEnd()}\n`, 'utf8');
}
console.log('Updated the searchable HTML catalog and six account guides from the live guide content.');
