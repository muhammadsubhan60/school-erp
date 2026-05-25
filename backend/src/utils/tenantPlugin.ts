import { Schema, Query } from 'mongoose';

/**
 * Auto-injects orgId from the query context into all find/update/delete operations.
 * Without this, a missing orgId would expose one tenant's data to another.
 * Every query must carry orgId — this is the enforcement point.
 */
export function tenantPlugin(schema: Schema): void {
  // Ensure orgId is always present before executing queries
  const enforceOrgId = function (this: Query<unknown, unknown>) {
    const opts = this.getOptions() as { _skipTenantCheck?: boolean };
    if (opts._skipTenantCheck) return;

    const filter = this.getFilter();
    if (!filter.orgId && !filter._id) {
      throw new Error(
        'TENANT_ISOLATION_VIOLATION: orgId is required on all queries. ' +
          `Collection: ${this.model.modelName}`
      );
    }
  };

  schema.pre('find', enforceOrgId);
  schema.pre('findOne', enforceOrgId);
  schema.pre('findOneAndUpdate', enforceOrgId);
  schema.pre('updateMany', enforceOrgId);
  schema.pre('deleteMany', enforceOrgId);
  schema.pre('deleteOne', enforceOrgId);
  schema.pre('countDocuments', enforceOrgId);
}

/**
 * Skip tenant enforcement for admin-level queries (e.g. Super Admin cross-org lookups).
 * Use sparingly — only in Super Admin service layer.
 */
export function withoutTenantEnforcement<T>(
  query: Query<T, unknown>
): Query<T, unknown> {
  return query.setOptions({ _skipTenantCheck: true });
}
