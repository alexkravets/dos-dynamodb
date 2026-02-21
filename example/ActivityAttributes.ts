import { Schema } from '@kravc/schema';
import { DefaultAttributes } from '../src';

type Identity = {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export interface ActivityAttributes extends DefaultAttributes {
  operationId: string;
  summaryTemplate: string;
  parametersJson?: string;
  resultDocumentJson?: string;
  userId: string;
  traceId: string;
  userAgent: string;
  ipAddress: string;
  identity?: Identity
}

export const schema = new Schema({
  operationId: {
    required: true
  },
  summaryTemplate: {
    required: true
  },
  parametersJson: {
    type: 'string',
  },
  resultDocumentJson: {
    type: 'string',
  },
  userId: {
    required: true
  },
  traceId: {
    required: true
  },
  userAgent: {
    required: true
  },
  ipAddress: {
    required: true
  },
  identity: {
    type: 'object',
    properties: {
      sub: {
        required: true
      },
      email: {
        required: true
      },
      firstName: {
        required: true
      },
      lastName: {
        required: true
      },
      permissions: {
        required: true,
        items: {
          type: 'string'
        },
      }
    }
  }
}, 'ActivityBody');
