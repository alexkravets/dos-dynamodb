import getRawClientConfig from './getRawClientConfig';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

export type Client = {
  rawClient: DynamoDBClient;
  documentClient: DynamoDBDocument;
};

/*
 * The clients of the process, by region and profile: a client keeps its own
 * connections open, so every table of a region shares one, and none is made
 * for a request.
 */
const clients = new Map<string, Client>();

/** Returns the client of a region and a profile, the same at every call. */
const getClient = (region: string, profile: string): Client => {
  const key = `${region}:${profile}`;

  let client = clients.get(key);

  if (!client) {
    const config = getRawClientConfig(region, profile);

    const rawClient = new DynamoDBClient(config);
    const documentClient = DynamoDBDocument.from(rawClient);

    client = { rawClient, documentClient };

    clients.set(key, client);
  }

  return client;
};

export default getClient;
