#!/usr/bin/env node

'use strict';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Table } = require('../dist/src');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exec } = require('child_process');

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

/** Starts dynamodb in the Docker and runs a command. */
const run = async callback => {
  if (env) {
    return callback();
  }

  const command = exec('docker compose -f node_modules/@kravc/dos-dynamodb/docker-compose.yaml up -d', callback);
  command.stdout.on('data', data => console.log(data));
  command.stderr.on('data', data => console.error(data));
};

const COMMANDS = {
  reset: _reset,
  create: _create,
  delete: _delete,
};

run(() => COMMANDS[command]());
