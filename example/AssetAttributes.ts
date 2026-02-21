import { Schema } from '@kravc/schema';
import { DefaultAttributes } from '../src';

export enum AssetType {
  FILE = 'FILE',
  CONTENT = 'CONTENT'
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface AssetAttributes extends DefaultAttributes {
  name: string;
  tags: string[];
  folderId?: string;
  type: AssetType;
  status: AssetStatus;
  content?: string;
  file?: {
    url: string;
    size: number;
    name: string;
    mimeType: string;
    lastModifiedAt: string;
    thumbnailUrl?: string;
  }
}

export const schema = new Schema({
  name: {
    required: true
  },
  tags: {
    items: {
      type: 'string',
    },
    required: true
  },
  folderId: {
    type: 'string',
  },
  thumbnailUrl: {
    type: 'string',
    format: 'url',
  },
  type: {
    enum: [ AssetType.FILE, AssetType.CONTENT ],
    required: true,
  },
  status: {
    enum: [ AssetStatus.ACTIVE, AssetStatus.ARCHIVED ],
    required: true,
  },
  content: {
    type: 'string'
  },
  file: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        format: 'url',
        required: true,
      },
      size: {
        type: 'integer',
        min: 0,
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      mimeType: {
        type: 'string',
        required: true,
      },
      lastModifiedAt: {
        type: 'string',
        format: 'date-time',
        required: true,
      },
    }
  }
}, 'AssetBody');
