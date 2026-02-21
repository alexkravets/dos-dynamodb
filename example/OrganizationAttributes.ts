import { Schema } from '@kravc/schema';
import { DefaultAttributes } from '../src';

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED'
}

export interface OrganizationAttributes extends DefaultAttributes {
  name: string;
  status: OrganizationStatus;
  number: number;
}

export const schema = new Schema({
  name: {
    required: true
  },
  status: {
    enum: [ OrganizationStatus.ACTIVE, OrganizationStatus.DISABLED ],
    required: true,
  },
  number: {
    type: 'integer',
    minimum: 1,
    required: true,
  }
}, 'OrganizationBody');
