#!/usr/bin/env node

'use strict';

const http = require('http');
const { execSync, spawnSync } = require('child_process');

const CONTAINER_NAME = 'dynamo';
const IMAGE = 'amazon/dynamodb-local:latest';
const DYNAMO_PORT = 8000;

const isMac = process.platform === 'darwin';

/** Resolves true when DynamoDB Local is accepting connections, false on timeout. */
const waitForDynamo = (timeout = 10000) => new Promise(resolve => {
  const deadline = Date.now() + timeout;

  const poll = () => {
    const req = http.request({ hostname: 'localhost', port: DYNAMO_PORT, method: 'GET', path: '/' }, () => resolve(true));
    req.on('error', () => {
      if (Date.now() < deadline) setTimeout(poll, 100);
      else resolve(false);
    });
    req.end();
  };

  poll();
});

const main = async () => {
  if (isMac) {
    const serviceCheck = spawnSync('container', ['system', 'status'], { encoding: 'utf8' });
    const isServiceRunning = serviceCheck.stdout?.includes('is running');

    if (!isServiceRunning) {
      console.error('Error: Apple container system service is not running.');
      console.error('Start it with: container system start');
      process.exit(1);
    }

    const result = spawnSync('container', ['inspect', CONTAINER_NAME], { encoding: 'utf8' });

    if (result.status === 0) {
      const [info] = JSON.parse(result.stdout);

      if (info.status === 'running') {
        console.info(`Container "${CONTAINER_NAME}" is already running`);
        return;
      }

      execSync(`container rm ${CONTAINER_NAME}`, { stdio: 'inherit' });
    }

    execSync(
      `container run --detach --name ${CONTAINER_NAME} --publish 8000:8000 ${IMAGE}`,
      { stdio: 'inherit' }
    );

  } else {
    execSync(
      'docker compose --project-name dos -f ./docker-compose.yaml up -d',
      { stdio: 'inherit' }
    );
  }

  const ready = await waitForDynamo();

  if (!ready) {
    console.error('Error: DynamoDB Local did not become ready in time.');
    process.exit(1);
  }
};

main();
