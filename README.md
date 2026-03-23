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

## Development

Tests require DynamoDB Local to be running on port 8000.

**macOS** — uses [apple/container](https://github.com/apple/container) (requires macOS 26+):

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

Revision: March 23, 2026<br/>
By: Oleksandr Kravets (@alexkravets)
