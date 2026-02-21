import { Schema, Validator } from '@kravc/schema';
import { Asset, Activity, Organization } from '../../../example';
import { Context, type Identity, type Request, type LambdaRequest, type ExtraContext } from '@kravc/dos';

const operationId = 'CreateAsset';

const DEFAULT_LAMBDA_REQUEST = {
  headers: {},
  operationId,
} as LambdaRequest;

type Props = {
  request?: Request;
  schemas?: Schema[];
  identity?: Identity;
  extraContext?: ExtraContext;
};

/** Deletes and recreates the table. */
export const resetTable = async () => await Asset.table.reset();

/** Creates an instance of an operation context. */
export const createContext = (props: Props = {}): Context => {
  const {
    request = DEFAULT_LAMBDA_REQUEST,
    schemas = [ Asset.schema, Activity.schema, Organization.schema ],
    identity = {
      sub: 'USR_1',
      organizationId: 'ORG_1',
      email: 'john.doe@example.com',
      lastName: 'Doe',
      firstName: 'John',
    },
    extraContext = {},
  } = props;

  const validator = new Validator(schemas);

  const spec = {
    basePath: '/api',
    paths: {
      [`/${operationId}`]: {
        post: {
          operationId,
        },
      }
    }
  };

  const context = new Context({ spec, validator }, request, extraContext);
  context.identity = identity;

  return context;
};

/** Creates an asset. */
export const createAsset = async (extraAttributes: Record<string, unknown> = {}) => {
  const context = createContext();

  const attributes = {
    name: 'Text Document',
    tags: [ 'Tag A', 'Tag B' ],
    type: 'CONTENT',
    status: 'ACTIVE',
    content: 'Text document content.',
    ...extraAttributes,
  };

  const asset = await Asset.create(context, attributes);

  return asset;
};

/** Creates an activity. */
export const createActivity = async (extraAttributes: Record<string, unknown> = {}) => {
  const context = createContext();

  const attributes = {
    operationId: 'CreateAsset',
    summaryTemplate: 'Asset "Text Document" has been created by {user:createdBy}',
    parametersJson: '{ "mutation": { "name": "Text Document" } }',
    resultDocumentJson: '{ "name": "Text Document", "createdBy": "USR_1" }',
    userId: 'USR_1',
    traceId: 'TRACE_ID',
    userAgent: 'USER_AGENT',
    ipAddress: '127.0.0.1',
    identity: {
      sub: 'USR_1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      permissions: [ 'assets-write' ],
    },
    ...extraAttributes,
  };

  const activity = await Activity.create(context, attributes);

  return activity;
};

/** Creates an organization. */
export const createOrganization = async (extraAttributes: Record<string, unknown> = {}) => {
  const context = createContext();

  const attributes = {
    name: 'Organization 1',
    status: 'ACTIVE',
    ...extraAttributes,
  };

  const organization = await Organization.create(context, attributes);

  return organization;
};
