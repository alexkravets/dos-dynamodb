import { TableOptions } from './getTableOptions';
import { got, type QueryMap } from '@kravc/dos';
import { type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import buildQueryConditionExpression from './buildQueryConditionExpression';

const QUERY_ERROR_TEMPLATE = 'Query parameter "$PATH" is required';

const SORT_ASC = 'asc';

/** Returns partitionKey and sortKey for a query. */
const getKeys = (
  tableOptions: TableOptions,
  indexName?: string
): {
  isGlobalSecondaryIndex: boolean;
  partitionKey: string;
  sortKey: string
} => {
  const {
    primaryKey,
    localSecondaryIndexes,
    globalSecondaryIndexes
  } = tableOptions;

  if (!indexName) {
    return { ...primaryKey, isGlobalSecondaryIndex: false };
  }

  const lsi = localSecondaryIndexes.find(({ name }) => name === indexName);

  if (lsi) {
    const { sortKey } = lsi;

    return { ...primaryKey, sortKey, isGlobalSecondaryIndex: false };
  }

  const gsi = globalSecondaryIndexes.find(({ name }) => name === indexName);

  if (gsi) {
    const { partitionKey, sortKey } = gsi;

    return { partitionKey, sortKey, isGlobalSecondaryIndex: true };
  }

  const indexesJson = JSON.stringify({ localSecondaryIndexes, globalSecondaryIndexes }, null, 2);
  throw new Error(`Index "${indexName}" is not defined, indexes: ${indexesJson}`);
};

/** Builds query command input. */
const buildQueryCommandInput = (
  tableOptions: TableOptions,
  query: QueryMap,
  options: {
    sort: string,
    limit: number,
    indexName?: string,
    exclusiveStartKey?: string
  }
) => {
  const { name: TableName } = tableOptions;

  const {
    sort,
    limit,
    indexName,
    exclusiveStartKey
  } = options;

  const {
    sortKey,
    partitionKey,
    isGlobalSecondaryIndex
  } = getKeys(tableOptions, indexName);

  got(query, partitionKey, QUERY_ERROR_TEMPLATE);

  const {
    ConditionExpression,
    KeyConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  } = buildQueryConditionExpression(query, partitionKey, sortKey);

  const Limit = limit;
  const ConsistentRead = !isGlobalSecondaryIndex;
  const ScanIndexForward = sort === SORT_ASC;

  const input = {
    TableName,
    Limit,
    ConsistentRead,
    ScanIndexForward,
    KeyConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  } as QueryCommandInput;

  if (indexName) {
    input.IndexName = indexName;
  }

  if (ConditionExpression) {
    input.FilterExpression = ConditionExpression;
  }

  if (exclusiveStartKey) {
    input.ExclusiveStartKey = JSON.parse(decodeURIComponent(exclusiveStartKey));
  }

  return input;
};

export default buildQueryCommandInput;
