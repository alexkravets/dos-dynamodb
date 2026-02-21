import getTableOptions from '../getTableOptions';
import buildTableSchema from '../buildTableSchema';

describe('buildTableSchema(tableOptions)', () => {
  it('supports global secondary indexes without a sort key', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.globalSecondaryIndexes = [
      {
        name: 'gsiTest',
        partitionKey: 'gsiPartitionKey',
      }
    ];

    const tableSchema = buildTableSchema(tableOptions);

    expect(tableSchema.GlobalSecondaryIndexes).toHaveLength(1);
  });
});
