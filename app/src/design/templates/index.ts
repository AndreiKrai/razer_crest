import type { TemplateId, Theme } from '../tokens';
import { blueprint } from './blueprint';
import { space } from './space';

export const TEMPLATES: Record<TemplateId, Theme> = { blueprint, space };

/** Order in the template picker. */
export const TEMPLATE_IDS: TemplateId[] = ['blueprint', 'space'];

export const DEFAULT_TEMPLATE: TemplateId = 'blueprint';

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATES, value);
}

/** Unknown or missing ids (a file from a newer app) fall back to the default. */
export function getTemplate(id: string | undefined): Theme {
  return isTemplateId(id) ? TEMPLATES[id] : TEMPLATES[DEFAULT_TEMPLATE];
}
