import { get } from 'lodash';
import type { QueryMap } from '@kravc/dos';
import { ExpressionKey } from './buildConditionExpression';

/** Ensures item matches condition expression built from a query. */
function filterConditionExpression<T>(item: T, query: QueryMap): T | undefined {
  if (!item) {
    return;
  }

  const conditionEntries = Object.entries(query);

  for (const [key, value] of conditionEntries) {
    const isNot = key.endsWith(`:${ExpressionKey.NOT}`);
    const isContains = key.endsWith(`:${ExpressionKey.CONTAIN}`);
    // const isLessThan    = key.endsWith(':lt')
    // const isGreaterThan = key.endsWith(':gt')
    const isNotContains = key.endsWith(`:${ExpressionKey.EXCLUDE}`);

    const isFilterValueArray = Array.isArray(value);

    const isFilterValueNull = value === null;

    let path = key;
    /** Checks items are equal. */
    let match = (a: unknown, b: unknown) => a === b;

    if (isNot) {
      path = key.replace(/:not/g, '');

      /** Checks items are not equal. */
      match = (a: unknown, b: unknown) => a !== b;
    }

    if (isFilterValueNull) {
      if (isNot) {
        /** Checks item is not undefined. */
        match = (a) => a !== undefined;

      } else {
        /** Checks item is undefined. */
        match = (a) => a === undefined;

      }
    }

    if (isContains) {
      path = key.replace(/:contains/g, '');

      /** Checks item includes value. */
      match = (a: unknown, b: unknown) => (a as unknown[]).includes(b);
    }

    if (isNotContains) {
      path = key.replace(/:not_contains/g, '');

      /** Checks item does not include value. */
      match = (a: unknown, b: unknown) => !(a as unknown[]).includes(b);
    }

    if (isFilterValueArray) {
      /** Checks item is included in the array. */
      match = (a: unknown, b: unknown) => (b as unknown[]).includes(a);
    }

    // if (isLessThan) {
    //   path = key.replace(/:lt/g, '')
    // }

    // if (isGreaterThan) {
    //   path = key.replace(/:gt/g, '')
    // }

    const itemValue = get(item, path);
    const isMatched = match(itemValue, value);

    if (isMatched) {
      continue;
    }

    return;
  }

  return item;
};

export default filterConditionExpression;
