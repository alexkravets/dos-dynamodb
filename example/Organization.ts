import { DocumentWithHashId, ExpressionKey, SortExpressionKey } from '../src';
import { type QueryMap, type Context, type IndexAllOptions } from '@kravc/dos';
import { schema, OrganizationStatus, type OrganizationAttributes } from './OrganizationAttributes';

const PLATFORM_PARTITION = 'PLATFORM';

/** Organization document class. */
class Organization extends DocumentWithHashId<OrganizationAttributes> {
  /** Returns a PLATFORM partition to save a document. */
  static getPartition(): string {
    return PLATFORM_PARTITION;
  }

  /** Returns active assets. */
  static async listActiveOrganizations(
    context: Context,
    query: QueryMap = {},
    options: IndexAllOptions = {}
  ) {
    const status = OrganizationStatus.ACTIVE;

    const {
      indexName,
      sortKeyName,
      partitionKeyName,
    } = this.getGlobalIndexProps('gsi1');

    const indexQuery = {
      [partitionKeyName]: PLATFORM_PARTITION,
      [`${sortKeyName}:${SortExpressionKey.BW}`]: `#${status}`,
    } as Record<string, string>;

    return this.indexAll(context, { ...query, ...indexQuery }, { ...options, indexName });
  }

  /** Disables an organization. */
  static async disable(context: Context, query: QueryMap) {
    query[`status:${ExpressionKey.NOT}`] = OrganizationStatus.DISABLED;

    const mutation = {
      status: OrganizationStatus.DISABLED,
    };

    return this.update(context, query, mutation);
  }

  /** Enables an organization. */
  static async enable(context: Context, query: QueryMap) {
    query[`status:${ExpressionKey.NOT}`] = OrganizationStatus.ACTIVE;

    const mutation = {
      status: OrganizationStatus.ACTIVE,
    };

    return this.update(context, query, mutation);
  }
};

Organization.schema = schema;

export default Organization;
