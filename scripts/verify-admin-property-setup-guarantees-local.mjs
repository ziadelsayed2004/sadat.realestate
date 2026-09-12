import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import mongoose from "mongoose";
import { createAuditModels } from "../apps/api/src/modules/audit/models.ts";
import { createMongooseAuditWriter } from "../apps/api/src/modules/audit/writer.ts";
import { createFeatureService } from "../apps/api/src/modules/taxonomy/features.ts";
import { createTaxonomyRuntime } from "../apps/api/src/modules/taxonomy/runtime.ts";
import { createLocationModels } from "../apps/api/src/modules/locations/models.ts";
import { createMongooseLocationRepository } from "../apps/api/src/modules/locations/repository.ts";
import { createProjectModels } from "../apps/api/src/modules/projects/models.ts";
import { createMongooseProjectRepository } from "../apps/api/src/modules/projects/repository.ts";
import { createModerationModels } from "../apps/api/src/modules/moderation/models.ts";
import { createMongooseModerationRepository } from "../apps/api/src/modules/moderation/repository.ts";

const database = `admin_property_setup_${randomUUID().replaceAll("-", "")}`;
const connection = await mongoose
  .createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`)
  .asPromise();
connection.base.set("transactionAsyncLocalStorage", true);
const report = {
  status: "RUNNING",
  journey: "GUIDE-20",
  journeys: ["GUIDE-20"],
  mockedRoutes: false,
  environment: "isolated-local-MongoDB",
  faultInjection:
    "durable audit throws after insert inside each mutation transaction",
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  startedAt: new Date().toISOString(),
  checks: [],
  cleanup: false,
};

try {
  const audits = createAuditModels(connection);
  const locations = createLocationModels(connection);
  const projects = createProjectModels(connection);
  const moderation = createModerationModels(connection);
  const authorization = {
    async authorize() {
      return true;
    },
  };
  const actorId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const now = new Date("2026-09-12T20:00:00.000Z");
  const context = {
    requestId: "guide20-atomic-request",
    traceId: "a".repeat(32),
  };
  await Promise.all([
    audits.AuditLog.init(),
    locations.Location.init(),
    projects.Project.init(),
    moderation.PropertyReport.init(),
  ]);

  const durable = createMongooseAuditWriter(audits);
  let failAudit = true;
  const audit = {
    async record(entry, session) {
      const id = await durable.record(entry, session);
      if (failAudit) throw new Error("INJECTED_GUIDE20_AUDIT_FAILURE");
      return id;
    },
  };

  const taxonomy = createTaxonomyRuntime(
    connection,
    {},
    audit,
    authorization,
  ).service;
  const taxonomyInput = {
    kind: "category",
    name: { ar: "اختبار ذري", en: "Atomic taxonomy" },
    slug: "atomic-taxonomy",
    order: 1,
    active: true,
    reason: "Atomic taxonomy creation",
  };
  await assert.rejects(
    taxonomy.create({ userId: actorId.toHexString() }, taxonomyInput, context),
    /INJECTED_GUIDE20_AUDIT_FAILURE/u,
  );
  assert.equal(
    await connection
      .collection("property_taxonomy")
      .countDocuments({ slug: taxonomyInput.slug }),
    0,
  );
  assert.equal(
    await audits.AuditLog.countDocuments({ action: "taxonomy.create" }),
    0,
  );
  report.checks.push(
    "taxonomy_audit_failure_rolls_back_record_and_inserted_audit",
  );

  const features = createFeatureService(connection, audit, authorization);
  const featureInput = {
    kind: "feature",
    groupKey: "guide_atomic",
    name: { ar: "ميزة ذرية", en: "Atomic feature" },
    slug: "atomic-feature",
    order: 1,
    active: true,
    reason: "Atomic feature creation",
  };
  await assert.rejects(
    features.create(actorId.toHexString(), featureInput, context),
    /INJECTED_GUIDE20_AUDIT_FAILURE/u,
  );
  assert.equal(
    await connection
      .collection("features_services")
      .countDocuments({ slug: featureInput.slug }),
    0,
  );
  assert.equal(
    await audits.AuditLog.countDocuments({ action: "feature.create" }),
    0,
  );
  report.checks.push(
    "feature_audit_failure_rolls_back_record_and_inserted_audit",
  );

  const locationRepository = createMongooseLocationRepository(
    connection,
    locations,
    audit,
  );
  const locationInput = {
    location: {
      kind: "location",
      name: { ar: "موقع ذري", en: "Atomic location" },
      slug: "atomic-location",
      order: 1,
      active: true,
    },
    metadata: {
      actorId: actorId.toHexString(),
      reason: "Atomic location creation",
      requestId: context.requestId,
      traceId: "b".repeat(32),
      changedAt: now,
    },
  };
  await assert.rejects(
    locationRepository.create(locationInput),
    /INJECTED_GUIDE20_AUDIT_FAILURE/u,
  );
  assert.equal(
    await locations.Location.countDocuments({ slug: "atomic-location" }),
    0,
  );
  assert.equal(
    await audits.AuditLog.countDocuments({ action: "location.create" }),
    0,
  );
  report.checks.push(
    "location_audit_failure_rolls_back_record_and_inserted_audit",
  );

  const projectId = new mongoose.Types.ObjectId();
  await projects.Project.create({
    _id: projectId,
    providerId,
    name: { ar: "مشروع ذري", en: "Atomic project" },
    slug: "atomic-project",
    status: "pending_review",
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  const projectRepository = createMongooseProjectRepository(
    connection,
    projects,
    audit,
  );
  const beforeProject = await projectRepository.findByIdAny(
    projectId.toHexString(),
  );
  assert.ok(beforeProject);
  const projectReview = {
    id: projectId.toHexString(),
    expectedVersion: 0,
    toStatus: "approved",
    reviewerId: actorId.toHexString(),
    before: beforeProject,
    metadata: {
      actorId: actorId.toHexString(),
      reason: "Atomic project approval",
      requestId: context.requestId,
      traceId: "c".repeat(32),
      changedAt: now,
    },
  };
  await assert.rejects(
    projectRepository.review(projectReview),
    /INJECTED_GUIDE20_AUDIT_FAILURE/u,
  );
  const projectAfterFailure = await projects.Project.findById(projectId).lean();
  assert.equal(projectAfterFailure?.status, "pending_review");
  assert.equal(projectAfterFailure?.version, 0);
  assert.equal(
    await audits.AuditLog.countDocuments({ targetId: projectId.toHexString() }),
    0,
  );
  report.checks.push(
    "project_review_audit_failure_rolls_back_state_version_and_inserted_audit",
  );

  const reportId = new mongoose.Types.ObjectId();
  const propertyId = new mongoose.Types.ObjectId();
  await moderation.PropertyReport.create({
    _id: reportId,
    propertyId,
    reporterId: providerId,
    reason: "inaccurate",
    details: "Atomic property report",
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
  const moderationRepository = createMongooseModerationRepository(
    connection,
    moderation,
    audit,
  );
  const resolution = {
    reportId: reportId.toHexString(),
    expectedVersion: 0,
    action: "resolve",
    adminId: actorId.toHexString(),
    reason: "Atomic report resolution",
    requestId: context.requestId,
    traceId: "d".repeat(32),
    now,
  };
  await assert.rejects(
    moderationRepository.resolve(resolution),
    /INJECTED_GUIDE20_AUDIT_FAILURE/u,
  );
  const reportAfterFailure =
    await moderation.PropertyReport.findById(reportId).lean();
  assert.equal(reportAfterFailure?.status, "open");
  assert.equal(reportAfterFailure?.version, 0);
  assert.equal(
    await audits.AuditLog.countDocuments({ targetId: reportId.toHexString() }),
    0,
  );
  report.checks.push(
    "property_report_audit_failure_rolls_back_state_version_and_inserted_audit",
  );

  failAudit = false;
  const createdTaxonomy = await taxonomy.create(
    { userId: actorId.toHexString() },
    taxonomyInput,
    { ...context, requestId: "guide20-taxonomy-retry" },
  );
  const createdFeature = await features.create(
    actorId.toHexString(),
    featureInput,
    { ...context, requestId: "guide20-feature-retry" },
  );
  const createdLocation = await locationRepository.create({
    ...locationInput,
    metadata: {
      ...locationInput.metadata,
      requestId: "guide20-location-retry",
    },
  });
  assert.equal(createdLocation.kind, "written");
  const updatedLocation = await locationRepository.update({
    id: createdLocation.location.id,
    expectedVersion: 0,
    changes: { order: 2 },
    before: createdLocation.location,
    metadata: { ...locationInput.metadata, requestId: "guide20-location-update" },
  });
  assert.equal(updatedLocation.kind, "written");
  const deletedLocation = await locationRepository.delete({
    id: updatedLocation.location.id,
    expectedVersion: 1,
    before: updatedLocation.location,
    metadata: { ...locationInput.metadata, requestId: "guide20-location-delete" },
  });
  const approvedProject = await projectRepository.review({
    ...projectReview,
    metadata: { ...projectReview.metadata, requestId: "guide20-project-retry" },
  });
  const resolvedReport = await moderationRepository.resolve({
    ...resolution,
    requestId: "guide20-report-retry",
  });
  assert.equal(createdTaxonomy.version, 0);
  assert.equal(createdFeature.version, 0);
  assert.equal(deletedLocation.kind, "deleted");
  assert.equal(approvedProject.kind, "written");
  assert.equal(resolvedReport.kind, "written");
  assert.equal(await audits.AuditLog.countDocuments(), 7);
  report.checks.push("retries_write_each_record_and_exactly_one_audit");

  const staleProject = await projectRepository.review({
    ...projectReview,
    toStatus: "rejected",
    metadata: { ...projectReview.metadata, requestId: "guide20-project-stale" },
  });
  const staleReport = await moderationRepository.resolve({
    ...resolution,
    action: "dismiss",
    requestId: "guide20-report-stale",
  });
  assert.equal(staleProject.kind, "version_conflict");
  assert.equal(staleReport.kind, "version_conflict");
  assert.equal(await audits.AuditLog.countDocuments(), 7);
  report.checks.push("stale_versions_conflict_without_extra_audits");
  report.mongo = {
    failedMutationResidue: 0,
    retryAuditCount: 7,
    projectStatus: "approved",
    propertyReportStatus: "resolved",
  };
  report.status = "PASS_LOCAL";
} catch (error) {
  report.status = "FAIL_LOCAL";
  report.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  try {
    assert.equal(connection.name, database);
    await connection.dropDatabase();
    report.cleanup =
      (await connection.db.listCollections().toArray()).length === 0;
    assert.equal(report.cleanup, true);
  } catch (error) {
    report.status = "FAIL_LOCAL";
    report.cleanup = false;
    report.cleanupFailure =
      error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  }
  await connection.close();
  report.finishedAt = new Date().toISOString();
  await mkdir("docs/quality/guide-runs", { recursive: true });
  await writeFile(
    "docs/quality/guide-runs/admin-property-setup-guarantees-local-latest.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

console.log(
  JSON.stringify({
    status: report.status,
    checks: report.checks.length,
    cleanup: report.cleanup,
    failure: report.failure,
  }),
);
