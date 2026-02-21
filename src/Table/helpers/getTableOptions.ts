import config from 'config';
import { got } from '@kravc/dos';
import { get } from 'lodash';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

export const LOCAL_REGION = 'local';
const PRIVATE_PROFILE = 'private';

export type LSI = {
  name: string;
  sortKey: string;
};

export type GSI = {
  name: string;
  partitionKey: string;
  sortKey: string;
};

export type PrimaryKey = {
  sortKey: string;
  partitionKey: string;
};

export type LocalIndexKeyComposer = { documentName: string, sk: string };
export type GlobalIndexKeyComposer = { pk: string, sk?: string };

type LocalIndexProps = {
  indexName: string;
  sortKeyName: string;
};

type GlobalIndexProps = {
  indexName: string;
  sortKeyName: string;
  partitionKeyName: string;
};

export type TableOptions = {
  name: string;
  region: string;
  profile: string;
  indexKeys: Record<string, LocalIndexKeyComposer | Record<string, GlobalIndexKeyComposer>>;
  primaryKey: PrimaryKey;
  isLocalhost: boolean;
  localSecondaryIndexes: LSI[];
  globalSecondaryIndexes: GSI[];
  getLocalIndexSortKeyName: (indexName: string) => string;
  getGlobalIndexPartitionKeyName: (indexName: string) => string;
  getGlobalIndexSortKeyName: (indexName: string) => string;
  isLocalSecondaryIndex: (indexName: string) => boolean;
  getLocalIndexProps: (indexName: string) => LocalIndexProps;
  getGlobalIndexProps: (indexName: string) => GlobalIndexProps;
}

/** Returns default table name. */
const getDefaultName = (): string => {
  const ROOT_PATH = process.cwd();
  const { NODE_APP_INSTANCE } = process.env;

  const { name } = JSON.parse(
    readFileSync(join(ROOT_PATH, 'package.json'), 'utf-8')
  ) as { name: string; };

  const prefix = name.replace('@', '').replace('/', '-');

  return [ prefix, NODE_APP_INSTANCE ].filter(value => !!value).join('-');
};

/** Returns options for DynamoDB table creation. */
const getTableOptions = (partitionKey: string, sortKey: string): TableOptions => {
  const tableConfig = config.get('dynamodb');
  const tableOptions = JSON.parse(JSON.stringify(tableConfig)) as TableOptions;

  const name = get(tableConfig, 'name', getDefaultName());
  const indexKeys = get(tableConfig, 'indexKeys', {});

  const region = get(config, 'aws.region', LOCAL_REGION);
  const profile = get(config, 'aws.profile', PRIVATE_PROFILE);

  const primaryKey = {
    sortKey,
    partitionKey,
  };

  tableOptions.name = name;
  tableOptions.region = region;
  tableOptions.profile = profile;
  tableOptions.indexKeys = indexKeys;
  tableOptions.primaryKey = primaryKey;
  tableOptions.isLocalhost = region === LOCAL_REGION;

  tableOptions.localSecondaryIndexes = get(config, 'localSecondaryIndexes', [
    {
      name: 'lsi1',
      sortKey: '_lsi1SortKey',
    },
    {
      name: 'lsi2',
      sortKey: '_lsi2SortKey',
    },
    {
      name: 'lsi3',
      sortKey: '_lsi3SortKey',
    },
  ]) as LSI[];

  tableOptions.globalSecondaryIndexes = get(config, 'globalSecondaryIndexes', [
    {
      name: 'gsi1',
      partitionKey: '_gsi1PartitionKey',
      sortKey: '_gsi1SortKey',
    },
    {
      name: 'gsi2',
      partitionKey: '_gsi2PartitionKey',
      sortKey: '_gsi2SortKey',
    },
    {
      name: 'gsi3',
      partitionKey: '_gsi3PartitionKey',
      sortKey: '_gsi3SortKey',
    },
  ]) as GSI[];

  /** Returns sort key name for a local secondary index. */
  const getLocalIndexSortKeyName = (indexName: string): string => {
    const { localSecondaryIndexes } = tableOptions;

    const index = localSecondaryIndexes.find(({ name }) => name === indexName);
    const indexesJson = JSON.stringify(localSecondaryIndexes, null, 2);

    if (!index) {
      throw new Error(`Local secondary index "${indexName}" is not defined, local indexes: ${indexesJson}`);
    }

    return got(index, 'sortKey') as string;
  };

  /** Returns partition key name for a global secondary index. */
  const getGlobalIndexPartitionKeyName = (indexName: string): string => {
    const { globalSecondaryIndexes } = tableOptions;

    const index = globalSecondaryIndexes.find(({ name }) => name === indexName);
    const indexesJson = JSON.stringify(globalSecondaryIndexes, null, 2);

    if (!index) {
      throw new Error(`Global secondary index "${indexName}" is not defined, global indexes: ${indexesJson}`);
    }

    return got(index, 'partitionKey') as string;
  };

  /** Returns sort key name for a global secondary index. */
  const getGlobalIndexSortKeyName = (indexName: string): string => {
    const { globalSecondaryIndexes } = tableOptions;

    const index = globalSecondaryIndexes.find(({ name }) => name === indexName);
    const indexesJson = JSON.stringify(globalSecondaryIndexes, null, 2);

    if (!index) {
      throw new Error(`Global secondary index "${indexName}" is not defined, global indexes: ${indexesJson}`);
    }

    return got(index, 'sortKey') as string;
  };

  /** Returns true if local secondary index, false if global secondary index; throws if not found. */
  const isLocalSecondaryIndex = (indexName: string): boolean => {
    const {
      localSecondaryIndexes,
      globalSecondaryIndexes
    } = tableOptions;

    const lsi = localSecondaryIndexes.find(({ name }) => name === indexName);

    if (lsi) {
      return true;
    }

    const gsi = globalSecondaryIndexes.find(({ name }) => name === indexName);

    if (gsi) {
      return false;
    }

    const indexesJson = JSON.stringify({ localSecondaryIndexes, globalSecondaryIndexes }, null, 2);
    throw new Error(`Index "${indexName}" is not defined, indexes: ${indexesJson}`);
  };

  /** Returns props for a local index by name. */
  const getLocalIndexProps = (indexName: string): LocalIndexProps => {
    isLocalSecondaryIndex(indexName);

    const sortKeyName = getLocalIndexSortKeyName(indexName);

    return {
      indexName,
      sortKeyName,
    };
  };

  /** Returns props for a global index by name. */
  const getGlobalIndexProps = (indexName: string): GlobalIndexProps => {
    isLocalSecondaryIndex(indexName);

    const sortKeyName = getGlobalIndexSortKeyName(indexName);
    const partitionKeyName = getGlobalIndexPartitionKeyName(indexName);

    return {
      indexName,
      sortKeyName,
      partitionKeyName,
    };
  };

  tableOptions.getLocalIndexSortKeyName = getLocalIndexSortKeyName;
  tableOptions.getGlobalIndexPartitionKeyName = getGlobalIndexPartitionKeyName;
  tableOptions.getGlobalIndexSortKeyName = getGlobalIndexSortKeyName;
  tableOptions.isLocalSecondaryIndex = isLocalSecondaryIndex;
  tableOptions.getGlobalIndexProps = getGlobalIndexProps;
  tableOptions.getLocalIndexProps = getLocalIndexProps;

  return tableOptions;
};

export default getTableOptions;
