import fs from 'node:fs';
import config from 'config';
import getTableOptions from '../getTableOptions';

/* The config of the package is frozen, so a test gives one of its own. */
jest.mock('config', () => ({ get: jest.fn() }));

const getConfigMock = config.get as unknown as jest.Mock;

describe('getTableOptions(partitionKey, sortKey)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names the table after the package if the config has no name', () => {
    getConfigMock.mockReturnValue({});

    const { name } = getTableOptions('partition', 'id');

    expect(name).toEqual('kravc-dos-dynamodb');
  });

  it('takes the name of the config without reading the package', () => {
    getConfigMock.mockReturnValue({ name: 'custom-table' });

    const readFileSpy = jest.spyOn(fs, 'readFileSync');

    const { name } = getTableOptions('partition', 'id');

    expect(name).toEqual('custom-table');
    expect(readFileSpy).not.toHaveBeenCalled();
  });
});
