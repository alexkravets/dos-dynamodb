import { ExpressionKey } from './helpers/buildConditionExpression';
import { SortExpressionKey } from './helpers/buildQueryConditionExpression';
import Table, { type ItemAttributes } from './Table';
import type { TableOptions, LocalIndexKeyComposer, GlobalIndexKeyComposer } from './helpers/getTableOptions';

export default Table;

export {
  ExpressionKey,
  SortExpressionKey,
};

export type {
  TableOptions,
  ItemAttributes,
  LocalIndexKeyComposer,
  GlobalIndexKeyComposer
};
