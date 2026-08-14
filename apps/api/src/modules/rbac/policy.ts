import {
  rbacAvailableActionKeySchema,
  rbacResourceStateKeySchema,
  type AuthRoleType,
  type RbacObjectScopeRelation,
  type RbacPermission
} from '@sadat-real-estate/contracts';

export interface ObjectAuthorizationPrincipal {
  actorId: string;
  role: AuthRoleType;
  permissions: readonly RbacPermission[];
  reviewScopeIds?: readonly string[];
}

export interface ObjectAuthorizationResource {
  state: string;
  ownerId?: string;
  assignedActorIds?: readonly string[];
  reviewScopeIds?: readonly string[];
}

export interface ObjectActionRule<Action extends string = string> {
  action: Action;
  roles: readonly AuthRoleType[];
  permission?: RbacPermission;
  states: readonly string[];
  scopes: readonly RbacObjectScopeRelation[];
}

export interface ObjectAuthorizationContext {
  principal: ObjectAuthorizationPrincipal;
  resource: ObjectAuthorizationResource;
}

export class ObjectAuthorizationError extends Error {
  readonly code = 'RBAC_OBJECT_FORBIDDEN' as const;

  constructor() {
    super('RBAC_OBJECT_FORBIDDEN');
    this.name = 'ObjectAuthorizationError';
  }
}

function intersects(left: readonly string[] = [], right: readonly string[] = []): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const rightValues = new Set(right);
  return left.some((value) => rightValues.has(value));
}

function matchesScope(
  context: ObjectAuthorizationContext,
  scope: RbacObjectScopeRelation,
  hasRequiredPermission: boolean
): boolean {
  if (scope === 'owner') {
    return context.resource.ownerId !== undefined
      && context.resource.ownerId === context.principal.actorId;
  }
  if (scope === 'assigned') {
    return context.resource.assignedActorIds?.includes(context.principal.actorId) ?? false;
  }
  if (scope === 'review_scope') {
    return intersects(context.principal.reviewScopeIds, context.resource.reviewScopeIds);
  }
  return context.principal.role === 'admin' && hasRequiredPermission;
}

function ruleAllows<Action extends string>(
  context: ObjectAuthorizationContext,
  rule: ObjectActionRule<Action>
): boolean {
  if (!rbacAvailableActionKeySchema.safeParse(rule.action).success) return false;
  if (!rbacResourceStateKeySchema.safeParse(context.resource.state).success) return false;
  if (!rule.roles.includes(context.principal.role)) return false;
  if (!rule.states.includes(context.resource.state)) return false;
  if (rule.scopes.length === 0) return false;

  const hasRequiredPermission = rule.permission !== undefined
    && context.principal.permissions.includes(rule.permission);
  if (rule.permission !== undefined && !hasRequiredPermission) return false;

  // Administrative object access always needs an explicit capability. A global
  // relation also needs that capability, regardless of the declared role.
  if (context.principal.role === 'admin' && rule.permission === undefined) return false;
  if (rule.scopes.includes('global') && rule.permission === undefined) return false;

  return rule.scopes.some((scope) => matchesScope(context, scope, hasRequiredPermission));
}

export function isObjectActionAllowed<Action extends string>(
  context: ObjectAuthorizationContext,
  rules: readonly ObjectActionRule<Action>[],
  action: Action
): boolean {
  return rules.some((rule) => rule.action === action && ruleAllows(context, rule));
}

export function requireObjectAction<Action extends string>(
  context: ObjectAuthorizationContext,
  rules: readonly ObjectActionRule<Action>[],
  action: Action
): void {
  if (!isObjectActionAllowed(context, rules, action)) {
    throw new ObjectAuthorizationError();
  }
}

export function deriveAvailableActions<Action extends string>(
  context: ObjectAuthorizationContext,
  rules: readonly ObjectActionRule<Action>[]
): Action[] {
  const available = new Set<Action>();
  for (const rule of rules) {
    if (ruleAllows(context, rule)) available.add(rule.action);
  }
  return [...available];
}
