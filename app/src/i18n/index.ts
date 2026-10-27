import { getLocales } from 'expo-localization';

import { en, type TKey } from './en';
import { uk } from './uk';

export type { TKey };

const dictionaries = { en, uk };

// Read once at startup: switching language in-app isn't supported yet.
const lang = getLocales()[0]?.languageCode === 'uk' ? 'uk' : 'en';

export function t(key: TKey, params?: Record<string, string | number>): string {
  let text: string = dictionaries[lang][key] ?? en[key];
  if (params) {
    for (const name of Object.keys(params)) {
      text = text.replace('{' + name + '}', String(params[name]));
    }
  }
  return text;
}
