import fs from 'node:fs';

const openapiPath = 'apps/api/openapi/openapi.json';
const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const error = (name) => ({ $ref: `#/components/responses/${name}` });
const success = (name) => ({
  allOf: [
    ref('SuccessEnvelope'),
    { type: 'object', required: ['data'], properties: { data: ref(name) } }
  ]
});
const idParameter = {
  name: 'adminId',
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-f0-9]{24}$' }
};
const auth = [{ bearerAuth: [] }];
const validation = error('ValidationError');
const rbacError = error('RbacError');

openapi.paths['/api/v1/admin/admin-users'] = {
  get: {
    operationId: 'listAdminAdministrators',
    summary: 'List administrator accounts for an authorized administrator',
    description: 'Requires admin:staff.view. The response is a safe administrator projection and never contains credentials or password material.',
    security: auth,
    parameters: [
      { name: 'status', in: 'query', schema: ref('AdminUserStatus') },
      { name: 'accessLevel', in: 'query', schema: ref('AdminAccessLevel') },
      { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
      { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
    ],
    responses: {
      '200': { description: 'Administrator account list', content: { 'application/json': { schema: success('AdminUserListData') } } },
      '400': validation,
      '401': rbacError,
      '403': rbacError,
      '500': rbacError
    }
  },
  post: {
    operationId: 'createAdminAdministrator',
    summary: 'Create an administrator account',
    description: 'Requires admin:staff.manage. Credentials are provisioned through the approved authentication boundary and are never accepted or returned here.',
    security: auth,
    requestBody: { required: true, content: { 'application/json': { schema: ref('AdminUserCreate') } } },
    responses: {
      '201': { description: 'Created administrator account', content: { 'application/json': { schema: success('AdminUserData') } } },
      '400': validation,
      '401': rbacError,
      '403': rbacError,
      '409': rbacError,
      '500': rbacError
    }
  }
};

openapi.paths['/api/v1/admin/admin-users/{adminId}'] = {
  get: {
    operationId: 'getAdminAdministrator',
    summary: 'Get one administrator account',
    description: 'Requires admin:staff.view. The response is a safe administrator projection without credentials, audit data, or internal authorization records.',
    security: auth,
    parameters: [idParameter],
    responses: {
      '200': { description: 'Administrator account', content: { 'application/json': { schema: success('AdminUserData') } } },
      '400': validation,
      '401': rbacError,
      '403': rbacError,
      '404': rbacError,
      '500': rbacError
    }
  },
  patch: {
    operationId: 'updateAdminAdministrator',
    summary: 'Update, disable, or enable an administrator account',
    description: 'Requires admin:staff.manage. Updates use an expected version and a bounded reason; self-lockout and removal of the last active Super Admin are rejected.',
    security: auth,
    parameters: [idParameter],
    requestBody: { required: true, content: { 'application/json': { schema: ref('AdminUserPatch') } } },
    responses: {
      '200': { description: 'Updated administrator account', content: { 'application/json': { schema: success('AdminUserData') } } },
      '400': validation,
      '401': rbacError,
      '403': rbacError,
      '404': rbacError,
      '409': rbacError,
      '500': rbacError
    }
  }
};

Object.assign(openapi.components.schemas, {
  AdminAccessLevel: { type: 'string', enum: ['super_admin', 'standard_admin'] },
  AdminUserStatus: { type: 'string', enum: ['active', 'disabled'] },
  AdminUserAvailableAction: { type: 'string', enum: ['update', 'disable', 'enable'] },
  AdminUserCreate: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'displayName', 'accessLevel'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      displayName: { type: 'string', minLength: 2, maxLength: 160 },
      accessLevel: ref('AdminAccessLevel')
    }
  },
  AdminUserPatch: {
    type: 'object',
    additionalProperties: false,
    minProperties: 3,
    required: ['expectedVersion', 'reason'],
    properties: {
      expectedVersion: { type: 'integer', minimum: 0 },
      reason: { type: 'string', minLength: 3, maxLength: 500 },
      email: { type: 'string', format: 'email', maxLength: 254 },
      displayName: { type: 'string', minLength: 2, maxLength: 160 },
      accessLevel: ref('AdminAccessLevel'),
      status: ref('AdminUserStatus')
    }
  },
  AdminUserData: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'email', 'displayName', 'accessLevel', 'status', 'version', 'createdAt', 'updatedAt', 'availableActions'],
    properties: {
      id: { type: 'string', pattern: '^[a-f0-9]{24}$' },
      email: { type: 'string', format: 'email', maxLength: 254 },
      displayName: { type: 'string', minLength: 2, maxLength: 160 },
      accessLevel: ref('AdminAccessLevel'),
      status: ref('AdminUserStatus'),
      version: { type: 'integer', minimum: 0 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      disabledAt: { type: 'string', format: 'date-time' },
      availableActions: { type: 'array', items: ref('AdminUserAvailableAction'), maxItems: 3, uniqueItems: true }
    }
  },
  AdminUserListData: {
    type: 'object',
    additionalProperties: false,
    required: ['items', 'page', 'limit', 'total'],
    properties: {
      items: { type: 'array', items: ref('AdminUserData'), maxItems: 100 },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      total: { type: 'integer', minimum: 0 }
    }
  }
});
fs.writeFileSync(openapiPath, `${JSON.stringify(openapi, null, 2)}\n`);

const postmanPath = 'apps/api/postman/Sadat-Real-Estate.postman_collection.json';
const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
postman.variable = Array.isArray(postman.variable) ? postman.variable : [];
if (!postman.variable.some((item) => item?.key === 'syntheticBearer')) {
  postman.variable.push({ key: 'syntheticBearer', value: 'synthetic-admin-token', type: 'string' });
}
postman.item = (Array.isArray(postman.item) ? postman.item : []).filter(
  (item) => item?.name !== 'Administrator Accounts'
);
const authHeader = [{ key: 'Authorization', value: 'Bearer {{syntheticBearer}}' }];
const jsonHeader = [...authHeader, { key: 'Content-Type', value: 'application/json' }];
const request = (method, raw, path, body, description) => ({
  name: description,
  request: {
    method,
    header: body === undefined ? authHeader : jsonHeader,
    ...(body === undefined ? {} : { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } }),
    url: { raw, host: ['{{apiV1BaseUrl}}'], path }
  }
});
postman.item.push({
  name: 'Administrator Accounts',
  item: [
    request('GET', '{{apiV1BaseUrl}}/admin/admin-users?page=1&limit=20', ['admin', 'admin-users'], undefined, 'List Administrator Accounts'),
    request('GET', '{{apiV1BaseUrl}}/admin/admin-users/:adminId', ['admin', 'admin-users', ':adminId'], undefined, 'Get Administrator Account'),
    request('POST', '{{apiV1BaseUrl}}/admin/admin-users', ['admin', 'admin-users'], { email: 'synthetic.admin@example.com', displayName: 'Synthetic Admin', accessLevel: 'standard_admin' }, 'Create Administrator Account'),
    request('PATCH', '{{apiV1BaseUrl}}/admin/admin-users/:adminId', ['admin', 'admin-users', ':adminId'], { expectedVersion: 0, status: 'disabled', reason: 'Disable a synthetic administrator' }, 'Update Administrator Account')
  ]
});
fs.writeFileSync(postmanPath, `${JSON.stringify(postman, null, 2)}\n`);
