import { mkdir, readFile, writeFile } from "node:fs/promises";

const CLONE_FILE_KEY = "Odl1Epn2u6lIEuIMmABT7o";
const CANONICAL_DESIGN_URL = "https://www.figma.com/design/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?m=auto&t=5p22yTz0XefwFXqg-6";
const PROTOTYPE_URLS = {
  public: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-10847&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4352&starting-point-node-id=6017%3A10847",
  auth: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-16212&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4353&starting-point-node-id=6017%3A16212&show-proto-sidebar=1",
  seeker: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6027-3579&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4354&starting-point-node-id=6027%3A3579",
  provider: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-19032&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4355&starting-point-node-id=6017%3A19032",
  admin: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-61879&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4356&starting-point-node-id=6017%3A61879&show-proto-sidebar=1",
  responsivePrimary: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-112299&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4357&starting-point-node-id=6017%3A110431&show-proto-sidebar=1",
  responsiveSecondary: "https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-110792&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4357&starting-point-node-id=6017%3A110792&show-proto-sidebar=1",
};
const PAGE_IDS = { public: "6017:4352", auth: "6017:4353", seeker: "6017:4354", provider: "6017:4355", admin: "6017:4356", responsive: "6017:4357" };
const FIGMA_FRAME_EVIDENCE = {
  "PUB-01": {
    "nodeIds": [
      "6017:10847"
    ]
  },
  "PUB-02": {
    "nodeIds": [
      "6017:12095"
    ]
  },
  "PUB-03": {
    "nodeIds": [
      "6017:12693"
    ]
  },
  "PUB-04": {
    "nodeIds": [
      "6017:13838"
    ]
  },
  "PUB-05": {
    "nodeIds": [
      "6017:11366"
    ]
  },
  "PUB-06": {
    "nodeIds": [
      "6017:13155"
    ]
  },
  "PUB-07": {
    "nodeIds": [
      "6017:11467"
    ]
  },
  "PUB-08": {
    "nodeIds": [
      "6017:12560"
    ]
  },
  "PUB-09": {
    "nodeIds": [
      "6017:11634"
    ]
  },
  "PUB-10": {
    "nodeIds": [
      "6017:13611"
    ]
  },
  "PUB-11": {
    "nodeIds": [
      "6017:11830"
    ]
  },
  "PUB-12": {
    "nodeIds": [
      "6017:12006"
    ]
  },
  "AUTH-02": {
    "nodeIds": [
      "6017:15835"
    ]
  },
  "AUTH-03": {
    "nodeIds": [
      "6017:15890"
    ]
  },
  "AUTH-04": {
    "nodeIds": [
      "6017:15993"
    ]
  },
  "AUTH-05": {
    "nodeIds": [
      "6017:16113"
    ]
  },
  "AUTH-06": {
    "nodeIds": [
      "6017:16158"
    ]
  },
  "AUTH-01": {
    "nodeIds": [
      "6017:16212"
    ]
  },
  "AUTH-07": {
    "nodeIds": [
      "6017:16275"
    ]
  },
  "AUTH-08": {
    "nodeIds": [
      "6017:16352"
    ]
  },
  "AUTH-09": {
    "nodeIds": [
      "6017:16432"
    ]
  },
  "AUTH-09+": {
    "nodeIds": [
      "6017:16630"
    ]
  },
  "AUTH-10": {
    "nodeIds": [
      "6017:16843"
    ]
  },
  "AUTH-10+": {
    "nodeIds": [
      "6017:17120"
    ]
  },
  "AUTH-11": {
    "nodeIds": [
      "6017:17441"
    ]
  },
  "AUTH-12": {
    "nodeIds": [
      "6017:17706"
    ]
  },
  "AUTH-13": {
    "nodeIds": [
      "6017:17975"
    ]
  },
  "AUTH-14": {
    "nodeIds": [
      "6017:18418"
    ]
  },
  "AUTH-15": {
    "nodeIds": [
      "6017:18529"
    ]
  },
  "AUTH-16": {
    "nodeIds": [
      "6017:18651"
    ]
  },
  "AUTH-17": {
    "nodeIds": [
      "6017:18822"
    ]
  },
  "SEK-01": {
    "nodeIds": [
      "6027:3579"
    ]
  },
  "SEK-02": {
    "nodeIds": [
      "6027:4046"
    ]
  },
  "SEK-05": {
    "nodeIds": [
      "6027:4477"
    ]
  },
  "SEK-06": {
    "nodeIds": [
      "6027:4748"
    ]
  },
  "SEK-07": {
    "nodeIds": [
      "6027:5319"
    ]
  },
  "SEK-09": {
    "nodeIds": [
      "6027:5677"
    ]
  },
  "SEK-10": {
    "nodeIds": [
      "6027:6531"
    ]
  },
  "SEK-08": {
    "nodeIds": [
      "6027:6850"
    ]
  },
  "SEK-03": {
    "nodeIds": [
      "6027:7187"
    ]
  },
  "SEK-04": {
    "nodeIds": [
      "6027:7928"
    ]
  },
  "PRV-01": {
    "nodeIds": [
      "6017:19032"
    ]
  },
  "PRV-02": {
    "nodeIds": [
      "6017:19308"
    ]
  },
  "PRV-03": {
    "nodeIds": [
      "6017:19499"
    ]
  },
  "PRV-04": {
    "nodeIds": [
      "6017:19679"
    ]
  },
  "PRV-05": {
    "nodeIds": [
      "6017:19858"
    ]
  },
  "PRV-06": {
    "nodeIds": [
      "6017:20034"
    ]
  },
  "PRV-07": {
    "nodeIds": [
      "6017:20229"
    ]
  },
  "PRV-08": {
    "nodeIds": [
      "6017:20391"
    ]
  },
  "PRV-09": {
    "nodeIds": [
      "6017:20561"
    ]
  },
  "PRV-10": {
    "nodeIds": [
      "6017:20737"
    ]
  },
  "PRV-14": {
    "nodeIds": [
      "6017:20973"
    ]
  },
  "PRV-12": {
    "nodeIds": [
      "6017:21012"
    ]
  },
  "PRV-11": {
    "nodeIds": [
      "6017:21064"
    ]
  },
  "PRV-13": {
    "nodeIds": [
      "6017:21123"
    ]
  },
  "PRV-15": {
    "nodeIds": [
      "6017:21162"
    ]
  },
  "PRV-16": {
    "nodeIds": [
      "6017:21368"
    ]
  },
  "PRV-18": {
    "nodeIds": [
      "6017:21613"
    ]
  },
  "PRV-17": {
    "nodeIds": [
      "6017:21747"
    ]
  },
  "PRV-19": {
    "nodeIds": [
      "6017:22088"
    ]
  },
  "PRV-20": {
    "nodeIds": [
      "6028:10071"
    ]
  },
  "PRV-21": {
    "nodeIds": [
      "6028:10830"
    ]
  },
  "PRV-22-1": {
    "nodeIds": [
      "6028:11337"
    ]
  },
  "PRV-22-2": {
    "nodeIds": [
      "6028:11875"
    ]
  },
  "PRV-22-3": {
    "nodeIds": [
      "6028:12067"
    ]
  },
  "ADM-01": {
    "nodeIds": [
      "6017:61879"
    ]
  },
  "ADM-02": {
    "nodeIds": [
      "6017:63278"
    ]
  },
  "ADM-03": {
    "nodeIds": [
      "6017:63642"
    ]
  },
  "ADM-04": {
    "nodeIds": [
      "6017:63786"
    ]
  },
  "ADM-05": {
    "nodeIds": [
      "6017:64066"
    ]
  },
  "ADM-06": {
    "nodeIds": [
      "6017:64291"
    ]
  },
  "ADM-14": {
    "nodeIds": [
      "6017:64422"
    ]
  },
  "ADM-15": {
    "nodeIds": [
      "6017:64694"
    ]
  },
  "ADM-17": {
    "nodeIds": [
      "6017:64905"
    ]
  },
  "ADM-12": {
    "nodeIds": [
      "6017:65001"
    ]
  },
  "ADM-13": {
    "nodeIds": [
      "6017:65196"
    ]
  },
  "ADM-09": {
    "nodeIds": [
      "6017:65312"
    ]
  },
  "ADM-10": {
    "nodeIds": [
      "6017:65610"
    ]
  },
  "ADM-11": {
    "nodeIds": [
      "6017:65783"
    ]
  },
  "ADM-19": {
    "nodeIds": [
      "6017:66045"
    ]
  },
  "ADM-20": {
    "nodeIds": [
      "6017:66300"
    ]
  },
  "ADM-21": {
    "nodeIds": [
      "6017:66405"
    ]
  },
  "ADM-22": {
    "nodeIds": [
      "6017:66513"
    ]
  },
  "ADM-23": {
    "nodeIds": [
      "6017:66657"
    ]
  },
  "ADM-24": {
    "nodeIds": [
      "6017:66706"
    ]
  },
  "ADM-25": {
    "nodeIds": [
      "6017:66768"
    ]
  },
  "ADM-26": {
    "nodeIds": [
      "6017:67003"
    ]
  },
  "ADM-27": {
    "nodeIds": [
      "6017:67186"
    ]
  },
  "ADM-28": {
    "nodeIds": [
      "6017:67483"
    ]
  },
  "ADM-29": {
    "nodeIds": [
      "6017:67622"
    ]
  },
  "ADM-30": {
    "nodeIds": [
      "6017:67743"
    ]
  },
  "ADM-31": {
    "nodeIds": [
      "6017:67966"
    ]
  },
  "ADM-32": {
    "nodeIds": [
      "6017:68133"
    ]
  },
  "ADM-33": {
    "nodeIds": [
      "6017:68194"
    ]
  },
  "ADM-34": {
    "nodeIds": [
      "6017:68404"
    ]
  },
  "ADM-35": {
    "nodeIds": [
      "6017:68502"
    ]
  },
  "ADM-36": {
    "nodeIds": [
      "6017:68625"
    ]
  },
  "ADM-37": {
    "nodeIds": [
      "6017:68759"
    ]
  },
  "ADM-38": {
    "nodeIds": [
      "6017:68953"
    ]
  },
  "ADM-39": {
    "nodeIds": [
      "6017:69143"
    ]
  },
  "ADM-07": {
    "nodeIds": [
      "6017:69976"
    ]
  },
  "ADM-08": {
    "nodeIds": [
      "6017:70127"
    ]
  },
  "ADM-16": {
    "nodeIds": [
      "6017:70199"
    ]
  },
  "ADM-41": {
    "nodeIds": [
      "6017:70248"
    ]
  },
  "ADM-42": {
    "nodeIds": [
      "6017:70478"
    ]
  },
  "ADM-43": {
    "nodeIds": [
      "6017:70665"
    ]
  },
  "ADM-44": {
    "nodeIds": [
      "6017:70759",
      "6017:70858"
    ]
  },
  "ADM-45": {
    "nodeIds": [
      "6017:70955"
    ]
  },
  "ADM-46": {
    "nodeIds": [
      "6017:71123"
    ]
  },
  "ADM-47": {
    "nodeIds": [
      "6017:71230"
    ]
  },
  "ADM-48": {
    "nodeIds": [
      "6017:71345"
    ]
  },
  "ADM-49": {
    "nodeIds": [
      "6017:71488"
    ]
  },
  "ADM-50": {
    "nodeIds": [
      "6017:71725"
    ]
  },
  "ADM-51": {
    "nodeIds": [
      "6017:71897"
    ]
  },
  "ADM-52": {
    "nodeIds": [
      "6017:72005"
    ]
  },
  "ADM-53": {
    "nodeIds": [
      "6017:72075"
    ]
  },
  "ADM-55": {
    "nodeIds": [
      "6017:72206"
    ]
  },
  "ADM-56": {
    "nodeIds": [
      "6017:72311"
    ]
  },
  "ADM-57": {
    "nodeIds": [
      "6017:72413"
    ]
  },
  "ADM-58": {
    "nodeIds": [
      "6017:72503"
    ]
  },
  "ADM-59": {
    "nodeIds": [
      "6017:72653"
    ]
  },
  "ADM-60": {
    "nodeIds": [
      "6017:72874"
    ]
  },
  "ADM-61": {
    "nodeIds": [
      "6017:72978"
    ]
  },
  "ADM-62": {
    "nodeIds": [
      "6017:73122"
    ]
  },
  "ADM-63": {
    "nodeIds": [
      "6017:73268"
    ]
  },
  "ADM-64": {
    "nodeIds": [
      "6017:73435"
    ]
  },
  "ADM-65": {
    "nodeIds": [
      "6017:74029"
    ]
  },
  "ADM-66": {
    "nodeIds": [
      "6017:74241"
    ]
  },
  "ADM-40": {
    "nodeIds": [
      "6017:74395"
    ]
  }
};

const guidePath = "Sadat_Real_Estate_Client_User_Guide_FINAL_AR.html";
const requiredRole = { public: "public", auth: "anonymous", seeker: "seeker", provider: "provider", admin: "administrator" };
const surfaceLabel = { public: "Public Website", auth: "Authentication and Onboarding", seeker: "Property Seeker", provider: "Property Provider", admin: "Admin Dashboard" };
const evidenceRoot = "docs/quality/figma_parity";
const runtimeEvidence = {
  "PUB-01": {
    locale: "ar",
    direction: "rtl",
    viewport: { width: 1440, height: 1080 },
    sourceScreenshot: "docs/quality/figma_parity/figma-source-PUB-01.png",
    runtimeScreenshot: "docs/quality/figma_parity/runtime-PUB-01-ar.png",
    runtimeState: "error-retry-no-api-fixture",
    comparisonStatus: "NOT_COMPARABLE_TO_FIGMA_SUCCESS_STATE",
  },
};

async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
async function writeJson(path, value) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function cloneUrl(surface, nodeId) {
  if (!nodeId || !PROTOTYPE_URLS[surface]) return null;
  return PROTOTYPE_URLS[surface].replace(/node-id=[^&]+/, `node-id=${nodeId.replace(":", "-")}`);
}
function sourceFor(sources, screenId) { return sources.find((item) => item.id === screenId) ?? null; }

const registry = await readJson("agent_pack/01_product/SCREEN_REGISTRY.json");
const coverage = await readJson("agent_pack/01_product/SCREEN_COVERAGE.json");
const sourceManifest = await readJson("agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json");
const sourceScreens = sourceManifest.screens;
const guideExists = await readFile(guidePath).then(() => true).catch(() => false);
const screens = registry.map((screen) => {
  const coverageRecord = coverage.find((item) => item.id === screen.id);
  const source = sourceFor(sourceScreens, screen.id);
  const frame = FIGMA_FRAME_EVIDENCE[screen.id] ?? null;
  const ownerAuthored = screen.id === "ADM-54";
  const aliasOf = screen.id === "AUTH-09+" ? "AUTH-09" : screen.id === "AUTH-10+" ? "AUTH-10" : null;
  const cloneNodeIds = frame?.nodeIds ?? [];
  const localSources = source?.localSources ?? [];
  const sourceAuthority = ownerAuthored
    ? "OWNER_AUTHORED_LOCAL_REVIEW_APPROVED"
    : cloneNodeIds.length
      ? aliasOf
        ? "CANONICAL_CLONE_ALIAS"
        : "CANONICAL_CLONE_FRAME"
      : "LOCAL_EXPORT_WITHOUT_MATCHING_CLONE_FRAME";
  const mappingNotes = [];
  if (aliasOf) mappingNotes.push(`Registry variant aliases ${aliasOf} in the clone metadata.`);
  if (screen.id === "ADM-44" && cloneNodeIds.length > 1) mappingNotes.push("One registry ID has separate list and create clone frames; both are retained.");
  if (screen.id === "ADM-18") mappingNotes.push("Local export exists, but no ADM-18 frame was returned by the canonical clone page metadata.");
  if (ownerAuthored) mappingNotes.push("Historical ADM-54 Figma frame was not recovered; the owner-authored local source is the approved fallback.");
  return {
    screenId: screen.id,
    surface: screen.surface,
    surfaceLabel: surfaceLabel[screen.surface],
    englishName: screen.englishName,
    localeScopes: screen.locales,
    directionScope: screen.directionScope,
    deviceScope: screen.deviceScope,
    cloneFileKey: CLONE_FILE_KEY,
    clonePageId: PAGE_IDS[screen.surface] ?? null,
    exactCloneNodeId: cloneNodeIds[0] ?? null,
    exactCloneNodeIds: cloneNodeIds,
    exactCloneUrl: cloneUrl(screen.surface, cloneNodeIds[0]),
    frameName: frame ? `${screen.id} — ${screen.englishName}` : null,
    frameNames: [],
    dimensions: localSources.map((item) => ({ path: item.localPath, width: item.width, height: item.height })),
    sourceChecksums: localSources.map((item) => ({ path: item.localPath, sha256: item.sha256 })),
    runtimeRoute: coverageRecord?.route ?? null,
    requiredRole: requiredRole[screen.surface] ?? "unknown",
    apiDependencies: [],
    backendTaskIds: coverageRecord?.backendTaskIds ?? [],
    userGuideJourneyReferences: [],
    supportedStates: ["default"],
    stateCoverageStatus: "UNVERIFIED_PENDING_EXECUTABLE_MATRIX",
    currentParityStatus: ownerAuthored ? "OWNER_AUTHORED_SOURCE_APPROVED_RUNTIME_REVIEW_RECORDED" : "DIRECT_SOURCE_CAPTURED_RUNTIME_REVIEW_PENDING",
    defectSeverity: null,
    owningAtomicTask: coverageRecord?.frontendTaskId ?? null,
    sourceAuthority,
    aliasOf,
    mappingNotes,
    evidencePaths: [
      ...(localSources.map((item) => item.localPath)),
      `figma://${CLONE_FILE_KEY}/${PAGE_IDS[screen.surface] ?? "unmapped"}/${cloneNodeIds[0] ?? "unmapped"}`,
    ],
  };
});
const mapped = screens.filter((screen) => screen.exactCloneNodeId);
const uniqueCloneNodes = new Set(mapped.flatMap((screen) => screen.exactCloneNodeIds));
const aliases = screens.filter((screen) => screen.aliasOf);
const unmapped = screens.filter((screen) => !screen.exactCloneNodeId);
const sourceMigration = {
  schemaVersion: 1,
  generatedAt: "2026-08-25T18:00:00.000Z",
  canonicalFigmaFileKey: CLONE_FILE_KEY,
  canonicalDesignUrl: CANONICAL_DESIGN_URL,
  forbiddenFigmaKeyUsedByActiveSources: false,
  activeReferenceRootsChecked: ["agent_pack/00_start_here", "agent_pack/01_product", "agent_pack/09_sources", "docs/design_sources/handoff"],
  migratedFiles: [
    "agent_pack/00_start_here/SOURCE_OF_TRUTH.md",
    "agent_pack/01_product/SCREEN_COVERAGE.json",
    "agent_pack/01_product/SCREEN_REGISTRY.json",
    "agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json",
    "docs/design_sources/handoff/developer-handoff.source.html",
    "docs/design_sources/handoff/prototype-flow-hub.source.html",
  ],
  canonicalPrototypes: PROTOTYPE_URLS,
  historicalEvidencePolicy: "Retired finish evidence may retain old external provenance only when explicitly labeled historical and excluded from current verification.",
  historicalEvidenceRoots: ["agent_pack/07_finish/**"],
};
const routeMatrix = screens.map((screen) => ({
  screenId: screen.screenId,
  surface: screen.surface,
  route: screen.runtimeRoute,
  requiredRole: screen.requiredRole,
  backendTaskIds: screen.backendTaskIds,
  apiDependencies: screen.apiDependencies,
  userGuideJourneyReferences: screen.userGuideJourneyReferences,
  guideStatus: guideExists ? "PENDING_SCREEN_JOURNEY_MAPPING" : "BLOCKED_GUIDE_FILE_MISSING",
  supportedStates: screen.supportedStates,
  verificationStatus: "PENDING_RUNTIME_MATRIX",
}));
const parityLedger = screens.map((screen) => ({
  screenId: screen.screenId,
  sourceAuthority: screen.sourceAuthority,
  clonePageId: screen.clonePageId,
  exactCloneNodeId: screen.exactCloneNodeId,
  sourceChecksum: screen.sourceChecksums[0]?.sha256 ?? null,
  directMetadataEvidence: Boolean(screen.exactCloneNodeId),
  directScreenshotEvidence: screen.screenId === "PUB-01",
  runtimeBeforeEvidence: null,
  runtimeAfterEvidence: runtimeEvidence[screen.screenId]?.runtimeScreenshot ?? null,
  visualDiffEvidence: null,
  visualReviewStatus: screen.screenId === "ADM-54"
    ? "OWNER_AUTHORED_REVIEW_RECORDED"
    : screen.screenId === "PUB-01"
      ? "REVIEWED_MATERIAL_DIFFERENCES_OBSERVED_RUNTIME_ERROR_STATE"
      : "PENDING_DIRECT_RUNTIME_COMPARISON",
  runtimeEvidence: runtimeEvidence[screen.screenId] ?? null,
  materialDefects: screen.mappingNotes,
}));
const guideMatrix = screens.map((screen) => ({
  screenId: screen.screenId,
  route: screen.runtimeRoute,
  guidePath: guideExists ? guidePath : null,
  guideJourneyReferences: [],
  status: guideExists ? "NOT_YET_MAPPED" : "BLOCKED_GUIDE_FILE_MISSING",
}));
const defects = [
  { id: "FIGMA-SOURCE-001", severity: "P1", status: "resolved", area: "source-integrity", description: "Active prototype, registry, coverage, source manifest, and handoff references migrated to the canonical clone.", evidence: "FIGMA_SOURCE_MIGRATION.json" },
  { id: "FIGMA-MAP-ADM-18", severity: "P1", status: "open", area: "source-mapping", screenId: "ADM-18", description: "The canonical Admin page metadata does not expose an ADM-18 frame; the local export remains unverified against clone truth.", evidence: "FIGMA_SCREEN_INVENTORY.json" },
  { id: "FIGMA-MAP-ADM-54", severity: "P1", status: "accepted-owner-fallback", area: "source-mapping", screenId: "ADM-54", description: "Historical ADM-54 frame was not recovered; the approved owner-authored local source is explicitly not a Figma recovery.", evidence: "docs/design_sources/final_screens/admin/ADM-54.owner-authored.html" },
  { id: "FIGMA-GUIDE-001", severity: "P1", status: guideExists ? "open" : "blocked", area: "user-guide", description: guideExists ? "Arabic user guide exists but screen-to-journey mapping is still pending." : "Sadat_Real_Estate_Client_User_Guide_FINAL_AR.html is absent from the repository and docs/.", evidence: "USER_GUIDE_CONFORMANCE_MATRIX.json" },
  { id: "WEB-DEV-CSP-001", severity: "P1", status: "resolved", area: "runtime", description: "Development CSP blocked Vite hydration and HMR, producing an unstyled SSR shell; development-only CSP allowances and a no-HMR test mode now keep production CSP strict.", evidence: "apps/web/server.mjs; apps/web/tests/preview-deployment.vitest.test.ts" },
  { id: "FIGMA-RUNTIME-001", severity: "P1", status: "open", area: "visual-verification", description: "PUB-01 runtime evidence is an error/retry state without a populated API fixture and is therefore not comparable to the canonical Figma success state; the remaining direct runtime comparison matrix is not claimed complete.", evidence: "FIGMA_PARITY_LEDGER.json" },
  { id: "PLATFORM-EXTERNAL-001", severity: "P1", status: "blocked", area: "release-gate", description: "backend_139 remains blocked on external production-like infrastructure and providers, so frontend_098 cannot be closed honestly.", evidence: "agent_pack/03_execution/TASK_STATE.json" },
];
await mkdir(evidenceRoot, { recursive: true });
await writeJson(`${evidenceRoot}/FIGMA_SCREEN_INVENTORY.json`, {
  schemaVersion: 1,
  generatedAt: "2026-08-25T18:00:00.000Z",
  canonicalFigmaFileKey: CLONE_FILE_KEY,
  canonicalDesignUrl: CANONICAL_DESIGN_URL,
  historicalExpectedScreenCount: 131,
  canonicalScreenCount: screens.length,
  screensInventoried: screens.length,
  screensMappedToExactCloneNodes: mapped.length,
  uniqueCloneFramesMapped: uniqueCloneNodes.size,
  ownerAuthoredCurrentBaselines: screens.filter((screen) => screen.sourceAuthority === "OWNER_AUTHORED_LOCAL_REVIEW_APPROVED").map((screen) => screen.screenId),
  aliases,
  unmappedScreenIds: unmapped.map((screen) => screen.screenId),
  directPageEvidence: Object.fromEntries(Object.entries(PAGE_IDS).map(([surface, pageId]) => [surface, { pageId, fileKey: CLONE_FILE_KEY, metadataCaptured: true }])),
  directScreenshotEvidence: ["PUB-01"],
  runtimeEvidence,
  screens,
});
await writeJson(`${evidenceRoot}/FIGMA_SOURCE_MIGRATION.json`, sourceMigration);
await writeJson(`${evidenceRoot}/SCREEN_ROUTE_API_JOURNEY_MATRIX.json`, {
  schemaVersion: 1,
  generatedAt: "2026-08-25T18:00:00.000Z",
  canonicalScreenCount: screens.length,
  guidePath: guideExists ? guidePath : null,
  guideAvailable: guideExists,
  rows: routeMatrix,
});
await writeJson(`${evidenceRoot}/FIGMA_PARITY_LEDGER.json`, {
  schemaVersion: 1,
  generatedAt: "2026-08-25T18:00:00.000Z",
  policy: "No screen is marked visually verified without direct clone-source and runtime comparison evidence.",
  rows: parityLedger,
});
await writeJson(`${evidenceRoot}/USER_GUIDE_CONFORMANCE_MATRIX.json`, {
  schemaVersion: 1,
  generatedAt: "2026-08-25T18:00:00.000Z",
  guidePath: guideExists ? guidePath : null,
  guideAvailable: guideExists,
  status: guideExists ? "PENDING_MAPPING" : "BLOCKED_GUIDE_FILE_MISSING",
  rows: guideMatrix,
});
await writeJson(`${evidenceRoot}/FIGMA_DEFECT_REGISTER.json`, {
  schemaVersion: 1,
  generatedAt: "2026-08-25T18:00:00.000Z",
  defects,
});
await writeJson(`${evidenceRoot}/RUN_CHECKPOINT.json`, {
  schemaVersion: 1,
  updatedAt: "2026-08-25T18:00:00.000Z",
  currentTask: "frontend_098",
  status: "blocked_by_external_backend_139_and_unavailable_user_guide",
  lastCompletedIndependentWork: ["canonical-clone-identity-verification", "direct-page-metadata-capture", "active-source-migration", "screen-inventory-reconciliation", "development-runtime-csp-repair"],
  canonicalScreenCount: screens.length,
  mappedToCloneNodeCount: mapped.length,
  uniqueCloneFrameCount: uniqueCloneNodes.size,
  unmappedScreenIds: unmapped.map((screen) => screen.screenId),
  remainingIndependentWork: ["focused runtime/browser matrix", "route/API/user-guide matrix where repository evidence exists", "final release-gate evidence"],
  externalBlockers: ["backend_139 external infrastructure/provider prerequisites", guideExists ? null : "Arabic client user guide file is absent"].filter(Boolean),
});
console.log(JSON.stringify({canonicalScreenCount:screens.length,mappedToCloneNodeCount:mapped.length,uniqueCloneFrameCount:uniqueCloneNodes.size,unmapped:unmapped.map((screen)=>screen.screenId),aliases:aliases.map((screen)=>screen.screenId)},null,2));
