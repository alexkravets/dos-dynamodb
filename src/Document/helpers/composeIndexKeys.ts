import { get } from 'lodash';
import { got } from '@kravc/dos';
import type { TableOptions, LocalIndexKeyComposer, GlobalIndexKeyComposer } from '../../Table';

type Attributes = Record<string, unknown>;

const PLACEHOLDER_REGEX = /#(\w+)/g;

/** Replaces each #name in the template with the value from attributes. */
const composeValue = (
  attributes: Attributes,
  template: string
): string | undefined => {
  const names = [...template.matchAll(PLACEHOLDER_REGEX)].map(([ , name ]) => name);

  for (const name of names) {
    const value = get(attributes, name);

    if (!value) {
      return;
    }
  }

  const composedValue = template.replace(PLACEHOLDER_REGEX, (_, name) =>
    `#${attributes[name]}`
  );

  return composedValue;
};

/** Returns sort key value using ID prefix and template. */
const composeSortKeyValue = (
  attributes: Attributes,
  template: string
): string | undefined => {
  return composeValue(attributes, template);
};

/** Returns partition key value using template. */
const composePartitionKeyValue = (
  idPrefix: string,
  attributes: Attributes,
  template: string
): string | undefined => {
  const composedValue = composeValue(attributes, template);

  if (!composedValue) {
    return;
  }

  return `${idPrefix}#${composedValue}`.replace('##', '#');
};

/** Returns index keys composed from item attributes. */
const composeIndexKeys = ({
  idPrefix,
  attributes,
  documentName,
  tableOptions,
}: {
  idPrefix: string,
  attributes: Attributes
  documentName: string,
  tableOptions: TableOptions,
}): Attributes => {
  const {
    indexKeys,
    isLocalSecondaryIndex,
    getLocalIndexSortKeyName,
    getGlobalIndexSortKeyName,
    getGlobalIndexPartitionKeyName,
  } = tableOptions;

  const indexNames = Object.keys(indexKeys);

  const localKeyComposers = indexNames
    .filter(indexName => isLocalSecondaryIndex(indexName))
    .filter(indexName => got(indexKeys[indexName] as LocalIndexKeyComposer, 'documentName') === documentName)
    .map(indexName => ({
      localIndexComposer: indexKeys[indexName] as LocalIndexKeyComposer,
      indexName,
    }));

  const globalKeyComposers = indexNames
    .filter(indexName => !isLocalSecondaryIndex(indexName))
    .filter(indexName => !!get((indexKeys[indexName] as Record<string, GlobalIndexKeyComposer>), documentName))
    .map(indexName => ({
      globalIndexComposer: got(indexKeys[indexName], documentName) as GlobalIndexKeyComposer,
      indexName,
    }));

  const composedKeys = {} as Attributes;
  const indexKeysJson = JSON.stringify(indexKeys, null, 2);

  for (const { indexName, localIndexComposer } of localKeyComposers) {
    const sortKey = getLocalIndexSortKeyName(indexName);

    const errorTemplate = `Sort key composer should be defined by "${indexName}.$PATH", index keys: ${indexKeysJson}`;
    const skTemplate = got(localIndexComposer, 'sk', errorTemplate);
    const skValue = composeSortKeyValue(attributes, skTemplate);

    if (!skValue) {
      continue;
    }

    composedKeys[sortKey] = skValue;
  }

  for (const { indexName, globalIndexComposer } of globalKeyComposers) {
    const sortKey = getGlobalIndexSortKeyName(indexName);
    const partitionKey = getGlobalIndexPartitionKeyName(indexName);

    const skErrorTemplate = `Partition key composer should be defined by "${indexName}.${documentName}.$PATH", index keys: ${indexKeysJson}`;
    const pkTemplate = got(globalIndexComposer, 'pk', skErrorTemplate) as string;
    const pkValue = composePartitionKeyValue(idPrefix, attributes, pkTemplate);

    if (!pkValue) {
      continue;
    }

    composedKeys[partitionKey] = pkValue;

    const pkErrorTemplate = `Sort key composer should be defined by "${indexName}.${documentName}.$PATH", index keys: ${indexKeysJson}`;
    const skTemplate = got(globalIndexComposer, 'sk', pkErrorTemplate) as string;
    const skValue = composeSortKeyValue(attributes, skTemplate);

    if (!skValue) {
      continue;
    }

    composedKeys[sortKey] = skValue;
  }

  return composedKeys;
};

export default composeIndexKeys;
