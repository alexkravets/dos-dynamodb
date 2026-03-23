#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');

const CONTAINER_NAME = 'dynamo';

const isMac = process.platform === 'darwin';

if (isMac) {
  execSync(`container stop ${CONTAINER_NAME}`, { stdio: 'inherit' });
  execSync(`container rm ${CONTAINER_NAME}`, { stdio: 'inherit' });

} else {
  execSync(
    'docker compose --project-name dos -f ./docker-compose.yaml down',
    { stdio: 'inherit' }
  );
}
