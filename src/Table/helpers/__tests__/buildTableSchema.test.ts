import getTableOptions from '../getTableOptions';
import buildTableSchema from '../buildTableSchema';

describe('buildTableSchema(tableOptions)', () => {
  // it('supports global secondary indexes without a sort key', () => {
  //   const tableOptions = getTableOptions('partition', 'id');

  //   tableOptions.globalSecondaryIndexes = [
  //     {
  //       name: 'gsiTest',
  //       partitionKey: 'gsiPartitionKey',
  //     }
  //   ];

  //   const tableSchema = buildTableSchema(tableOptions);

  //   expect(tableSchema.GlobalSecondaryIndexes).toHaveLength(1);
  // });

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
});
