import { readFile } from "node:fs/promises";
import { renderGuide } from "./client-user-guide.mjs";

const sourcePath = "docs/quality/client-user-guide.ar.json";
const guidePath = "docs/quality/Sadat_Real_Estate_Client_User_Guide_FINAL_AR.html";
const templatePath = "docs/quality/client-user-guide.template.html";
const matrixPath = "docs/quality/figma_parity/USER_GUIDE_CONFORMANCE_MATRIX.json";
const [source, html, template, matrix] = await Promise.all([readFile(sourcePath, "utf8").then(JSON.parse), readFile(guidePath, "utf8"), readFile(templatePath, "utf8"), readFile(matrixPath, "utf8").then(JSON.parse)]);
const requiredAccounts = ["visitor", "seeker", "individual_provider", "broker", "developer_company", "full_admin", "limited_admin"];
const failures = [];
if (/\?{4,}/u.test(JSON.stringify(source))) failures.push('guide source contains corrupted text (repeated question marks)');
if (renderGuide(source, template) !== html) failures.push("rendered HTML is stale; run npm run guide:sync");
if (source.journeys.length !== 26) failures.push(`expected 26 journeys, found ${source.journeys.length}`);
for (const account of requiredAccounts) if (!source.accountTypes.includes(account)) failures.push(`missing account type ${account}`);
const ids = new Set();
for (const journey of source.journeys) {
  if (ids.has(journey.id)) failures.push(`duplicate journey ${journey.id}`);
  ids.add(journey.id);
  for (const key of ["title", "summary", "action", "result"]) if (!journey[key]?.trim()) failures.push(`${journey.id} has empty ${key}`);
  for (const key of ["audience", "preconditions", "states", "troubleshooting", "screens"]) if (!journey[key]?.length) failures.push(`${journey.id} has no ${key}`);
  for (const route of journey.directRoutes) if (!route.route.startsWith("/")) failures.push(`${journey.id} has invalid route ${route.route}`);
  if (!journey.prototypeUrl.startsWith("https://www.figma.com/")) failures.push(`${journey.id} has invalid prototype link`);
}
const renderedIds = [...html.matchAll(/data-guide-id="(GUIDE-\d{2})"/g)].map((match) => match[1]);
if (renderedIds.length !== 26 || new Set(renderedIds).size !== 26) failures.push("rendered guide does not contain 26 unique journey cards");
for (const required of ["id=\"search\"", "@media print", "@media(max-width:720px)", "data-guide-version=", "data-guide-commit=", "الحسابات المستهدفة", "قبل البدء والصلاحيات", "حل المشكلات"]) if (!html.includes(required)) failures.push(`rendered guide missing ${required}`);
const secretPatterns = [
  /elsadat\.realestate\.eg@server/i,
  /bearer\s+[a-z0-9._~-]{20,}/i,
  /mongodb(?:\+srv)?:\/\/[^\s<]+:[^\s<]+@/i,
  /(?:password|كلمة المرور)\s*[:=]\s*[^<\s]{8,}/i,
];
for (const pattern of secretPatterns) if (pattern.test(html) || pattern.test(JSON.stringify(source))) failures.push(`potential secret matched ${pattern}`);
if (matrix.journeys.length !== 26) failures.push(`matrix expected 26 journeys, found ${matrix.journeys.length}`);
const requiredMatrixKeys = ["actor", "preconditions", "uiRoutes", "apis", "mongoChanges", "cases", "permissions", "versionAndAudit", "environment", "userGuide", "executionDate", "commit", "verificationStatus"];
for (const journey of matrix.journeys) {
  for (const key of requiredMatrixKeys) if (!(key in journey)) failures.push(`${journey.id} matrix row missing ${key}`);
  if (!["VERIFIED", "PARTIAL", "BLOCKED"].includes(journey.verificationStatus)) failures.push(`${journey.id} has invalid status ${journey.verificationStatus}`);
  if (journey.verificationStatus === "VERIFIED" && journey.environment.production !== "VERIFIED") failures.push(`${journey.id} cannot be VERIFIED without Production evidence`);
}
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "PASS", journeys: source.journeys.length, accountTypes: source.accountTypes.length, renderedCards: renderedIds.length, matrix: matrix.executionSummary }));
}
