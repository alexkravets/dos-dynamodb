import type { QueryMap } from '@kravc/dos';

export enum ExpressionKey {
  LT = 'lt',
  LE = 'le',
  GT = 'gt',
  GE = 'ge',
  NOT = 'not',
  CONTAIN = 'contains',
  EXCLUDE = 'not_contains',
  // TODO: Add support for:
  // - between: lt and gt
  // - begins with
}

/** Builds condition expression from a query for a table query, update and delete methods. */
const buildConditionExpression = (query: QueryMap) => {
  // NOTE: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
  const ConditionExpressions = [] as string[];
  const ExpressionAttributeNames = {} as Record<string, string>;
  const ExpressionAttributeValues = {} as Record<string, unknown>;

  for (let key in query) {
    let path = '#Q_' + key.replace(/\./g, '.#Q_');

    const valueKey = key.replace(/\.|:/g, '_');
    const filterValue = query[key];

    const isNot = key.endsWith(`:${ExpressionKey.NOT}`);
    const isLessThan = key.endsWith(`:${ExpressionKey.LT}`);
    const isLessThanOrEqual = key.endsWith(`:${ExpressionKey.LE}`);
    const isGreaterThan = key.endsWith(`:${ExpressionKey.GT}`);
    const isGreaterThanOrEqual = key.endsWith(`:${ExpressionKey.GE}`);
    const isContains = key.endsWith(`:${ExpressionKey.CONTAIN}`);
    const isNotContains = key.endsWith(`:${ExpressionKey.EXCLUDE}`);

    const isFilterValueNull = filterValue === null;

    if (isNot) {
      key = key.replace(/:not/g, '');
    }

    if (isContains) {
      key = key.replace(/:contains/g, '');
    }

    if (isNotContains) {
      key = key.replace(/:not_contains/g, '');
    }

    if (isLessThan) {
      key = key.replace(/:lt/g, '');
    }

    if (isLessThanOrEqual) {
      key = key.replace(/:le/g, '');
    }

    if (isGreaterThan) {
      key = key.replace(/:gt/g, '');
    }

    if (isGreaterThanOrEqual) {
      key = key.replace(/:ge/g, '');
    }

    const pathKeys = key.split('.');

    for (const pathKey of pathKeys) {
      ExpressionAttributeNames[`#Q_${pathKey}`] = pathKey;
    }

    const isFilterValueArray = Array.isArray(filterValue);

    if (isFilterValueArray) {
      const filterValues = filterValue.entries();
      const valueKeys = [];

      for (const [ index, value ] of filterValues) {
        ExpressionAttributeValues[`:Q_${valueKey}${index + 1}`] = value;
        valueKeys.push(`:Q_${valueKey}${index + 1}`);
      }

      ConditionExpressions.push(`${path} in (${valueKeys})`);

    } else {
      ExpressionAttributeValues[`:Q_${valueKey}`] = filterValue;

      if (isNot) {
        path = path.replace(/:not/, '');
        ConditionExpressions.push(`${path} <> :Q_${valueKey}`);

        if (isFilterValueNull) {
          ConditionExpressions.push(`attribute_exists(${path})`);
        }

      } else if (isContains) {
        path = path.replace(/:contains/, '');
        ConditionExpressions.push(`contains(${path}, :Q_${valueKey})`);

      } else if (isNotContains) {
        path = path.replace(/:not_contains/, '');
        ConditionExpressions.push(`not contains(${path}, :Q_${valueKey})`);

      } else if (isLessThan) {
        path = path.replace(/:lt/, '');
        ConditionExpressions.push(`${path} < :Q_${valueKey}`);

      } else if (isLessThanOrEqual) {
        path = path.replace(/:le/, '');
        ConditionExpressions.push(`${path} <= :Q_${valueKey}`);

      } else if (isGreaterThan) {
        path = path.replace(/:gt/, '');
        ConditionExpressions.push(`${path} > :Q_${valueKey}`);

      } else if (isGreaterThanOrEqual) {
        path = path.replace(/:ge/, '');
        ConditionExpressions.push(`${path} >= :Q_${valueKey}`);

      } else {
        if (isFilterValueNull) {
          ConditionExpressions.push(`(${path} = :Q_${valueKey} OR attribute_not_exists(${path}))`);

        } else {
          ConditionExpressions.push(`${path} = :Q_${valueKey}`);

        }

      }
    }
  }

  const ConditionExpression = ConditionExpressions.join(' AND ');
  const hasConditionExpression = ConditionExpression !== '';

  if (!hasConditionExpression) {
    return {
      ExpressionAttributeNames,
      ExpressionAttributeValues
    };
  }

  return {
    ConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
};

export default buildConditionExpression;
