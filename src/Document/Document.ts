import config from 'config';
import { composeIndexKeys } from './helpers';
import { get, set, unset, cloneDeep } from 'lodash';
import Table, { type ItemAttributes, SortExpressionKey } from '../Table';
import {
  type Context,
  type QueryMap,
  type MutationMap,
  type IndexOptions,
  type IndexAllOptions,
  got,
  MemoryDocument,
  DocumentExistsError,
  DocumentNotFoundError,
} from '@kravc/dos';

const DEFAULT_PARTITION_PATH = 'identity.organizationId';

const QUERY_ERROR_TEMPLATE = 'Query parameter "$PATH" is required';
const ATTRIBUTE_ERROR_TEMPLATE = 'Attribute "$PATH" is required';

const INDEX_ALL_LIMIT = 300;
const INDEX_LIMIT_MAX = 999;

/*
 * The table of each document class, made at its first read: a class has
 * keys of its own, so a table is never the one of a parent class.
 */
const tables = new WeakMap<object, Table>();

/** Document class with DynamoDB database interface. */
class Document<T> extends MemoryDocument<T> {
  /** Returns the table used to store a document, the same at every read. */
  static get table(): Table {
    let table = tables.get(this);

    if (!table) {
      table = new Table({
        sortKey: this.idKey,
        partitionKey: this.partitionKey,
      });

      tables.set(this, table);
    }

    return table;
  }

  /** Returns prefix for new document IDs. */
  static get idPrefix(): string {
    return config.get(`idPrefixes.${this.name}`);
  }

  /** Returns context path to get partition value from. */
  static get partitionContextPath() {
    return DEFAULT_PARTITION_PATH;
  }

  /** Returns the partition to save a document to. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getPartition(context: Context, _parameters: Record<string, unknown>): string {
    const errorTemplate = 'Context is missing "$PATH", partition is not defined';
    const partition = got(context, this.partitionContextPath, errorTemplate) as string;

    return partition;
  }

  /** Defines limit maximum value for index action. */
  static get indexLimitMax(): number {
    return INDEX_LIMIT_MAX;
  }

  /** Returns sort key name for a local secondary index. */
  static getLocalIndexSortKeyName(indexName: string): string {
    return this.table.options.getLocalIndexSortKeyName(indexName);
  }

  /** Returns partition key name for a global secondary index. */
  static getGlobalIndexPartitionKeyName(indexName: string): string {
    return this.table.options.getGlobalIndexPartitionKeyName(indexName);
  }

  /** Returns sort key name for a global secondary index. */
  static getGlobalIndexSortKeyName(indexName: string): string {
    return this.table.options.getGlobalIndexSortKeyName(indexName);
  }

  /** Returns true if local index, false if global index. */
  static isLocalSecondaryIndex(indexName: string): boolean {
    return this.table.options.isLocalSecondaryIndex(indexName);
  }

  /** Returns local index props. */
  static getLocalIndexProps(indexName: string) {
    return this.table.options.getLocalIndexProps(indexName);
  }

  /** Returns global index props. */
  static getGlobalIndexProps(indexName: string) {
    return this.table.options.getGlobalIndexProps(indexName);
  }

  /** Returns composed index keys. */
  static composeIndexKeys(attributes: ItemAttributes) {
    const idPrefix = this.idPrefix;
    const documentName = this.name;
    const tableOptions = this.table.options;

    return composeIndexKeys({
      idPrefix,
      attributes,
      documentName,
      tableOptions,
    });
  }

  /** Implements the interface to save a document, throws an error if document exists. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async _create<T>(attributes: T, _context: Context): Promise<void> {
    got(attributes, this.idKey, ATTRIBUTE_ERROR_TEMPLATE);
    got(attributes, this.partitionKey, ATTRIBUTE_ERROR_TEMPLATE);

    const indexKeys = this.composeIndexKeys(attributes as ItemAttributes);

    const itemAttributes = cloneDeep({ ...indexKeys, ...attributes }) as ItemAttributes;

    const isCreated = await this.table.createItem(itemAttributes);
    const isDocumentExistsError = !isCreated;

    if (isDocumentExistsError) {
      throw new DocumentExistsError(this, itemAttributes);
    }
  }

  /** Implements the interface to read a document. */
  static async _read<T>(query: QueryMap): Promise<T> {
    got(query, this.idKey, QUERY_ERROR_TEMPLATE);
    got(query, this.partitionKey, ATTRIBUTE_ERROR_TEMPLATE);

    const item = await this.table.getItem(query) as T;

    if (!item) {
      throw new DocumentNotFoundError(this, query);
    }

    return cloneDeep(item);
  }

  /** Implements the interface to update a document. */
  static async _update<T>(query: QueryMap, mutation: MutationMap, _context: Context, previousAttributes: T): Promise<T> {
    got(query, this.idKey, QUERY_ERROR_TEMPLATE);
    got(query, this.partitionKey, QUERY_ERROR_TEMPLATE);

    const indexKeys = this.composeIndexKeys({ ...previousAttributes, ...mutation });

    const item = await this.table.updateItem(query, { ...indexKeys, ...mutation });

    if (!item) {
      throw new DocumentNotFoundError(this, query);
    }

    return cloneDeep(item) as T;
  }

  /** Implements the interface to delete a document. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async _delete<T>(query: QueryMap, _context: Context, _previousAttributes: T): Promise<void> {
    got(query, this.idKey, QUERY_ERROR_TEMPLATE);
    got(query, this.partitionKey, QUERY_ERROR_TEMPLATE);

    const isDeleted = await this.table.deleteItem(query);
    const isDocumentNotFoundError = !isDeleted;

    if (isDocumentNotFoundError) {
      throw new DocumentNotFoundError(this, query);
    }
  }

  /** Returns query that ensures access to the documents collection only. */
  static _getIndexQuery(query: QueryMap, { indexName }: { indexName?: string }): {
    indexQuery: QueryMap,
    indexName?: string
  } {
    const indexQuery = cloneDeep(query);

    if (!indexName) {
      indexQuery[`${this.idKey}:${SortExpressionKey.BW}`] = `${this.idPrefix}_`;

      return { indexQuery, indexName };
    }

    const isLocalSecondaryIndex = this.isLocalSecondaryIndex(indexName);

    if (isLocalSecondaryIndex) {
      return { indexQuery, indexName };
    }

    const partitionKeyName = this.getGlobalIndexPartitionKeyName(indexName);
    const partitionKey = get(indexQuery, partitionKeyName, QUERY_ERROR_TEMPLATE) as string;

    set(indexQuery, partitionKeyName, `${this.idPrefix}#${partitionKey}`);
    unset(indexQuery, this.partitionKey);

    return { indexQuery, indexName };
  }

  /** Implements the interface to get documents in batches. */
  static async _index<T>(query: QueryMap, options: IndexOptions): Promise<{
    limit: number;
    count: number;
    items: T[];
    lastEvaluatedKey?: string;
  }> {
    const sort = get(options, 'sort', this.indexDefaultSort);
    const limit = get(options, 'limit', this.indexDefaultLimit);
    const exclusiveStartKey = get(options, 'exclusiveStartKey');

    const { indexQuery, indexName } = this._getIndexQuery(query, options);

    const { items, count, lastEvaluatedKey } = await this.table.listItems(indexQuery, {
      sort,
      limit,
      indexName,
      exclusiveStartKey,
    });

    return {
      items: items as T[],
      limit,
      count,
      lastEvaluatedKey,
    };
  }

  /** Implements the interface to get all documents. */
  static async _indexAll<T>(
    query: QueryMap,
    options: IndexAllOptions
  ): Promise<{
    count: number;
    items: T[];
  }> {
    let resultItems = [] as T[];
    let exclusiveStartKey: string | undefined;

    const limit = INDEX_ALL_LIMIT;
    const indexOptions = { limit, ...options } as IndexOptions;

    do {
      if (exclusiveStartKey) {
        indexOptions.exclusiveStartKey = exclusiveStartKey;
      }

      const { items, lastEvaluatedKey: nextExclusiveStartKey } =
        await this._index(query, indexOptions);

      resultItems = [ ...resultItems, ...(items as T[]) ];
      exclusiveStartKey = nextExclusiveStartKey;

    } while (exclusiveStartKey);

    const count = resultItems.length;

    return {
      items: resultItems,
      count
    };
  }
}

export default Document;
