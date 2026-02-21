import { Document, SortExpressionKey } from '../src';
import { schema, type ActivityAttributes } from './ActivityAttributes';
import { got, type Context, type IndexOptions } from '@kravc/dos';

/** Activity document class. */
class Activity extends Document<ActivityAttributes> {
  /** Returns index query and index name for parameters. */
  static _getIndexQueryProps(
    context: Context,
    query: {
      userId?: string;
      endDate?: string;
      startDate?: string;
      operationId?: string;
      [x: string]: unknown;
    },
  ) {
    const {
      userId,
      endDate,
      startDate,
      operationId,
      ...filterQuery
    } = query;

    /** Returns query for a global secondary index. */
    const getGlobalIndexQuery = (indexName: string, partitionScope: string) => {
      const {
        sortKeyName,
        partitionKeyName,
      } = this.getGlobalIndexProps(indexName);

      const indexQuery = {} as Record<string, string>;

      const organizationId = got(context.identity, 'organizationId');
      indexQuery[partitionKeyName] = `${organizationId}#${partitionScope}`;

      if (startDate) {
        indexQuery[`${sortKeyName}:${SortExpressionKey.GE}`] = `#${startDate}T00:00:00.000Z`;
      }

      if (endDate) {
        indexQuery[`${sortKeyName}:${SortExpressionKey.LE}`] = `#${endDate}T23:59:99.999Z`;
      }

      return indexQuery;
    };

    if (userId) {
      const indexName = 'gsi1';
      const indexQuery = getGlobalIndexQuery(indexName, userId);

      return { indexName, indexQuery: { ...indexQuery, ...filterQuery } };
    }

    if (operationId) {
      const indexName = 'gsi2';
      const indexQuery = getGlobalIndexQuery(indexName, operationId);

      return { indexName, indexQuery: { ...indexQuery, ...filterQuery } };
    }

    const {
      indexName,
      sortKeyName
    } = this.getLocalIndexProps('lsi3');

    const indexQuery = {} as Record<string, string>;

    if (startDate) {
      indexQuery[`${sortKeyName}:${SortExpressionKey.GE}`] = `#${startDate}T00:00:00.000Z`;
    }

    if (endDate) {
      indexQuery[`${sortKeyName}:${SortExpressionKey.LE}`] = `#${endDate}T23:59:99.999Z`;
    }

    return { indexName, indexQuery: { ...indexQuery, ...filterQuery } };
  }

  /** Returns activities. */
  static async indexWithDateRange(
    context: Context,
    query: {
      userId?: string;
      endDate?: string;
      startDate?: string;
      operationId?: string;
      [x: string]: unknown;
    } = {},
    options: IndexOptions = {}
  ) {
    const {
      userId,
      endDate,
      startDate,
      operationId,
    } = query;

    if (userId) {
      const { indexQuery, indexName } = this._getIndexQueryProps(context, query);
      return this.index(context, indexQuery, { ...options, indexName });
    }

    if (operationId) {
      const { indexQuery, indexName } = this._getIndexQueryProps(context, query);
      return this.index(context, indexQuery, { ...options, indexName });
    }

    const hasDateRange = !!startDate || !!endDate;

    if (hasDateRange) {
      const { indexQuery, indexName } = this._getIndexQueryProps(context, query);
      return this.index(context, indexQuery, { ...options, indexName });
    }

    return this.index(context, query, options);
  }
}

Activity.schema = schema;

export default Activity;
