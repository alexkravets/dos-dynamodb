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

    tableOptions.indexProjections = {
      lsi1: [ 'name' ],
      gsi1: [ 'name', 'status', 'name' ],
    };

    const tableSchema = buildTableSchema(tableOptions);

    const [ lsi1, lsi2 ] = tableSchema.LocalSecondaryIndexes!;
    const [ gsi1, gsi2 ] = tableSchema.GlobalSecondaryIndexes!;

    expect(lsi1.Projection).toEqual({
      ProjectionType: 'INCLUDE',
      NonKeyAttributes: [ 'name' ],
    });

    expect(gsi1.Projection).toEqual({
      ProjectionType: 'INCLUDE',
      NonKeyAttributes: [ 'name', 'status' ],
    });

    expect(lsi2.Projection).toEqual({ ProjectionType: 'ALL' });
    expect(gsi2.Projection).toEqual({ ProjectionType: 'ALL' });
  });

  it('projects only the keys to an index with an empty list', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.indexProjections = { gsi1: [] };

    const tableSchema = buildTableSchema(tableOptions);

    const [ gsi ] = tableSchema.GlobalSecondaryIndexes!;

    expect(gsi.Projection).toEqual({ ProjectionType: 'KEYS_ONLY' });
  });

  it('throws an exception if a projection is given for an index that is not defined', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.indexProjections = { gsi4: [ 'name' ] };

    expect(() => buildTableSchema(tableOptions))
      .toThrow('Index "gsi4" of index projections is not defined, indexes: lsi1, lsi2, lsi3, gsi1, gsi2, gsi3');
  });
});
