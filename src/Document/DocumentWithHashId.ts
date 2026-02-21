import Hashids from 'hashids';
import Document from './Document';
import { get, set } from 'lodash';
import { wait, DocumentExistsError, type QueryMap, type Context } from '@kravc/dos';

const CHARACTER_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const DEFAULT_INDEX_NAME = 'lsi1';
const DEFAULT_NUMBER_KEY = 'number';

/** Document class that uses hash ID as id key. */
class DocumentWithHashId<T> extends Document<T> {
  /** Returns salt for hash ID method. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getSalt<T>(_context: Context, _attributes: T): string {
    return this.name;
  };

  /** Returns number key. */
  static get numberKey() {
    return DEFAULT_NUMBER_KEY;
  }

  /** Ensures index query without index name uses lsi1 to sort documents. */
  static _getIndexQuery(query: QueryMap, { indexName }: { indexName?: string }) {
    return indexName
      ? super._getIndexQuery(query, { indexName })
      : super._getIndexQuery(query, { indexName: DEFAULT_INDEX_NAME });
  }

  /** Returns number for the next document. */
  static async _getNextDocumentNumber(context: Context) {
    const query = {};
    const options = { limit: 1, sort: this.indexDefaultSort };

    const { objects: documents } = await this.index(context, query, options);
    const [ previousDocument ] = documents;

    if (!previousDocument) {
      return 1;
    }

    const number = get(previousDocument.attributes, this.numberKey, 0 );

    return number + 1;
  }

  /** Ensures creation of a document with generated ID. */
  static async _create<T>(attributes: T, context: Context): Promise<void> {
    let number = get(attributes, this.numberKey) as number | undefined;

    if (!number) {
      number = await this._getNextDocumentNumber(context);
    }

    const salt = this.getSalt(context, attributes);
    const hashids = new Hashids(salt, 0, CHARACTER_SET);
    const hashId = hashids.encode(number);

    const id = `${this.idPrefix}${hashId}`;

    set(attributes as Record<string, unknown>, this.numberKey, number);
    set(attributes as Record<string, unknown>, this.idKey, id);

    try {
      await super._create(attributes, context);
      return;

    } catch (error) {
      const isDocumentExistsError = error instanceof DocumentExistsError;

      /* istanbul ignore next */
      if (!isDocumentExistsError) {
        throw error;
      }
    }

    await wait(50);

    set(attributes as Record<string, unknown>, this.numberKey, number! + 1);

    return this._create(attributes, context);
  }
};

export default DocumentWithHashId;
