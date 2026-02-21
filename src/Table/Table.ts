import type { MutationMap, QueryMap } from '@kravc/dos';
import { DynamoDBClient, DeleteTableCommand, CreateTableCommand } from '@aws-sdk/client-dynamodb';

import {
  type PutCommandInput,
  type GetCommandInput,
  type QueryCommandInput,
  type QueryCommandOutput,
  type DeleteCommandInput,
  DynamoDBDocument,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

import {
  type TableOptions,
  getTableOptions,
  buildTableSchema,
  getRawClientConfig,
  buildUpdateExpression,
  buildQueryCommandInput,
  buildConditionExpression,
  filterConditionExpression,
} from './helpers';

type Options = {
  partitionKey: string;
  sortKey: string;
}

export type ItemAttributes = Record<string, unknown>;

/** DynamoDB table class. */
class Table {
  private _client: DynamoDBDocument;
  private _rawClient: DynamoDBClient;
  private _tableOptions: TableOptions;

  /** Creates an instance of a table. */
  constructor(options: Options) {
    const { sortKey, partitionKey } = options;

    const tableOptions = getTableOptions(partitionKey, sortKey);

    const { region, profile } = tableOptions;
    const config = getRawClientConfig(region, profile);

    this._rawClient = new DynamoDBClient(config);
    this._client = DynamoDBDocument.from(this._rawClient);

    this._tableOptions = tableOptions;
  }

  /** Returns table options. */
  get options() {
    return this._tableOptions;
  }

  /** Creates a DynamoDB table. */
  async create(): Promise<void> {
    const tableSchema = buildTableSchema(this._tableOptions);
    const command = new CreateTableCommand(tableSchema);

    await this._rawClient.send(command);
  }

  /** Deletes a DynamoDB table. */
  async delete(): Promise<void> {
    const { name: TableName } = this._tableOptions;
    const deleteTableCommand = new DeleteTableCommand({ TableName });

    await this._client.send(deleteTableCommand);
  }

  /** Resets a DynamoDB table. */
  async reset(): Promise<void> {
    try {
      await this.delete();

    } catch (dynamoError: unknown) {
      const { name: errorName } = dynamoError as { name: string };

      /* istanbul ignore next */
      if (errorName !== 'ResourceNotFoundException') {
        throw dynamoError;
      }
    }

    await this.create();
  }

  /** Returns key and conditionQuery from query. */
  _parseItemQuery(query: QueryMap) {
    const { primaryKey } = this._tableOptions;
    const { sortKey, partitionKey } = primaryKey;

    const {
      [sortKey]: sortKeyValue,
      [partitionKey]: partitionKeyValue,
      ...conditionQuery
    } = query;

    const Key = {
      [sortKey]: sortKeyValue,
      [partitionKey]: partitionKeyValue,
    };

    return { Key, conditionQuery };
  }

  /** Creates a table item; returns false if item already exists. */
  async createItem(attributes: ItemAttributes): Promise<boolean> {
    const { name: TableName, primaryKey } = this._tableOptions;

    const { sortKey } = primaryKey;

    const ConditionExpression = `#${sortKey} <> :${sortKey}`;

    const ExpressionAttributeNames = {
      [`#${sortKey}`]: sortKey,
    };

    const ExpressionAttributeValues = {
      [`:${sortKey}`]: attributes[sortKey],
    };

    const putCommandInput = {
      TableName,
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      Item: attributes,
    } as PutCommandInput;

    try {
      await this._client.put(putCommandInput);

    } catch (dynamoError: unknown) {
      const { name: errorName } = dynamoError as { name: string };

      if (errorName === 'ConditionalCheckFailedException') {
        return false;
      }

      /* istanbul ignore next */
      if (errorName !== 'ResourceNotFoundException') {
        throw dynamoError;
      }

      throw new Error(`Table "${TableName}" does not exist`);
    }

    return true;
  }

  /** Returns a table item, or undefined if not found. */
  async getItem(query: QueryMap): Promise<ItemAttributes | undefined> {
    const { name: TableName } = this._tableOptions;
    const { Key, conditionQuery } = this._parseItemQuery(query);

    const getCommandInput = {
      ConsistentRead: true,
      TableName,
      Key,
    } as GetCommandInput;

    let result;

    try {
      result = await this._client.get(getCommandInput);

    } catch (dynamoError: unknown) {
      const { name: errorName } = dynamoError as { name: string };

      /* istanbul ignore next */
      if (errorName !== 'ResourceNotFoundException') {
        throw dynamoError;
      }

      throw new Error(`Table "${TableName}" does not exist`);
    }

    const { Item: itemAttributes } = result;

    return filterConditionExpression(itemAttributes, conditionQuery);
  }

  /** Updates a table item with attributes. */
  async updateItem(query: QueryMap, mutation: MutationMap): Promise<ItemAttributes | undefined> {
    const { name: TableName, primaryKey } = this._tableOptions;
    const { Key } = this._parseItemQuery(query);

    const { partitionKey, sortKey } = primaryKey;

    delete mutation[sortKey];
    delete mutation[partitionKey];

    const {
      UpdateExpression,
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } = buildUpdateExpression(query, mutation);

    const updateCommandInput = {
      ReturnValues: 'ALL_NEW',
      Key,
      TableName,
      UpdateExpression,
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } as UpdateCommandInput;

    let result;

    try {
      result = await this._client.update(updateCommandInput);

    } catch (dynamoError: unknown) {
      const { name: errorName } = dynamoError as { name: string };

      if (errorName === 'ConditionalCheckFailedException') {
        return;
      }

      /* istanbul ignore next */
      if (errorName !== 'ResourceNotFoundException') {
        throw dynamoError;
      }

      throw new Error(`Table "${TableName}" does not exist`);
    }

    const { Attributes: attributes } = result;

    return attributes;
  }

  /** Deletes a table item; returns false if item not found. */
  async deleteItem(query: QueryMap): Promise<boolean> {
    const { name: TableName } = this._tableOptions;
    const { Key } = this._parseItemQuery(query);

    const {
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    } = buildConditionExpression(query);

    const deleteCommandInput = {
      TableName,
      Key,
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    } as DeleteCommandInput;

    try {
      await this._client.delete(deleteCommandInput);

    } catch (dynamoError: unknown) {
      const { name: errorName } = dynamoError as { name: string };

      if (errorName === 'ConditionalCheckFailedException') {
        return false;
      }

      /* istanbul ignore next */
      if (errorName !== 'ResourceNotFoundException') {
        throw dynamoError;
      }

      throw new Error(`Table "${TableName}" does not exist`);
    }

    return true;
  }

  /** Returns item from the table using a query. */
  async _queryItems(input: QueryCommandInput): Promise<QueryCommandOutput> {
    let result: QueryCommandOutput;

    try {
      result = await this._client.query(input);

    } catch (dynamoError: unknown) {
      const { name: errorName } = dynamoError as { name: string };

      /* istanbul ignore next */
      if (errorName !== 'ResourceNotFoundException') {
        throw dynamoError;
      }

      const { TableName } = input;

      throw new Error(`Table "${TableName}" does not exist`);
    }

    return result;
  }

  /** Lists table items. */
  async listItems(
    query: QueryMap,
    options: {
      sort: string,
      limit: number,
      indexName?: string,
      exclusiveStartKey?: string
    }
  ): Promise<{
    count: number;
    items: ItemAttributes[];
    lastEvaluatedKey?: string;
  }> {
    const queryCommandInput = buildQueryCommandInput(this._tableOptions, query, options);

    const { limit } = options;

    let count = 0;
    let items = [] as Record<string, unknown>[];
    let lastEvaluatedKey;
    let isNextChunkRequired = true;

    do {
      const {
        Items: chunk,
        LastEvaluatedKey
      } = await this._queryItems(queryCommandInput);

      const hasMoreItems = !!LastEvaluatedKey;

      items = [ ...items, ...(chunk as ItemAttributes[]) ];
      count = items.length;
      lastEvaluatedKey = LastEvaluatedKey;
      isNextChunkRequired = hasMoreItems && count < limit;

      queryCommandInput.ExclusiveStartKey = LastEvaluatedKey;

    } while (isNextChunkRequired);

    if (lastEvaluatedKey) {
      lastEvaluatedKey = encodeURIComponent(JSON.stringify(lastEvaluatedKey));
    }

    return {
      count,
      items,
      lastEvaluatedKey
    };
  }
}

export default Table;
