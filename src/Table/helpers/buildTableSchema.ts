import { uniq } from 'lodash';
import type { TableOptions, PrimaryKey, LSI, GSI } from './getTableOptions';
import {
  type Projection,
  type CreateTableInput,
  type LocalSecondaryIndex,
  type GlobalSecondaryIndex
} from '@aws-sdk/client-dynamodb';

type IndexProjections = TableOptions['indexProjections'];

const ProvisionedThroughput = {
  ReadCapacityUnits: 1,
  WriteCapacityUnits: 1,
};

/** Returns projection of an index: all attributes unless a list is given. */
const getProjection = (projection?: string[]): Projection => {
  if (!projection) {
    return { ProjectionType: 'ALL' };
  }

  const NonKeyAttributes = uniq(projection);
  const isKeysOnly = NonKeyAttributes.length === 0;

  if (isKeysOnly) {
    return { ProjectionType: 'KEYS_ONLY' };
  }

  return { ProjectionType: 'INCLUDE', NonKeyAttributes };
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
  sortKey: string,
  projection?: string[]
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

  const Projection = getProjection(projection);

  const index = {
    IndexName,
    KeySchema,
    Projection,
  } as LocalSecondaryIndex | GlobalSecondaryIndex;

  return index;
};

/** Throws if a projection is given for an index that is not defined. */
const verifyIndexProjections = (
  indexProjections: IndexProjections,
  localSecondaryIndexes: LSI[],
  globalSecondaryIndexes: GSI[]
): void => {
  const indexNames = [ ...localSecondaryIndexes, ...globalSecondaryIndexes ]
    .map(({ name }) => name);

  for (const indexName of Object.keys(indexProjections)) {
    const isDefined = indexNames.includes(indexName);

    if (!isDefined) {
      throw new Error(`Index "${indexName}" of index projections is not defined, indexes: ${indexNames.join(', ')}`);
    }
  }
};

/** Returns schemas for local secondary indexes. */
const getLocalSecondaryIndexes = (
  partitionKey: string,
  localSecondaryIndexes: LSI[],
  indexProjections: IndexProjections
): LocalSecondaryIndex[] => {
  const indexes = localSecondaryIndexes
    .map(({ name, sortKey }) =>
      getSecondaryIndex(name, partitionKey, sortKey, indexProjections[name])
    );

  return indexes;
};

/** Returns schemas for global secondary indexes. */
const getGlobalSecondaryIndexes = (
  globalSecondaryIndexes: GSI[],
  indexProjections: IndexProjections,
  isLocalhost: boolean
) => {
  const indexes = globalSecondaryIndexes
    .map(({ name, partitionKey, sortKey }) =>
      getSecondaryIndex(name, partitionKey, sortKey, indexProjections[name])
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
  indexProjections,
  localSecondaryIndexes,
  globalSecondaryIndexes,
}: TableOptions): CreateTableInput => {
  const { partitionKey, sortKey } = primaryKey;

  verifyIndexProjections(indexProjections, localSecondaryIndexes, globalSecondaryIndexes);

  const AttributeDefinitions = getAttributeDefinitions(primaryKey, localSecondaryIndexes, globalSecondaryIndexes);
  const LocalSecondaryIndexes = getLocalSecondaryIndexes(partitionKey, localSecondaryIndexes, indexProjections);
  const GlobalSecondaryIndexes = getGlobalSecondaryIndexes(globalSecondaryIndexes, indexProjections, isLocalhost);

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
