import type { DefaultAttributes as CommonAttributes } from '@kravc/dos';

export interface DefaultAttributes extends CommonAttributes {
  _lsi1SortKey?: string;
  _lsi2SortKey?: string;
  _lsi3SortKey?: string;

  _gsi1PartitionKey?: string;
  _gsi1SortKey?: string;

  _gsi2PartitionKey?: string;
  _gsi2SortKey?: string;

  _gsi3PartitionKey?: string;
  _gsi3SortKey?: string;
}
