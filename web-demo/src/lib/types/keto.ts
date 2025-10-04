/**
 * Keto Authorization Types
 * Types for Keto relation tuples and permission checks
 */

export interface RelationTuple {
  namespace: string;
  object: string;
  relation: string;
  subject_id?: string;
  subject_set?: {
    namespace: string;
    object: string;
    relation: string;
  };
}

export interface PermissionCheckRequest {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
}

export interface PermissionCheckResponse {
  allowed: boolean;
}

export type CreateRelationRequest = RelationTuple;

export type DeleteRelationRequest = RelationTuple;

export interface ListRelationsRequest {
  namespace: string;
  object?: string;
  relation?: string;
  subject_id?: string;
}

export interface ListRelationsResponse {
  relation_tuples: RelationTuple[];
}

// Permission action types
export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

// Resource types
export type ResourceType = 'user' | 'product' | 'category';

// Helper type for permission check builders
export interface PermissionCheck {
  resource: ResourceType;
  action: PermissionAction;
  tenantId?: string;
  userId: string;
}
