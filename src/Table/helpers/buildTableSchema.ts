import { uniq } from 'lodash';
import type { TableOptions, PrimaryKey, LSI, GSI } from './getTableOptions';
import {
  type CreateTableInput,
  type LocalSecondaryIndex,
  type GlobalSecondaryIndex
} from '@aws-sdk/client-dynamodb';

const ProvisionedThroughput = {
  ReadCapacityUnits: 1,
  WriteCapacityUnits: 1,
};

const Projection = {
  ProjectionType: 'ALL'
};

/** Returns attribute definitions for table schema. */
const getAttributeDefinitions = (
  primaryKey: PrimaryKey,
  localSecondaryIndexes: LSI[],
  globalSecondaryIndexes: GSI[]
) => {
  const { partitionKey, sortKey } = primaryKey;

  let attributes = [ partitionKey, sortKey ];

  for (const localIndexKey in localSecondaryIndexes) {
    const { sortKey } = localSecondaryIndexes[localIndexKey];

    attributes.push(sortKey);
  }

  for (const globalIndexKey in globalSecondaryIndexes) {
    const { partitionKey, sortKey } = globalSecondaryIndexes[globalIndexKey];

    attributes.push(partitionKey);
    attributes.push(sortKey);
  }

  attributes = uniq(attributes);

  const AttributeDefinitions = attributes
    .map(AttributeName => ({
      // NOTE: Only composite keys are supported, no numbers.
      AttributeType: 'S',
      AttributeName,
    }));

  return AttributeDefinitions;
};

/** Returns secondary index. */
const getSecondaryIndex = (
  IndexName: string,
  partitionKey: string,
  sortKey?: string
) => {
  const KeySchema = [
    {
      KeyType: 'HASH',
      AttributeName: partitionKey
    },
    {
      KeyType: 'RANGE',
      AttributeName: sortKey
    },
  ];

  const index = {
    IndexName,
    KeySchema,
    Projection,
  } as LocalSecondaryIndex | GlobalSecondaryIndex;

  return index;
};

/** Returns schemas for local secondary indexes. */
const getLocalSecondaryIndexes = (
  partitionKey: string,
  localSecondaryIndexes: LSI[]
): LocalSecondaryIndex[] => {
  const indexes = localSecondaryIndexes
    .map(({ name, sortKey }) => getSecondaryIndex(name, partitionKey, sortKey));

  return indexes;
};

/** Returns schemas for global secondary indexes. */
const getGlobalSecondaryIndexes = (globalSecondaryIndexes: GSI[], isLocalhost: boolean) => {
  const indexes = globalSecondaryIndexes
    .map(({ name, partitionKey, sortKey }) =>
      getSecondaryIndex(name, partitionKey, sortKey)
    ) as GlobalSecondaryIndex[];

  /* istanbul ignore next */
  if (!isLocalhost) {
    return indexes;
  }

  indexes.forEach(index => index.ProvisionedThroughput = ProvisionedThroughput);
  return indexes;
};

/** Returns schema for a table from table options. */
const buildTableSchema = ({
  name: TableName,
  primaryKey,
  isLocalhost,
  localSecondaryIndexes,
  globalSecondaryIndexes,
}: TableOptions): CreateTableInput => {
  const { partitionKey, sortKey } = primaryKey;

  const AttributeDefinitions = getAttributeDefinitions(primaryKey, localSecondaryIndexes, globalSecondaryIndexes);
  const LocalSecondaryIndexes = getLocalSecondaryIndexes(partitionKey, localSecondaryIndexes);
  const GlobalSecondaryIndexes = getGlobalSecondaryIndexes(globalSecondaryIndexes, isLocalhost);

  const KeySchema = [
    { KeyType: 'HASH', AttributeName: partitionKey },
    { KeyType: 'RANGE', AttributeName: sortKey }
  ];

  const schema = {
    TableName,
    KeySchema,
    AttributeDefinitions,
  } as CreateTableInput;

  const hasLocalSecondaryIndexes = LocalSecondaryIndexes.length > 0;

  if (hasLocalSecondaryIndexes) {
    schema.LocalSecondaryIndexes = LocalSecondaryIndexes;
  }

  const hasGlobalSecondaryIndexes = GlobalSecondaryIndexes.length > 0;

  if (hasGlobalSecondaryIndexes) {
    schema.GlobalSecondaryIndexes = GlobalSecondaryIndexes;
  }

  /* istanbul ignore else */
  if (isLocalhost) {
    schema.ProvisionedThroughput = ProvisionedThroughput;

  } else {
    schema.BillingMode = 'PAY_PER_REQUEST';

  }

  return schema;
};

export default buildTableSchema;
