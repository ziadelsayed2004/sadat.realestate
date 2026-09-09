import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const guidePath = "docs/quality/Sadat_Real_Estate_Client_User_Guide_FINAL_AR.html";
const templatePath = "docs/quality/client-user-guide.template.html";
const sourcePath = "docs/quality/client-user-guide.ar.json";
const routeMatrixPath = "docs/quality/figma_parity/SCREEN_ROUTE_API_JOURNEY_MATRIX.json";
const mode = process.argv[2] ?? "generate";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const plainText = (value = "") => value
  .replace(/<[^>]+>/g, " ")
  .replaceAll("&nbsp;", " ")
  .replaceAll("&amp;", "&")
  .replace(/\s+/g, " ")
  .trim();

function capture(html, pattern, label) {
  const value = html.match(pattern)?.[1];
  if (!value) throw new Error(`Could not extract ${label}`);
  return plainText(value);
}

function audienceFor(sectionId) {
  if (sectionId === "public") return ["visitor", "seeker", "provider"];
  if (sectionId === "seeker") return ["seeker"];
  if (sectionId === "provider") return ["individual_provider", "broker", "developer_company"];
  if (sectionId === "admin") return ["full_admin", "limited_admin"];
  return ["visitor"];
}

function requirementsFor(sectionId) {
  if (sectionId === "public") return ["لا يلزم تسجيل الدخول للتصفح العام", "تتطلب الإجراءات المحفوظة أو التواصل حسابًا نشطًا"];
  if (sectionId === "seeker") return ["حساب باحث نشط ومسجل الدخول", "صلاحية الوصول إلى السجل المملوك للحساب فقط"];
  if (sectionId === "provider") return ["حساب مقدم عقار نشط ومسجل الدخول", "اكتمال المستندات والمراجعة عند طلب النشر أو الإعلان"];
  return ["جلسة إدارة نشطة", "صلاحية الشاشة والإجراء؛ المدير المحدود يرى وينفذ المسموح فقط", "سبب القرار ونسخة السجل مطلوبان للإجراءات الحساسة"];
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderJourney(journey) {
  const screens = journey.screens.map((screen) => `<a class="screen-link" href="${escapeHtml(screen.evidenceUrl)}" target="_blank" rel="noopener"><span>${escapeHtml(screen.id)}</span>${escapeHtml(screen.label)}<b>↗</b></a>`).join("");
  const routes = journey.directRoutes.map((item) => `<a href="${escapeHtml(item.route)}"><code>${escapeHtml(item.route)}</code><span>${escapeHtml(item.screenId)}</span></a>`).join("");
  return `<article class="step-card searchable" data-guide-id="${escapeHtml(journey.id)}"><div class="step-head"><span class="step-num">${escapeHtml(journey.number)}</span><div><span class="step-tag">${escapeHtml(journey.tag)}</span><h3>${escapeHtml(journey.title)}</h3><p>${escapeHtml(journey.summary)}</p></div></div><div class="step-grid"><div><b>ماذا يفعل المستخدم؟</b><p>${escapeHtml(journey.action)}</p></div><div class="result"><b>النتيجة</b><p>${escapeHtml(journey.result)}</p></div></div><div class="guide-details"><div><b>الحسابات المستهدفة</b>${renderList(journey.audienceLabels)}</div><div><b>قبل البدء والصلاحيات</b>${renderList(journey.preconditions)}</div><div><b>الحالات التي يجب توقعها</b>${renderList(journey.states)}</div><div><b>حل المشكلات</b>${renderList(journey.troubleshooting)}</div></div><div class="direct-routes"><b>روابط مباشرة داخل المنصة</b>${routes || "<span>لا يوجد مسار داخلي ثابت لهذه الحالة.</span>"}</div><div class="screen-links">${screens}</div><div class="step-actions"><a class="btn proto" href="${escapeHtml(journey.prototypeUrl)}" target="_blank" rel="noopener">تشغيل البروتوتايب <span>↗</span></a></div></article>`;
}

async function extract() {
  const [html, routeMatrix] = await Promise.all([
    readFile(guidePath, "utf8"),
    readFile(routeMatrixPath, "utf8").then(JSON.parse),
  ]);
  const articlePattern = /<article class="step-card searchable"[^>]*>[\s\S]*?<\/article>/g;
  const articles = [...html.matchAll(articlePattern)];
  if (articles.length !== 26) throw new Error(`Expected 26 guide journeys, found ${articles.length}`);
  const routeByScreen = new Map(routeMatrix.rows.map((row) => [row.screenId, row.route]));
  const audienceLabels = {
    visitor: "زائر", seeker: "باحث عن عقار", provider: "مستخدم مسجل",
    individual_provider: "مقدم عقار فردي", broker: "وسيط أو مكتب عقاري",
    developer_company: "شركة تطوير", full_admin: "مدير نظام كامل",
    limited_admin: "مستخدم إداري محدود الصلاحيات",
  };
  const journeys = articles.map((match, index) => {
    const card = match[0];
    const prefix = html.slice(0, match.index);
    const sectionId = [...prefix.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].at(-1)?.[1] ?? "public";
    const screens = [...card.matchAll(/<a class="screen-link" href="([^"]+)"[^>]*><span>([^<]+)<\/span>([^<]+)<b>/g)].map((item) => ({ evidenceUrl: item[1].replaceAll("&amp;", "&"), id: item[2], label: plainText(item[3]) }));
    const prototypeUrl = card.match(/<a class="btn proto" href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&") ?? "https://www.figma.com/proto/0HBdTNGROmmpC6S7OYa3iJ/";
    const audience = audienceFor(sectionId);
    return {
      id: `GUIDE-${String(index + 1).padStart(2, "0")}`,
      number: capture(card, /<span class="step-num">([\s\S]*?)<\/span>/, "journey number"),
      sectionId,
      tag: capture(card, /<span class="step-tag">([\s\S]*?)<\/span>/, "journey tag"),
      title: capture(card, /<h3>([\s\S]*?)<\/h3>/, "journey title"),
      summary: capture(card, /<h3>[\s\S]*?<\/h3><p>([\s\S]*?)<\/p>/, "journey summary"),
      action: capture(card, /ماذا يفعل المستخدم؟<\/b><p>([\s\S]*?)<\/p>/, "journey action"),
      result: capture(card, /class="result"><b>النتيجة<\/b><p>([\s\S]*?)<\/p>/, "journey result"),
      audience,
      audienceLabels: audience.map((key) => audienceLabels[key]),
      preconditions: requirementsFor(sectionId),
      states: ["تحميل هيكلي أثناء جلب البيانات", "نجاح مع تحديث المحتوى فورًا", "نتيجة فارغة قابلة لتغيير الفلاتر", "خطأ واضح مع إعادة المحاولة دون تحديث الصفحة"],
      troubleshooting: ["عند عدم ظهور نتيجة، امسح الفلاتر أو غيّر التبويب دون عمل Refresh", "عند تعارض تعديل إداري، حدّث السجل ثم أعد القرار بالسبب المطلوب", "إذا اختفى إجراء، راجع حالة الحساب والصلاحية المطلوبة"],
      screens,
      directRoutes: screens.map((screen) => ({ screenId: screen.id, route: routeByScreen.get(screen.id) })).filter((item) => item.route),
      prototypeUrl,
    };
  });
  const source = {
    schemaVersion: 1,
    language: "ar",
    direction: "rtl",
    title: "دليل استخدام منصة عقارات السادات",
    release: { version: "2026.09-delivery", baselineCommit: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(), generatedAt: new Date().toISOString() },
    accountTypes: ["visitor", "seeker", "individual_provider", "broker", "developer_company", "full_admin", "limited_admin"],
    journeys,
  };
  let template = html.replace(articlePattern, (_, offset) => {
    const articleIndex = articles.findIndex((item) => item.index === offset);
    return `<!-- GUIDE-JOURNEY:${journeys[articleIndex].id} -->`;
  });
  const extraCss = `.guide-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.guide-details>div,.direct-routes{padding:14px;border:1px solid #e5dbc1;border-radius:14px;background:#fffdf8}.guide-details ul{margin:8px 0 0;padding-inline-start:20px}.guide-details li{margin:4px 0}.direct-routes{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.direct-routes>a{display:inline-flex;gap:7px;align-items:center;padding:7px 10px;border-radius:10px;background:#edf7f3;color:#0c5d4b;text-decoration:none}.direct-routes code{direction:ltr}@media(max-width:720px){.guide-details{grid-template-columns:1fr}}@media print{.direct-routes a{color:#111;background:#fff}}`;
  if (!template.includes(".guide-details{")) template = template.replace("</style>", `${extraCss}</style>`);
  if (/data-guide-version="[^"]*"/.test(template)) {
    template = template
      .replace(/data-guide-version="[^"]*"/, 'data-guide-version="{{GUIDE_VERSION}}"')
      .replace(/data-guide-commit="[^"]*"/, 'data-guide-commit="{{GUIDE_COMMIT}}"');
  } else {
    template = template.replace("<html", `<html data-guide-version="{{GUIDE_VERSION}}" data-guide-commit="{{GUIDE_COMMIT}}"`);
  }
  await Promise.all([
    writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`, "utf8"),
    writeFile(templatePath, template, "utf8"),
  ]);
  console.log(`Extracted ${journeys.length} journeys to ${sourcePath}`);
}

export function renderGuide(source, template) {
  let output = template
    .replaceAll("{{GUIDE_VERSION}}", escapeHtml(source.release.version))
    .replaceAll("{{GUIDE_COMMIT}}", escapeHtml(source.release.baselineCommit));
  for (const journey of source.journeys) {
    const marker = `<!-- GUIDE-JOURNEY:${journey.id} -->`;
    if (!output.includes(marker)) throw new Error(`Missing template marker ${marker}`);
    output = output.replace(marker, renderJourney(journey));
  }
  if (/<!-- GUIDE-JOURNEY:/.test(output)) throw new Error("Unresolved guide journey marker");
  return output;
}

async function generate() {
  const [source, template] = await Promise.all([
    readFile(sourcePath, "utf8").then(JSON.parse),
    readFile(templatePath, "utf8"),
  ]);
  const output = renderGuide(source, template);
  await writeFile(guidePath, output, "utf8");
  console.log(`Generated ${guidePath} from ${source.journeys.length} structured journeys`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (mode === "extract") {
    await extract();
    await generate();
  } else if (mode === "generate") {
    await generate();
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
}
