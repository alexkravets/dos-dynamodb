import getTableOptions from '../../../Table/helpers/getTableOptions';
import composeIndexKeys from '../composeIndexKeys';

describe('composeIndexKeys(props)', () => {
  it('returns empty object if no composers are defined for the document', () => {
    const tableOptions = getTableOptions('partition', 'id');

    const props = {
      idPrefix: 'FIL',
      attributes: {},
      documentName: 'File',
      tableOptions
    };

    const composedKeys = composeIndexKeys(props);

    expect(composedKeys).toEqual({});
  });

  it('throws an exception if the index is not defined in the table config', () => {
    const tableOptions = getTableOptions('partition', 'id');

    tableOptions.indexKeys = {
      lsi4: {
        documentName: 'Activity',
        sk: '#updatedAt',
      }
    };

    const props = {
      idPrefix: 'ACT',
      attributes: {},
      documentName: 'Activity',
      tableOptions
    };

    expect(() => composeIndexKeys(props))
      .toThrow('Index "lsi4" is not defined');
  });
});
