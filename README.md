# @kravc/dos-dynamodb

DynamoDB-backed CRUD layer for [@kravc/dos](https://github.com/alexkravets/dos). Exposes **Document** and **DocumentWithHashId** classes that plug into the dos service: define a schema and partition/sort keys, then use `create`, `get`, `update`, `delete`, and `index` (with GSI/LSI support) against a DynamoDB table.

**Examples** (see `example/`):

- **Asset** — `Document` with status filtering, archive/unarchive, and index queries (LSI/GSI).
- **Activity** — `Document` usage with activity-specific attributes and indexing.
- **Organization** — `DocumentWithHashId` with a fixed partition, list/disable/enable and `indexAll`.

Install:

```sh
npm i --save @kravc/dos-dynamodb
```

List supported DynamoDB table commands:

```sh
npx table
```

## Indexes

A table is created with three local secondary indexes, `lsi1` to `lsi3`, and
three global ones, `gsi1` to `gsi3`. Define `dynamodb.localSecondaryIndexes`
or `dynamodb.globalSecondaryIndexes` in the config to replace either list:

```yaml
dynamodb:
  globalSecondaryIndexes:
    - name: gsi1
      partitionKey: _gsi1PartitionKey
      sortKey: _gsi1SortKey
```

An index holds every attribute of an item (`ALL`). To make one hold less,
list its attributes by the name of the index in `dynamodb.indexProjections`:

```yaml
dynamodb:
  indexProjections:
    gsi1:
      - name
      - status
```

- **A list of attribute names** — the index holds those attributes and the
  keys (`INCLUDE`); a read of it costs less, and returns items with nothing
  else: the listed attributes, the keys of the table, and the keys of the
  index.
- **An empty list** — the index holds the keys alone (`KEYS_ONLY`).

Creating a table fails when a name there is not one of its indexes.

A projection is set when the table is created: to change it, create the
table again.

## Development

Tests require DynamoDB Local to be running on port 8000.

**macOS** — uses [apple/container](https://github.com/apple/container) (requires macOS 26+):

Install `container` via Homebrew:

```sh
brew install apple/apple/container
```

Then start the service and run tests:

```sh
container system start
npm test
```

To start the container service automatically at login:

```sh
cat > ~/Library/LaunchAgents/com.apple.container.start.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.apple.container.start</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/container</string>
    <string>system</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF
launchctl load ~/Library/LaunchAgents/com.apple.container.start.plist
```

**Linux** — uses Docker:

```sh
npm test
```

`npm run db:up` starts the container (skips if already running). `npm run db:down` stops and removes it.

## License

ISC

---

Revision: November 16, 2026<br/>
By: Oleksandr Kravets (@alexkravets)
