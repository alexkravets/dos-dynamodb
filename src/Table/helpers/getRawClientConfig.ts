import { homedir } from 'os';
import { fromIni } from '@aws-sdk/credential-providers';
import { existsSync } from 'fs';
import { LOCAL_REGION } from './getTableOptions';
import { type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

const HOME = homedir();
const hasAwsCredentials = existsSync(`${HOME}/.aws/credentials`);

const LOCAL_ENDPOINT = 'http://0.0.0.0:8000';
const DEFAULT_MAX_ATTEMPTS = 10;

/** Returns config for DynamoDB raw client. */
const getRawClientConfig = (region: string, profile: string): DynamoDBClientConfig => {
  const config = {
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    region,
  } as DynamoDBClientConfig;

  const isLocal = region === LOCAL_REGION;

  /* istanbul ignore else */
  if (isLocal) {
    config.endpoint = LOCAL_ENDPOINT;
  }

  /* istanbul ignore else */
  if (hasAwsCredentials) {
    config.credentials = fromIni({ profile });
  }

  return config;
};

export default getRawClientConfig;
