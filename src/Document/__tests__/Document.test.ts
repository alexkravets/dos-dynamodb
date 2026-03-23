import { ExpressionKey } from '../../../';
import { Activity, Asset } from '../../../example';
import { DocumentExistsError, DocumentNotFoundError } from '@kravc/dos';
import { createContext, createAsset, createActivity, createOrganization } from './__helpers';

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('Document', () => {
  beforeAll(async () => {
    await Asset.table.reset();
  });

  afterAll(async () => {
    await Asset.table.delete();
  });

  const context = createContext();

  beforeEach(() => {
    context.runtimeReset();
  });

  describe('Document.indexLimitMax', () => {
    it('returns maximum value for the limit parameter of the index operation', async () => {
      expect(Asset.indexLimitMax).toEqual(999);
    });
  });

  describe('Document._create(attributes)', () => {
    it('creates a document', async () => {
      const asset = await createAsset();

      expect(asset.attributes.name).toEqual('Text Document');
      expect(asset.attributes.partition).toEqual('ORG_1');
      expect(asset.attributes.createdAt).toBeDefined();
      expect(asset.attributes.createdBy).toEqual('USR_1');
      expect(asset.attributes.createdByUserName).toEqual('John Doe');
    });

    it('throws DocumentExistsError if document key is already taken', async () => {
      const { id } = await createAsset();

      await expect(createAsset({ id }))
        .rejects
        .toThrow(DocumentExistsError);
    });
  });

  describe('Document._read(query)', () => {
    it('throws DocumentNotFoundError if document not found', async () => {
      await expect(Asset.read(context, { id: 'AST_BAD_ID' }))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('reads a document', async () => {
      const { id } = await createAsset();
      const asset = await Asset.read(context, { id });

      expect(asset).toBeDefined();
    });

    it('supports query value', async () => {
      const { id } = await createAsset();
      const asset = await Asset.read(context, { id, name: 'Text Document' });

      expect(asset).toBeDefined();
    });

    it('supports array query value', async () => {
      const { id } = await createAsset();
      const asset = await Asset.read(context, { id, name: [ 'Text Document', 'Text Document 2' ] });

      expect(asset).toBeDefined();
    });

    it('supports "null" query attribute value', async () => {
      const { id } = await createAsset();
      await expect(Asset.read(context, { id, name: null }))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('supports :not expression key', async () => {
      const { id } = await createAsset();
      await expect(Asset.read(context, { id, [`type:${ExpressionKey.NOT}`]: 'CONTENT' }))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('supports :not expression key with "null" value', async () => {
      const { id } = await createAsset();
      await expect(Asset.read(context, { id, [`folderId:${ExpressionKey.NOT}`]: null }))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('supports :contains expression key', async () => {
      const { id } = await createAsset();
      const asset = await Asset.read(context, { id, [`tags:${ExpressionKey.CONTAIN}`]: 'Tag A' });

      expect(asset).toBeDefined();
    });

    it('supports :not_contains expression key', async () => {
      const { id } = await createAsset();
      const asset = await Asset.read(context, { id, [`tags:${ExpressionKey.EXCLUDE}`]: 'Tag C' });

      expect(asset).toBeDefined();
    });
  });

  describe('Document._update(query, mutation, context, previousAttributes)', () => {
    it('throws DocumentNotFoundError if document not found', async () => {
      await expect(Asset.update(context, { id: 'AST_BAD_ID' }, { name: 'Text Document 2' }))
        .rejects
        .toThrow(DocumentNotFoundError);

      await expect(Asset._update({ partition: 'ORG_1', id: 'AST_BAD_ID' }, { name: 'Text Document 2' }, context, {}))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('updates a document', async () => {
      const { id } = await createAsset();
      const asset = await Asset.update(context, { id }, { name: 'Text Document 2' });

      expect(asset.attributes.name).toEqual('Text Document 2');
    });

    it('supports "null" mutation attribute value', async () => {
      const { id } = await createAsset({ folderId: 'FLD_1' });

      const asset = await Asset.update(context, { id }, { folderId: null });

      expect(asset.attributes.folderId).toEqual(undefined);
    });

    it('supports "null" mutation attribute value exclusively', async () => {
      const { id } = await createAsset({ folderId: 'FLD_1' });

      const item = await Asset._update({ partition: 'ORG_1', id }, { folderId: null }, context, {}) as Record<string, undefined>;

      expect(item.folderId).toBeUndefined();
    });

    it('supports :append mutation expression key', async () => {
      const { id } = await createAsset({ tags: [ 'Tag B' ] });

      const asset = await Asset.update(context, { id }, { 'tags:append': 'Tag C' });

      expect(asset.attributes.tags).toEqual([ 'Tag B', 'Tag C' ]);
    });

    it('supports :prepend mutation expression key', async () => {
      const { id } = await createAsset({ tags: [ 'Tag B' ] });

      const asset = await Asset.update(context, { id }, { 'tags:prepend': 'Tag A' });

      expect(asset.attributes.tags).toEqual([ 'Tag A', 'Tag B' ]);
    });

    it('supports array item by item index', async () => {
      const { id } = await createAsset({ tags: [ 'Tag B' ] });

      const asset = await Asset.update(context, { id }, { 'tags[0]': 'Tag A' });

      expect(asset.attributes.tags).toEqual([ 'Tag A' ]);
    });
  });

  describe('Document._delete(query)', () => {
    it('throws DocumentNotFoundError if document not found', async () => {
      await expect(Asset.delete(context, { id: 'AST_BAD_ID' }))
        .rejects
        .toThrow(DocumentNotFoundError);

      await expect(Asset._delete({ partition: 'ORG_1', id: 'AST_BAD_ID' }, context, {}))
        .rejects
        .toThrow(DocumentNotFoundError);
    });

    it('deletes a document', async () => {
      const { id } = await createAsset();

      await Asset.delete(context, { id });

      await expect(Asset.read(context, { id }))
        .rejects
        .toThrow(DocumentNotFoundError);
    });
  });

  describe('Document.index(context, query, options)', () => {
    beforeAll(async () => {
      await Asset.table.reset();

      await Promise.all(
        Array.from({ length: 600 + 15 }, (_, i) => createAsset({ name: `Text Document ${i + 1}` }))
      );

      await createActivity();
    }, 30000);

    describe('Document._indexAll(query, options)', () => {
      it('gets all documents from a table', async () => {
        const { count } = await Asset.indexAll(context);
        expect(count).toEqual(615);
      });
    });

    describe('Document._index(query, options)', () => {
      it('gets documents from a table with default options', async () => {
        const {
          count,
          limit,
          lastEvaluatedKey
        } = await Asset.index(context);

        expect(count).toEqual(20);
        expect(limit).toEqual(20);
        expect(lastEvaluatedKey).toBeDefined();

        const {
          count: count2,
          limit: limit2,
          lastEvaluatedKey: lastEvaluatedKey2
        } = await Activity.indexWithDateRange(context);

        expect(count2).toEqual(1);
        expect(limit2).toEqual(20);
        expect(lastEvaluatedKey2).toBeUndefined();
      });

      it('supports :lt condition via LT expression key', async () => {
        const query = { [`createdAt:${ExpressionKey.LT}`]: tomorrow };
        const { count } = await Asset.index(context, query);

        expect(count).toBeGreaterThan(0);
      });

      it('supports :le condition via LE expression key', async () => {
        const { objects } = await Asset.indexAll(context, {}, { sort: 'asc'});
        const [ firstAsset ] = objects;
        const { createdAt } = firstAsset.attributes;

        const query = { [`createdAt:${ExpressionKey.LE}`]: createdAt };
        const { count } = await Asset.index(context, query);

        expect(count).toEqual(1);
      });

      it('supports :gt condition via GT expression key', async () => {
        const query = { [`createdAt:${ExpressionKey.GT}`]: yesterday };
        const { count } = await Asset.index(context, query);

        expect(count).toBeGreaterThan(0);
      });

      it('supports :ge condition via GE expression key', async () => {
        const { objects } = await Asset.indexAll(context);
        const [ lastAsset ] = objects;
        const { createdAt } = lastAsset.attributes;

        const query = { [`createdAt:${ExpressionKey.GE}`]: createdAt };
        const { count } = await Asset.index(context, query);

        expect(count).toEqual(1);
      });

      it('supports :not condition via NOT expression key', async () => {
        const query = { [`type:${ExpressionKey.NOT}`]: 'CONTENT' };
        const { count } = await Asset.index(context, query);

        expect(count).toEqual(0);
      });

      it('supports :contains condition via CONTAIN expression key', async () => {
        const query = { [`tags:${ExpressionKey.CONTAIN}`]: 'Tag A' };
        const { count } = await Asset.index(context, query);

        expect(count).toBeGreaterThan(0);
      });

      it('supports :not_contains condition via EXCLUDE expression key', async () => {
        const query = { [`tags:${ExpressionKey.EXCLUDE}`]: 'Tag C' };
        const { count } = await Asset.index(context, query);

        expect(count).toBeGreaterThan(0);
      });

      it('supports :in condition via array query value', async () => {
        const query = { name: [ 'Text Document 1', 'Text Document 2' ] };
        const { count } = await Asset.index(context, query);

        expect(count).toEqual(2);
      });

      it('supports "null" condition via null query value', async () => {
        const { count: count1 } = await Asset.index(context, { folderId: null });

        expect(count1).toEqual(20);

        const { count: count2 } = await Asset.index(context, { [`name:${ExpressionKey.NOT}`]: null });

        expect(count2).toEqual(20);
      });
    });
  });

  describe('Document.composeIndexKeys', () => {
    describe('Document._create(attributes)', () => {
      let asset: Asset;

      beforeAll(async () => {
        const { id: assetId } = await createAsset();
        asset = await Asset.read(context, { id: assetId });
      });

      it('creates a document with a local secondary index sort key', async () => {
        const { createdAt } = asset.attributes;

        expect(asset.attributes._lsi2SortKey).toEqual(`#ACTIVE#${createdAt}`);
      });

      it('creates a document with a global secondary index partition and sort keys', async () => {
        const { partition, createdBy, createdAt } = asset.attributes;

        expect(asset.attributes._gsi1PartitionKey).toEqual(`AST#${partition}#${createdBy}`);
        expect(asset.attributes._gsi1SortKey).toEqual(`#ACTIVE#${createdAt}`);
      });
    });

    describe('Document._update(query, options)', () => {
      it('updates a document with updated local secondary index sort key', async () => {
        const { id } = await createAsset();

        const asset = await Asset.read(context, { id });
        const { createdAt } = asset.attributes;

        const archivedAsset = await Asset.archive(context, { id });

        expect(archivedAsset.attributes.status).toEqual('ARCHIVED');
        expect(archivedAsset.attributes._lsi2SortKey).toEqual(`#ARCHIVED#${createdAt}`);

        const unarchivedAsset = await Asset.unarchive(context, { id });

        expect(unarchivedAsset.attributes.status).toEqual('ACTIVE');
        expect(unarchivedAsset.attributes._lsi2SortKey).toEqual(`#ACTIVE#${createdAt}`);
      });
    });
  });

  describe('Document.isLocalSecondaryIndex(indexName)', () => {
    it('throws an exception if index is not defined', async () => {
      expect(() => Asset.isLocalSecondaryIndex('customLocalIndexName'))
        .toThrow('Index "customLocalIndexName" is not defined');
    });
  });

  describe('Document.getLocalIndexSortKeyName(indexName)', () => {
    beforeAll(async () => {
      await Asset.table.reset();

      await createActivity();
      await createActivity({ operationId: 'UpdateAsset' });
      await createActivity({ operationId: 'DeleteAsset' });

      const { id } = await createAsset();
      await Asset.archive(context, { id });

      await createOrganization();
    });

    it('throws an exception if local secondary index is not defined', async () => {
      expect(() => Asset.getLocalIndexSortKeyName('customLocalIndexName'))
        .toThrow('Local secondary index "customLocalIndexName" is not defined');
    });

    describe('Document._index(query, options)', () => {
      it('returns items from local secondary index with sort key = expression', async () => {
        const { objects } = await Asset.indexArchivedAssets(context, {}, { limit: 1 });

        const [ object ] = objects;
        const { createdAt } = object.attributes;

        const { indexName, sortKeyName } = Asset.getLocalIndexProps('lsi2');
        const query = { [sortKeyName]: `#ARCHIVED#${createdAt}` };

        const { count } = await Asset.index(context, query, { indexName });
        expect(count).toEqual(1);
      });

      it('returns items from local secondary index with sort key :bw', async () => {
        const { count: archivedCount } = await Asset.indexArchivedAssets(context);
        expect(archivedCount).toEqual(1);

        const { count: activeCount } = await Asset.indexActiveAssets(context);
        expect(activeCount).toEqual(0);
      });

      it('returns items from local secondary index with sort key :ge expression', async () => {
        const [ startDate ] = new Date().toISOString().split('T');

        const { count } = await Activity.indexWithDateRange(context, { startDate });
        expect(count).toEqual(3);
      });

      it('returns items from local secondary index with sort key :le expression', async () => {
        const [ endDate ] = new Date().toISOString().split('T');

        const { count } = await Activity.indexWithDateRange(context, { endDate });
        expect(count).toEqual(3);
      });

      it('returns items from local secondary index with sort key :gt and :lt expressions', async () => {
        const [ startDate ] = yesterday.split('T');
        const [ endDate ] = tomorrow.split('T');

        const { indexName, sortKeyName } = Asset.getLocalIndexProps('lsi3');

        const query = {
          [`${sortKeyName}:gt`]: `#${startDate}`,
          [`${sortKeyName}:lt`]: `#${endDate}`,
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(3);
      });

      it('returns items from local secondary index with sort key :gt expression', async () => {
        const [ startDate ] = yesterday.split('T');

        const { indexName, sortKeyName } = Asset.getLocalIndexProps('lsi3');

        const query = {
          [`${sortKeyName}:gt`]: `#${startDate}`,
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(3);
      });

      it('returns items from local secondary index with sort key :lt expression', async () => {
        const [ startDate ] = tomorrow.split('T');

        const { indexName, sortKeyName } = Asset.getLocalIndexProps('lsi3');

        const query = {
          [`${sortKeyName}:lt`]: `#${startDate}`,
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(3);
      });
    });
  });

  describe('Document.getGlobalIndexPartitionKeyName(indexName)', () => {
    it('throws an exception if global secondary index is not defined', async () => {
      expect(() => Asset.getGlobalIndexPartitionKeyName('customGlobalIndexName'))
        .toThrow('Global secondary index "customGlobalIndexName" is not defined');
    });
  });

  describe('Document.getGlobalIndexSortKeyName(indexName)', () => {
    beforeAll(async () => {
      await Asset.table.reset();

      await createActivity();
      await createActivity({ operationId: 'UpdateAsset' });
      await createActivity({ operationId: 'DeleteAsset' });

      const { id } = await createAsset();
      await Asset.archive(context, { id });

      await createOrganization();
    });

    it('throws an exception if global secondary index is not defined', async () => {
      expect(() => Asset.getGlobalIndexSortKeyName('customGlobalIndexName'))
        .toThrow('Global secondary index "customGlobalIndexName" is not defined');
    });

    describe('Document._index(query, options)', () => {
      it('returns items from primary table', async () => {
        const { count } = await Activity.index(context);
        expect(count).toEqual(3);
      });

      it('returns items from global index without sort key', async () => {
        const {
          indexName,
          partitionKeyName,
        } = Activity.getGlobalIndexProps('gsi2');

        const query = {
          [partitionKeyName]: 'ORG_1#UpdateAsset',
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(1);
      });

      it('returns items from global secondary index', async () => {
        const query = { operationId: 'UpdateAsset' };

        const { count } = await Activity.indexWithDateRange(context, query);
        expect(count).toEqual(1);
      });

      it('returns items from global secondary index with sort key :bw expression', async () => {
        const createdBy = 'USR_1';

        const { count: archivedCount } = await Asset.indexArchivedAssets(context, { createdBy });
        expect(archivedCount).toEqual(1);

        const { count: activeCount } = await Asset.indexActiveAssets(context, { createdBy });
        expect(activeCount).toEqual(0);
      });

      it('returns items from global secondary index with sort key :ge expression', async () => {
        const operationId = 'UpdateAsset';
        const [ startDate ] = new Date().toISOString().split('T');

        const { count } = await Activity.indexWithDateRange(context, { operationId, startDate });
        expect(count).toEqual(1);
      });

      it('returns items from global secondary index with sort key :le expression', async () => {
        const userId = 'USR_1';
        const [ endDate ] = new Date().toISOString().split('T');

        const { count } = await Activity.indexWithDateRange(context, { userId, endDate });
        expect(count).toEqual(3);
      });

      it('returns items from global secondary index with sort key :gt and :lt expressions', async () => {
        const [ startDate ] = yesterday.split('T');
        const [ endDate ] = tomorrow.split('T');

        const {
          indexName,
          sortKeyName,
          partitionKeyName,
        } = Activity.getGlobalIndexProps('gsi2');

        const query = {
          [partitionKeyName]: 'ORG_1#UpdateAsset',
          [`${sortKeyName}:gt`]: `#${startDate}`,
          [`${sortKeyName}:lt`]: `#${endDate}`,
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(1);
      });

      it('returns items from global secondary index with sort key :gt expression', async () => {
        const [ startDate ] = yesterday.split('T');

        const {
          indexName,
          sortKeyName,
          partitionKeyName,
        } = Activity.getGlobalIndexProps('gsi2');

        const query = {
          [partitionKeyName]: 'ORG_1#UpdateAsset',
          [`${sortKeyName}:gt`]: `#${startDate}`,
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(1);
      });

      it('returns items from global secondary index with sort key :lt expression', async () => {
        const [ startDate ] = tomorrow.split('T');

        const {
          indexName,
          sortKeyName,
          partitionKeyName,
        } = Activity.getGlobalIndexProps('gsi2');

        const query = {
          [partitionKeyName]: 'ORG_1#UpdateAsset',
          [`${sortKeyName}:lt`]: `#${startDate}`,
        };

        const { count } = await Activity.index(context, query, { indexName });
        expect(count).toEqual(1);
      });
    });
  });
});
