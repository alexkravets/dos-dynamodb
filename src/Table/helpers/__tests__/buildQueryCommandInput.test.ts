import getTableOptions from '../getTableOptions';
import buildQueryCommandInput from '../buildQueryCommandInput';

describe('buildQueryCommandInput(tableOptions, query, options)', () => {
  it('throws an exception if the index is not defined in the table config', () => {
    const tableOptions = getTableOptions('partition', 'id');

    const query = {};
    const options = { sort: 'asc', limit: 10, indexName: 'customGSI' };

    expect(() => buildQueryCommandInput(tableOptions, query, options))
      .toThrow('Index "customGSI" is not defined');
  });
});
