import getClient from '../getClient';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

describe('getClient(region, profile)', () => {
  it('returns the same client at every call for a region and a profile', () => {
    const fromSpy = jest.spyOn(DynamoDBDocument, 'from');

    const client = getClient('local', 'private');

    expect(getClient('local', 'private')).toBe(client);
    expect(getClient('local', 'private').rawClient).toBe(client.rawClient);
    expect(fromSpy).toHaveBeenCalledTimes(1);

    fromSpy.mockRestore();
  });

  it('returns a client of its own for another region or profile', () => {
    const client = getClient('local', 'private');

    expect(getClient('local', 'other')).not.toBe(client);
    expect(getClient('us-east-1', 'private')).not.toBe(client);
  });
});
