import getTableOptions from '../getTableOptions';
import buildTableSchema from '../buildTableSchema';

describe('buildTableSchema(tableOptions)', () => {
  it('supports no global secondary indexes', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.globalSecondaryIndexes = [];

    const tableSchema = buildTableSchema(tableOptions);

    expect(tableSchema.GlobalSecondaryIndexes).toBeUndefined();
  });

  it('supports no local secondary indexes', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.localSecondaryIndexes = [];

    const tableSchema = buildTableSchema(tableOptions);

    expect(tableSchema.LocalSecondaryIndexes).toBeUndefined();
  });

  it('projects all attributes to an index by default', () => {
    const tableOptions = getTableOptions('partition', 'id');

    const tableSchema = buildTableSchema(tableOptions);

    const [ lsi ] = tableSchema.LocalSecondaryIndexes!;
    const [ gsi ] = tableSchema.GlobalSecondaryIndexes!;

    expect(lsi.Projection).toEqual({ ProjectionType: 'ALL' });
    expect(gsi.Projection).toEqual({ ProjectionType: 'ALL' });
  });

  it('projects the listed attributes to an index', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.localSecondaryIndexes = [
      { name: 'lsi1', sortKey: '_lsi1SortKey', projection: [ 'name' ] },
    ];

    tableOptions.globalSecondaryIndexes = [
      {
        name: 'gsi1',
        sortKey: '_gsi1SortKey',
        partitionKey: '_gsi1PartitionKey',
        projection: [ 'name', 'status', 'name' ],
      },
    ];

    const tableSchema = buildTableSchema(tableOptions);

    const [ lsi ] = tableSchema.LocalSecondaryIndexes!;
    const [ gsi ] = tableSchema.GlobalSecondaryIndexes!;

    expect(lsi.Projection).toEqual({
      ProjectionType: 'INCLUDE',
      NonKeyAttributes: [ 'name' ],
    });

    expect(gsi.Projection).toEqual({
      ProjectionType: 'INCLUDE',
      NonKeyAttributes: [ 'name', 'status' ],
    });
  });

  it('projects only the keys to an index with an empty list', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.globalSecondaryIndexes = [
      {
        name: 'gsi1',
        sortKey: '_gsi1SortKey',
        partitionKey: '_gsi1PartitionKey',
        projection: [],
      },
    ];

    const tableSchema = buildTableSchema(tableOptions);

    const [ gsi ] = tableSchema.GlobalSecondaryIndexes!;

    expect(gsi.Projection).toEqual({ ProjectionType: 'KEYS_ONLY' });
  });
});
