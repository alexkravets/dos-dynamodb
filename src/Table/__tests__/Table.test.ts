import Table from '../Table';

describe('Table', () => {
  const table = new Table({
    sortKey: 'id',
    partitionKey: 'partition',
  });

  beforeAll(async () => {
    try {
      await table.delete();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      ;
    }
  });

  describe('Table.createItem(attributes)', () => {
    it('throws an exception if the table does not exist', async () => {
      const attributes = {};
      await expect(table.createItem(attributes))
        .rejects
        .toThrow('Table "kravc-dos-dynamodb" does not exist');
    });
  });

  describe('Table.getItem(query)', () => {
    it('throws an exception if the table does not exist', async () => {
      const query = { partition: 'ORG_1', id: 'AST_BAD_ID' };
      await expect(table.getItem(query))
        .rejects
        .toThrow('Table "kravc-dos-dynamodb" does not exist');
    });
  });

  describe('Table.updateItem(query, mutation)', () => {
    it('throws an exception if the table does not exist', async () => {
      const query = { partition: 'ORG_1', id: 'AST_BAD_ID' };
      const mutation = { name: 'Text Document' };
      await expect(table.updateItem(query, mutation))
        .rejects
        .toThrow('Table "kravc-dos-dynamodb" does not exist');
    });
  });

  describe('Table.deleteItem(query)', () => {
    it('throws an exception if the table does not exist', async () => {
      const query = { partition: 'ORG_1', id: 'AST_BAD_ID' };
      await expect(table.deleteItem(query))
        .rejects
        .toThrow('Table "kravc-dos-dynamodb" does not exist');
    });
  });

  describe('Table.listItems(query, options)', () => {
    it('throws an exception if the table does not exist', async () => {
      const query = { partition: 'ORG_1' };
      await expect(table.listItems(query, { limit: 100, sort: 'desc' }))
        .rejects
        .toThrow('Table "kravc-dos-dynamodb" does not exist');
    });
  });

  describe('Table.listItems(query, options) for an index with a projection', () => {
    const projectedTable = new Table({
      sortKey: 'id',
      partitionKey: 'partition',
    });

    projectedTable.options.name = 'kravc-dos-dynamodb-projection';
    projectedTable.options.indexProjections = { gsi1: [ 'name' ] };

    beforeAll(() => projectedTable.reset());

    afterAll(() => projectedTable.delete());

    it('returns the projected attributes and the keys', async () => {
      await projectedTable.createItem({
        id: 'AST_1',
        name: 'Text Document',
        status: 'ACTIVE',
        partition: 'ORG_1',
        _gsi1SortKey: '#2026-11-16',
        _gsi1PartitionKey: 'AST#ACTIVE',
      });

      const query = { _gsi1PartitionKey: 'AST#ACTIVE' };
      const options = { limit: 100, sort: 'asc', indexName: 'gsi1' };

      const { items } = await projectedTable.listItems(query, options);

      expect(items).toEqual([
        {
          id: 'AST_1',
          name: 'Text Document',
          partition: 'ORG_1',
          _gsi1SortKey: '#2026-11-16',
          _gsi1PartitionKey: 'AST#ACTIVE',
        },
      ]);
    });
  });
});
