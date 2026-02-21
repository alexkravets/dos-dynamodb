import type { QueryMap } from '@kravc/dos';
import buildConditionExpression from './buildConditionExpression';

export enum SortExpressionKey {
  BW = 'bw',
  LT = 'lt',
  LE = 'le',
  GT = 'gt',
  GE = 'ge',
};

/** Builds condition expression for a table query. */
const buildQueryConditionExpression = (
  query: QueryMap,
  partitionKey: string,
  sortKey: string,
) => {
  const {
    [partitionKey]: partitionKeyValue,
    [sortKey]: sortKeyValue,
    [`${sortKey}:${SortExpressionKey.BW}`]: sortKeyBeginsWithValue,
    [`${sortKey}:${SortExpressionKey.LT}`]: sortKeyLowerThanValue,
    [`${sortKey}:${SortExpressionKey.LE}`]: sortKeyLowerThanOrEqualValue,
    [`${sortKey}:${SortExpressionKey.GT}`]: sortKeyGreaterThanValue,
    [`${sortKey}:${SortExpressionKey.GE}`]: sortKeyGreaterThanOrEqualValue,
    ...conditionQuery
  } = query;

  const {
    ConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  } = buildConditionExpression(conditionQuery);

  ExpressionAttributeNames[`#${partitionKey}`] = partitionKey;
  ExpressionAttributeValues[`:${partitionKey}`] = partitionKeyValue;

  const KeyConditionExpression = `#${partitionKey} = :${partitionKey}`;

  const result = {
    ConditionExpression,
    KeyConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  };

  const isBetweenValues = !!sortKeyLowerThanValue && !!sortKeyGreaterThanValue;

  if (isBetweenValues) {
    result.KeyConditionExpression += ` AND #${sortKey} BETWEEN :${sortKey}_gt AND :${sortKey}_lt`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}_lt`] = sortKeyLowerThanValue;
    result.ExpressionAttributeValues[`:${sortKey}_gt`] = sortKeyGreaterThanValue;

    return result;
  }

  if (sortKeyLowerThanValue) {
    result.KeyConditionExpression += ` AND #${sortKey} < :${sortKey}_lt`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}_lt`] = sortKeyLowerThanValue;

    return result;
  }

  if (sortKeyLowerThanOrEqualValue) {
    result.KeyConditionExpression += ` AND #${sortKey} <= :${sortKey}_le`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}_le`] = sortKeyLowerThanOrEqualValue;

    return result;
  }

  if (sortKeyGreaterThanValue) {
    result.KeyConditionExpression += ` AND #${sortKey} > :${sortKey}_gt`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}_gt`] = sortKeyGreaterThanValue;

    return result;
  }

  if (sortKeyGreaterThanOrEqualValue) {
    result.KeyConditionExpression += ` AND #${sortKey} >= :${sortKey}_ge`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}_ge`] = sortKeyGreaterThanOrEqualValue;

    return result;
  }

  if (sortKeyBeginsWithValue) {
    result.KeyConditionExpression += ` AND begins_with(#${sortKey}, :${sortKey})`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}`] = sortKeyBeginsWithValue;

    return result;
  }

  if (sortKeyValue) {
    result.KeyConditionExpression += ` AND #${sortKey} = :${sortKey}`;
    result.ExpressionAttributeNames[`#${sortKey}`] = sortKey;
    result.ExpressionAttributeValues[`:${sortKey}`] = sortKeyValue;

    return result;
  }

  return result;
};

export default buildQueryConditionExpression;
