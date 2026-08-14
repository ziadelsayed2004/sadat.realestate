import {
  Schema,
  type Connection,
  type HydratedDocument,
  type Model,
  type Types
} from 'mongoose';
import {
  ACCOUNT_TRANSITION_ACTIONS,
  AUTH_ACCOUNT_STATES,
  AUTH_ROLE_TYPES,
  PROVIDER_APPLICATION_STATES,
  type AccountTransitionAction,
  type AuthAccountState,
  type AuthRoleType,
  type ProviderApplicationState
} from '@sadat-real-estate/contracts';

export interface AccountStateTransitionRecord {
  targetUserId: Types.ObjectId;
  providerApplicationId?: Types.ObjectId;
  actorAdminId: Types.ObjectId;
  targetRoleType: AuthRoleType;
  action: AccountTransitionAction;
  fromAccountStatus: AuthAccountState;
  toAccountStatus: AuthAccountState;
  fromProviderStatus?: ProviderApplicationState;
  toProviderStatus?: ProviderApplicationState;
  reason: string;
  requestId: string;
  traceId: string;
  createdAt: Date;
}

export type AccountStateTransitionDocument = HydratedDocument<AccountStateTransitionRecord>;

export interface AccountModels {
  AccountStateTransition: Model<AccountStateTransitionRecord>;
}

const transitionSchema = new Schema<AccountStateTransitionRecord>({
  targetUserId: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
    ref: 'User'
  },
  providerApplicationId: {
    type: Schema.Types.ObjectId,
    immutable: true,
    ref: 'ProviderApplication'
  },
  actorAdminId: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
    ref: 'User'
  },
  targetRoleType: {
    type: String,
    enum: AUTH_ROLE_TYPES,
    required: true,
    immutable: true
  },
  action: {
    type: String,
    enum: ACCOUNT_TRANSITION_ACTIONS,
    required: true,
    immutable: true
  },
  fromAccountStatus: {
    type: String,
    enum: AUTH_ACCOUNT_STATES,
    required: true,
    immutable: true
  },
  toAccountStatus: {
    type: String,
    enum: AUTH_ACCOUNT_STATES,
    required: true,
    immutable: true
  },
  fromProviderStatus: { type: String, enum: PROVIDER_APPLICATION_STATES, immutable: true },
  toProviderStatus: { type: String, enum: PROVIDER_APPLICATION_STATES, immutable: true },
  reason: {
    type: String,
    required: true,
    immutable: true,
    trim: true,
    minlength: 3,
    maxlength: 1_000,
    validate: {
      validator: (value: string) => !/[\u0000-\u001f\u007f]/.test(value),
      message: 'Transition reason must not contain control characters'
    }
  },
  requestId: {
    type: String,
    required: true,
    immutable: true,
    maxlength: 128,
    match: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
  },
  traceId: {
    type: String,
    required: true,
    immutable: true,
    match: /^[0-9a-f]{32}$/
  }
}, {
  collection: 'account_state_transitions',
  strict: 'throw',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false
});

transitionSchema.index(
  { targetUserId: 1, createdAt: -1 },
  { name: 'account_state_transitions_target_created' }
);
transitionSchema.index(
  { providerApplicationId: 1, createdAt: -1 },
  {
    name: 'account_state_transitions_provider_created',
    partialFilterExpression: { providerApplicationId: { $type: 'objectId' } }
  }
);
transitionSchema.index(
  { actorAdminId: 1, createdAt: -1 },
  { name: 'account_state_transitions_actor_created' }
);

export function createAccountModels(connection: Connection): AccountModels {
  return {
    AccountStateTransition: (
      connection.models.AccountStateTransition as Model<AccountStateTransitionRecord> | undefined
    ) ?? connection.model<AccountStateTransitionRecord>(
      'AccountStateTransition',
      transitionSchema
    )
  };
}
