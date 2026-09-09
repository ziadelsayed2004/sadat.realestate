import { readFile, writeFile } from "node:fs/promises";

const guideSourcePath = "docs/quality/client-user-guide.ar.json";
const matrixPath = "docs/quality/figma_parity/USER_GUIDE_CONFORMANCE_MATRIX.json";
const routeMatrixPath = "docs/quality/figma_parity/SCREEN_ROUTE_API_JOURNEY_MATRIX.json";

const [guide, matrix, routeMatrix] = await Promise.all([
  readFile(guideSourcePath, "utf8").then(JSON.parse),
  readFile(matrixPath, "utf8").then(JSON.parse),
  readFile(routeMatrixPath, "utf8").then(JSON.parse),
]);

const rowsByScreen = new Map(routeMatrix.rows.map((row) => [row.screenId, row]));
const journeySource = new Map(guide.journeys.map((journey) => [journey.id, journey]));

function evidenceDate(journey) {
  return journey.executionEvidence?.verifiedAt ?? journey.executionEvidence?.contactJourneyEvidence?.verifiedAt ?? null;
}

function hasExecutedEvidence(journey) {
  return Boolean(journey.executionEvidence?.path || journey.backendGuaranteesEvidence?.path);
}

matrix.schemaVersion = 2;
matrix.generatedAt = new Date().toISOString();
matrix.status = "PARTIAL_LOCAL_EXECUTION_PENDING_COMPLETE_E2E_AND_PRODUCTION";
matrix.contract = {
  allowedStatuses: ["VERIFIED", "PARTIAL", "BLOCKED"],
  verifiedMeaning: "A real browser, API and MongoDB journey passed in the declared environment with reviewable evidence.",
  partialMeaning: "Mapping or only a subset of the required browser/API/database journey is evidenced.",
  blockedMeaning: "Execution cannot proceed because a named external prerequisite is unavailable.",
  mocksAreCompletionEvidence: false,
};
matrix.journeys = matrix.journeys.map((journey) => {
  const source = journeySource.get(journey.id);
  if (!source) throw new Error(`Missing structured guide source for ${journey.id}`);
  const routeRows = journey.screenIds.map((screenId) => rowsByScreen.get(screenId)).filter(Boolean);
  const legacyStatus = journey.verificationStatus;
  const executed = hasExecutedEvidence(journey);
  return {
    ...journey,
    actor: source.audience,
    preconditions: source.preconditions,
    uiRoutes: [...new Set(routeRows.map((row) => row.route).filter(Boolean))],
    apis: [...new Set(routeRows.flatMap((row) => row.apiDependencies ?? []))],
    mongoChanges: {
      status: executed ? "EVIDENCE_SCOPED" : "UNVERIFIED",
      collections: [],
      note: executed
        ? "See executionEvidence for the database observations captured by the executed subflow; unlisted collections are not claimed."
        : "No real MongoDB before/after evidence is attached for this complete journey yet.",
    },
    cases: {
      success: executed ? "PARTIAL_EVIDENCE_ATTACHED" : "UNVERIFIED",
      validation: "UNVERIFIED_COMPLETE_JOURNEY",
      empty: "UNVERIFIED_COMPLETE_JOURNEY",
      networkRetry: "UNVERIFIED_COMPLETE_JOURNEY",
      duplicateMutation: journey.backendGuaranteesEvidence ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED",
    },
    permissions: {
      requiredRoles: [...new Set(routeRows.map((row) => row.requiredRole).filter(Boolean))],
      horizontalAccess: journey.backendGuaranteesEvidence ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED",
      currentSessionState: journey.backendGuaranteesEvidence ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED",
    },
    versionAndAudit: {
      expectedVersion409: journey.backendGuaranteesEvidence ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED",
      decisionReason: journey.backendGuaranteesEvidence ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED",
      atomicAuditRollback: journey.backendGuaranteesEvidence ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED",
    },
    environment: {
      local: executed ? "PARTIAL" : "NOT_EXECUTED",
      production: "NOT_EXECUTED_AFTER_CURRENT_COMMIT",
    },
    userGuide: {
      path: matrix.guidePath,
      section: `#${source.sectionId}`,
      journeyId: journey.id,
    },
    executionDate: evidenceDate(journey),
    commit: guide.release.baselineCommit,
    legacyStatus,
    verificationStatus: "PARTIAL",
    incompleteReason: executed
      ? "Only the evidence named on this row is proven; the complete success, failure, retry, permission, MongoDB and Production scope remains open."
      : "Guide and route mapping exist, but no complete real browser/API/MongoDB execution evidence is attached.",
  };
});
matrix.executionSummary = {
  updatedAt: matrix.generatedAt,
  totalJourneys: matrix.journeys.length,
  verified: matrix.journeys.filter((journey) => journey.verificationStatus === "VERIFIED").length,
  partial: matrix.journeys.filter((journey) => journey.verificationStatus === "PARTIAL").length,
  blocked: matrix.journeys.filter((journey) => journey.verificationStatus === "BLOCKED").length,
  localWithAnyExecutionEvidence: matrix.journeys.filter(hasExecutedEvidence).length,
  productionVerified: 0,
  fullyClosed: 0,
};

await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
console.log(JSON.stringify(matrix.executionSummary));
