import { createId } from "@/lib/ids";
import type { PlatformState } from "@/lib/platform-state";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.archive"
  | "product.bulk_status"
  | "product.csv_import"
  | "inventory.adjust"
  | "order.update"
  | "order.bulk_status"
  | "category.save"
  | "category.delete"
  | "collection.save"
  | "collection.delete"
  | "collection.assign"
  | "discount.save"
  | "discount.delete"
  | "customer.update"
  | "user.save"
  | "settings.update"
  | "content.save"
  | "review.moderate"
  | "return.update"
  | "mfa.enroll"
  | "mfa.disable"
  | "admin.login"
  | "admin.login_mfa";

export type AuditEntry = {
  id: string;
  createdAt: string;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  action: AuditAction | string;
  entity: string;
  entityId?: string;
  summary: string;
  meta?: Record<string, unknown>;
};

const MAX_AUDIT_ENTRIES = 2000;

export function appendAudit(
  state: PlatformState,
  entry: Omit<AuditEntry, "id" | "createdAt"> & { createdAt?: string },
) {
  if (!state.auditLogs) state.auditLogs = [];
  state.auditLogs.unshift({
    id: createId("aud"),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    actorId: entry.actorId,
    actorEmail: entry.actorEmail,
    actorRole: entry.actorRole,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: entry.summary,
    meta: entry.meta,
  });
  if (state.auditLogs.length > MAX_AUDIT_ENTRIES) {
    state.auditLogs.length = MAX_AUDIT_ENTRIES;
  }
}
