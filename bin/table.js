#!/usr/bin/env node

'use strict';

const command = process.argv[2];
const isInvalidCommand = ![ 'up', 'create', 'delete', 'reset' ].includes(command);

if (isInvalidCommand) {
  console.info('table [create|delete|reset] [ENV=dev|stg|prd]\n');
  console.info('Commands:');
  console.info('  create     Create tables defined in configuration');
  console.info('  delete     Delete tables defined in "/config/default.yaml"');
  console.info('  reset      Reset tables defined in "/config/default.yaml"');
  console.info('\nDefault configuration file: "/config/default.yaml".');

  process.exit(1);
}

const env = process.argv[3];

if (env) {
  process.env.NODE_ENV = 'serverless';
  process.env.NODE_APP_INSTANCE = env;
}

// NOTE: It's important to require Table module after env has been adjusted:
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Table } = require('../dist/src');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exec } = require('child_process');

/** Runs an action for a table. */
const _action = async (methodName) => {
  const table = new Table({
    sortKey: 'id',
    partitionKey: 'partition',
  });

  const { name: tableName } = table.options;

  try {
    await table[methodName]();
    console.info(`Table "${tableName}" ${methodName}d`);

  } catch (dynamoError) {
    const { name: errorName } = dynamoError;

    if (errorName === 'ResourceInUseException') {
      console.info(`Table "${tableName}" skipped`);

    } else if (errorName === 'ResourceNotFoundException') {
      console.info(`Table "${tableName}" not found`);

    } else {
      console.error(dynamoError);
      process.exit(1);

    }
  }
};

/** Creates a table. */
const _create = () => _action('create');

/** Deletes a table. */
const _delete = () => _action('delete');

/** Resets a table. */
const _reset = async () => {
  await _delete();
  await _create();
};

const isMac = process.platform === 'darwin';
const CONTAINER_NAME = 'dynamo';
const IMAGE = 'amazon/dynamodb-local:latest';

/** Starts dynamodb and runs a command. */
const run = async callback => {
  if (env) {
    return callback();
  }

  if (isMac) {
    const { spawnSync, execSync } = require('child_process');

    const [info] = JSON.parse(spawnSync('container', ['inspect', CONTAINER_NAME], { encoding: 'utf8' }).stdout || '[]');

    if (info) {
      if (info.status === 'running') {
        return callback();
      }

      execSync(`container rm ${CONTAINER_NAME}`, { stdio: 'inherit' });
    }

    execSync(`container run --detach --name ${CONTAINER_NAME} --publish 8000:8000 ${IMAGE}`, { stdio: 'inherit' });
    return callback();
  }

  const command = exec('docker compose --project-name dos -f node_modules/@kravc/dos-dynamodb/docker-compose.yaml up -d', callback);
  command.stdout.on('data', data => console.log(data));
  command.stderr.on('data', data => console.error(data));
};

const COMMANDS = {
  reset: _reset,
  create: _create,
  delete: _delete,
};

run(() => COMMANDS[command]());
