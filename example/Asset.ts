import { type AssetAttributes, AssetStatus, schema } from './AssetAttributes';
import { Document, ExpressionKey, SortExpressionKey } from '../src';
import { got, type Context, type QueryMap, type IndexOptions } from '@kravc/dos';

/** Asset document class. */
class Asset extends Document<AssetAttributes> {
  /** Returns props for an index query. */
  static _getIndexQueryProps(
    context: Context,
    query: {
      createdBy?: string;
      [x: string]: unknown;
    },
    status: AssetStatus
  ) {
    const indexQuery = {} as Record<string, string>;

    let indexName = 'lsi2';
    let sortKeyName = this.getLocalIndexSortKeyName(indexName);

    const { createdBy, ...filterQuery } = query;

    if (createdBy) {
      indexName = 'gsi1';
      sortKeyName = this.getGlobalIndexSortKeyName(indexName);

      const organizationId = got(context.identity, 'organizationId');
      const partitionKeyName = this.getGlobalIndexPartitionKeyName(indexName);

      indexQuery[partitionKeyName] = `${organizationId}#${createdBy}`;
    }

    indexQuery[`${sortKeyName}:${SortExpressionKey.BW}`] = `#${status}`;

    return {
      indexQuery: { ...indexQuery, ...filterQuery },
      indexName,
    };
  }

  /** Returns active assets. */
  static async indexActiveAssets(context: Context, query: QueryMap = {}, options: IndexOptions = {}) {
    const { indexQuery, indexName } = this._getIndexQueryProps(context, query, AssetStatus.ACTIVE);
    return this.index(context, indexQuery, { ...options, indexName });
  }

  /** Returns archived assets. */
  static async indexArchivedAssets(context: Context, query: QueryMap = {}, options: IndexOptions = {}) {
    const { indexQuery, indexName } = this._getIndexQueryProps(context, query, AssetStatus.ARCHIVED);
    return this.index(context, indexQuery, { ...options, indexName });
  }

  /** Archives an asset. */
  static async archive(context: Context, query: QueryMap) {
    query[`status:${ExpressionKey.NOT}`] = AssetStatus.ARCHIVED;

    const mutation = {
      status: AssetStatus.ARCHIVED,
    };

    return this.update(context, query, mutation);
  }

  /** Unarchives the asset. */
  static async unarchive(context: Context, query: QueryMap) {
    query[`status:${ExpressionKey.NOT}`] = AssetStatus.ACTIVE;

    const mutation = {
      status: AssetStatus.ACTIVE,
    };

    return this.update(context, query, mutation);
  }
}

Asset.schema = schema;

export default Asset;
