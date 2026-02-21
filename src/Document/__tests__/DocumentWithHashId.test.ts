import { Organization } from '../../../example';
import {
  resetTable,
  createContext,
  createAsset,
  createActivity,
  createOrganization,
} from './__helpers';

describe('DocumentWithHashId', () => {
  const context = createContext();

  beforeAll(async () => {
    await resetTable();
  });

  describe('DocumentWithHashId._create(attributes, context)', () => {
    it('creates first document with hash ID and number 1', async () => {
      const organization = await createOrganization();

      expect(organization.attributes.id).toEqual('O49');
      expect(organization.attributes.number).toEqual(1);
    });

    it('creates next document with hash ID and next number', async () => {
      const organization = await createOrganization({ name: 'Organization 2' });

      expect(organization.attributes.id).toEqual('O6E');
      expect(organization.attributes.number).toEqual(2);
    });

    it('creates next document with hash ID and next number if race condition happens', async () => {
      const attributes = {
        id: undefined,
        name: 'Organization 3',
        number: 2,
        partition: 'PLATFORM',
      };

      await Organization._create(attributes, context);

      expect(attributes.id).toEqual('O9D');
    });
  });

  describe('DocumentWithHashId._getIndexQuery(query, options)', () => {
    let id: string;

    beforeAll(async () => {
      await resetTable();

      const organization = await createOrganization();
      await createOrganization({ name: 'Organization 2' });
      await createOrganization({ name: 'Organization 3' });

      id = organization.id;
      await Organization.disable(context, { id });

      await createAsset();
      await createActivity();
    });

    it('returns all documents using first local secondary index', async () => {
      const { count } = await Organization.indexAll(context);

      expect(count).toEqual(3);
    });

    it('returns documents using custom global secondary index', async () => {
      const { count } = await Organization.listActiveOrganizations(context);

      expect(count).toEqual(2);

      await Organization.enable(context, { id });

      const { count: count2 } = await Organization.listActiveOrganizations(context);

      expect(count2).toEqual(3);
    });
  });
});
