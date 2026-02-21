import type { QueryMap, MutationMap } from '@kravc/dos';
import buildConditionExpression from './buildConditionExpression';

/** Builds update expression from a query for a table item update method. */
const buildUpdateExpression = (query: QueryMap, mutation: MutationMap) => {
  const UpdateExpressions = [] as string[];
  const RemoveExpressions = [] as string[];

  const {
    ConditionExpression: _ConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  } = buildConditionExpression(query);

  let ConditionExpression = _ConditionExpression;

  for (let name in mutation) {
    const expressionValue = mutation[name];

    const arrayItemIndex = name.match(/\[\d+\]/g);
    name = name.replace(/\[\d+\]/g, '');

    let path = '#' + name.replace(/\./g, '.#');

    const valueKey = name.replace(/\.|:/g, '_');

    const isAppend = name.endsWith(':append');
    const isPrepend = name.endsWith(':prepend');

    name = name.replace(/:append/, '');
    name = name.replace(/:prepend/, '');

    const pathKeys = name.split('.');

    for (const pathKey of pathKeys) {
      ExpressionAttributeNames[`#${pathKey}`] = pathKey;
    }

    const shouldRemoveAttribute = expressionValue === null;

    if (shouldRemoveAttribute) {
      RemoveExpressions.push(`${path}`);
      continue;
    }

    if (isAppend || isPrepend) {
      path = path.replace(/:append/, '');
      path = path.replace(/:prepend/, '');

      ExpressionAttributeValues[`:${valueKey}`] = [ expressionValue ];
      ExpressionAttributeValues[`:${valueKey}_item`] = expressionValue;

      ConditionExpression += ` AND not contains (${path}, :${valueKey}_item)`;

      if (isAppend) {
        UpdateExpressions.push(`${path} = list_append(#${name}, :${valueKey})`);

      } else {
        UpdateExpressions.push(`${path} = list_append(:${valueKey}, #${name})`);

      }

    } else {
      ExpressionAttributeValues[`:${valueKey}`] = expressionValue;
      path = `${path}${arrayItemIndex ? arrayItemIndex : ''}`;

      UpdateExpressions.push(`${path} = :${valueKey}`);
    }
  }

  const UpdatedExpressions = [];

  const hasUpdateExpressions = UpdateExpressions.length > 0;

  if (hasUpdateExpressions) {
    UpdatedExpressions.push(`SET ${UpdateExpressions.join(', ')}`);
  }

  const hasRemoveAttributes = RemoveExpressions.length > 0;

  if (hasRemoveAttributes) {
    UpdatedExpressions.push(`REMOVE ${RemoveExpressions.join(', ')}`);
  }

  const UpdateExpression = UpdatedExpressions.join(' ');

  return {
    UpdateExpression,
    ConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
};

export default buildUpdateExpression;
