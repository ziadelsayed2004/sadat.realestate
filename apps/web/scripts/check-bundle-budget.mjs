import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientAssets = path.resolve(appRoot, 'dist/client/assets');
const maxJavaScriptChunkBytes = 650 * 1024;
// Provider editing/deactivation, administrative decisions and their bilingual
// guide add about 8 KB to the 2,559,126-byte baseline. Allow a bounded 12 KB
// increment (0.48%). The installment editor and guide add about 4.6 KB to the
// 2,570,045-byte baseline; allow another bounded 4 KB (0.16%).
// Automatic map-pin extraction and its bilingual guidance add about 4.1 KB to
// the 2,575,366-byte baseline. Allow a bounded 4 KB increment (0.16%).
// The searchable, paginated main-property picker and bilingual guidance add
// about 7.5 KB to the 2,579,360-byte baseline; allow a bounded 8 KiB increment.
// Keep the per-chunk and stylesheet limits unchanged.
// Persistent staff presence presentation, authorized actor email, per-staff audit
// links, session refresh and their guide add about 2 KB to the 2,587,906-byte
// baseline. Allow a bounded 4 KiB increment; route/chunk limits stay unchanged.
// Saved featured-card previews, verified public-view links and action navigation
// add about 5 KB to the 2,591,133-byte baseline. Allow a bounded 8 KiB increment;
// per-chunk and route stylesheet limits stay unchanged.
// The distinct deactivation queue, localized links and retained list filter add
// 971 bytes to the 2,600,785-byte baseline. Allow a bounded two KiB increment.
// Stopped-banner filtering, private preview navigation and bilingual guidance
// add 1,983 bytes to the 2,601,756-byte baseline. Allow one further KiB;
// retain the existing per-chunk and route stylesheet limits.
// Versioned account-assignment cancellation, retained history, precedence help
// and localized commission/report notification labels add 6,524 bytes to the
// 2,602,151-byte baseline. Allow six further KiB; route/chunk limits stay fixed.
// Recovery guidance, independent hero selection, versioned location ordering
// clear category totals and proactive session renewal add 7,315 bytes to
// 2,608,675. Existing headroom plus six further KiB bounds this increase.
// Simplifying the featured stylesheet saves about 11 KiB; keep the chunk
// and CSS limits unchanged.
// Searchable registration locations and actionable property validation add about
// 2.7 KB after removing public kind controls. Allow four KiB; route/chunk limits stay fixed.
// Native scheduling, live statistics and advertising controls add about 12 KB.
// Keep per-chunk limits fixed and split the new administration tools.
// Header sizing and shared SEO defaults add under one KiB; retain chunk limits.
// Company editing/photo upload, role deletion, featured ordering and the client
// follow-up fixes add 16,587 bytes to the 2,633,388-byte baseline. Split the new
// account tools and allow a bounded 16 KiB; retain the existing per-chunk cap.
// Visible-item read receipts, property draft guidance and area result selection:
// allow four KiB above the 2,649,946-byte baseline, retaining chunk/CSS limits.
// Illustrated property photography guidance, category slider controls and shared
// actionable notices add about 4.4 KiB. Allow eight KiB; keep chunk/CSS caps fixed.
// Homepage placement previews, category management, destination selection and
// clearer account/audit links add about 18 KiB. Allow twenty KiB; split homepage
// administration into its own chunk and retain chunk and route-CSS limits.
// Registration covers, editorial metadata, project-name selection and readable
// receipts add about 10 KiB. Existing headroom plus six KiB bounds this increment.
// Article gallery carousel, separate cover and SSR image recovery add about
// 4.5 KiB. Existing headroom plus four KiB bounds this increment; retain chunk
// and route-stylesheet limits.
// Separate company logo controls and readable manual leads add about 4.2 KiB;
// existing headroom plus four KiB bounds this change without changing route caps.
// Working provider security, shared project-photo upload/preview, receipt paging
// and homepage-cover recovery add about 12 KB to the 2,696,104-byte baseline.
// Allow twelve KiB for these functions; retain route-CSS and per-chunk caps.
// Coherent provider suspension/reactivation on the user page adds 2.3 KB;
// existing headroom plus one KiB covers it without changing route/chunk caps.
// Opting developer covers into their display preview adds 87 bytes; reserve
// 128 bytes while preserving the existing stylesheet and individual chunk caps.
// Provider subscription status, receipt guards, request activity and fast public
// return navigation add about 9 KiB (0.34%) over the 2,710,541-byte baseline.
// Reserve a bounded 12 KiB; preserve the existing 650 KiB chunk cap.
// Owner controls add a draft banner preview, subscription profile editing and
// bilingual settings help in lazy feature chunks. Allow a bounded 8 KiB (0.30%)
// increment over the previous total budget; retain chunk and route CSS limits.
// Field-by-field admin help and the searchable settings reference, per-image
// banner creatives and explicit CMS clearing add about 24 KiB (0.90%).
// Allow a bounded 28 KiB; individual chunks and route CSS retain their caps.
// Owner follow-up adds reporting, visible view counts, project affiliation and
// image-fit controls. Reserve a bounded 20 KiB for these lazy feature changes
// and their bilingual guide; keep the individual chunk limit unchanged.
const maxJavaScriptBytes = 2_715 * 1024 + 128;
// Vite emits one base stylesheet and mutually exclusive feature stylesheets.
// Summing public, seeker, provider, and Admin CSS rejects healthy code splitting:
// no browser route downloads all four feature chunks. Enforce the largest route
// payload instead, including the provider-property extension where applicable.
// The accessible homepage range popover adds about 5.5 KB to the existing
// 261,783-byte public route. Allow a bounded 8 KB increment (3.1%) for it;
// keep the JavaScript limits unchanged and continue counting the whole route.
// Homepage unit/installment choices add 543 bytes to the 270,122-byte public
// route. Allow one additional KiB; retain the JavaScript and per-chunk limits.
// Explicit mobile banner media sizing adds 280 bytes to public route CSS.
// View-count badges, reporting and responsive organization image-fit styles
// add 3.2 KiB above the 271,798-byte baseline; allow a bounded four KiB.
const maxRouteStylesheetBytes = 269 * 1024 + 512;
const files = readdirSync(clientAssets)
  .map(name => path.join(clientAssets, name))
  .filter(file => statSync(file).isFile());
const javascript = files.filter(file => file.endsWith('.js'));
const stylesheets = files.filter(file => file.endsWith('.css'));
const javascriptBytes = javascript.reduce((total, file) => total + statSync(file).size, 0);
const stylesheetBytes = stylesheets.reduce((total, file) => total + statSync(file).size, 0);
const stylesheetSize = (prefix) => stylesheets
  .filter(file => path.basename(file).startsWith(prefix))
  .reduce((total, file) => total + statSync(file).size, 0);
const baseStylesheetBytes = stylesheetSize('index-');
const routeStylesheets = {
  public: baseStylesheetBytes + stylesheetSize('feature-public-'),
  seeker: baseStylesheetBytes + stylesheetSize('feature-seeker-'),
  provider: baseStylesheetBytes + stylesheetSize('feature-provider-'),
  admin: baseStylesheetBytes + stylesheetSize('feature-admin-'),
  userGuide: baseStylesheetBytes + stylesheetSize('feature-admin-') + stylesheetSize('feature-user-guide-')
};
const largestRouteStylesheet = Object.entries(routeStylesheets).reduce(
  (largest, [route, bytes]) => bytes > largest.bytes ? { route, bytes } : largest,
  { route: '', bytes: 0 }
);
const largestJavaScript = javascript.reduce((largest, file) => {
  const size = statSync(file).size;
  return size > largest.size ? { file, size } : largest;
}, { file: '', size: 0 });

console.log(`BUNDLE_BUDGET ${JSON.stringify({
  maxJavaScriptChunkBytes,
  maxJavaScriptBytes,
  maxRouteStylesheetBytes,
  javascriptBytes,
  stylesheetBytes,
  routeStylesheets,
  largestRouteStylesheet,
  largestJavaScript: {
    file: largestJavaScript.file === '' ? '' : path.relative(appRoot, largestJavaScript.file),
    bytes: largestJavaScript.size
  }
})}`);

const failures = [];
if (javascript.length === 0) failures.push('no JavaScript assets were emitted');
if (largestJavaScript.size > maxJavaScriptChunkBytes) failures.push(`largest JavaScript chunk exceeds ${maxJavaScriptChunkBytes} bytes`);
if (javascriptBytes > maxJavaScriptBytes) failures.push(`total JavaScript exceeds ${maxJavaScriptBytes} bytes`);
if (largestRouteStylesheet.bytes > maxRouteStylesheetBytes) failures.push(`route stylesheet payload exceeds ${maxRouteStylesheetBytes} bytes`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`BUNDLE_BUDGET_FAILURE ${failure}`);
  process.exitCode = 1;
}
