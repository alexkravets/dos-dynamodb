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

## License

ISC

---

Revision: February 21, 2026<br/>
By: Oleksandr Kravets (@alexkravets)
