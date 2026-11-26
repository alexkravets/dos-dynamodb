# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com), and
this package adheres to [Semantic Versioning](https://semver.org).

## [1.1.2] - 2026-11-26

### Fixed

- A process no longer opens connections to DynamoDB until it has no more
  to open (`EMFILE`): every read of `Document.table` made a table with a
  client of its own, several a request, and none was closed. A document
  class keeps one table, and the tables of a region share one client.
- The name of the package is no longer read from `package.json` for a
  table named in `dynamodb.name`.

### Changed

- `Document.table` returns the same `Table` at every read, so a change
  to its `options` stays.

## [1.1.1] - 2026-11-16

### Added

- `dynamodb.indexProjections` option: a list of attribute names by the name
  of an index creates that index with those attributes and the keys
  (`INCLUDE`), and an empty list with the keys alone (`KEYS_ONLY`). An
  index without one holds every attribute (`ALL`), as before. Creating a
  table fails when a name there is not one of its indexes.

## [1.1.0] - 2026-11-16

Unpublished: it had the option as `projection` on an index of
`dynamodb.localSecondaryIndexes` and `dynamodb.globalSecondaryIndexes`,
which 1.1.1 replaces with `dynamodb.indexProjections`.

## [1.0.2] - 2026-03-23

### Fixed

- `table reset` starts DynamoDB Local with `apple/container` on macOS.

## [1.0.1] - 2026-03-23

### Fixed

- A local table uses the credentials `local` when the environment has
  none.

## [1.0.0] - 2026-03-23

### Added

- `Document` and `DocumentWithHashId` classes for `@kravc/dos`, with
  `create`, `get`, `update`, `delete`, `index`, and `indexAll` against a
  single DynamoDB table.
- Local and global secondary indexes, with keys composed from the
  `dynamodb.indexKeys` templates.
- `table` command to create, delete, and reset a table.

[1.1.2]: https://github.com/alexkravets/dos-dynamodb/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/alexkravets/dos-dynamodb/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/alexkravets/dos-dynamodb/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/alexkravets/dos-dynamodb/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/alexkravets/dos-dynamodb/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/alexkravets/dos-dynamodb/releases/tag/v1.0.0
