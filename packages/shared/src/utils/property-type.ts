import type { PropertyType } from '../types/index';
import { PropertyTypes } from '../types/index';

/**
 * Maps free-text / LLM property-type strings onto a canonical `PropertyType`.
 * Accepts enum values (any case) and common synonyms in EN/HY/RU.
 */
export function normalizePropertyType(value: string | undefined): PropertyType | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const asEnum = trimmed.toUpperCase().replace(/[\s-]+/g, '_');
  if ((PropertyTypes as readonly string[]).includes(asEnum)) {
    return asEnum as PropertyType;
  }
  return inferPropertyTypeFromText(trimmed);
}

/**
 * Infers a property type from guest free text when the model omitted `propertyType`.
 * Checks more specific phrases before broader ones (e.g. hotel room before house).
 */
export function inferPropertyTypeFromText(text: string): PropertyType | undefined {
  const lower = text.toLowerCase();
  if (
    /\bhotel[_\s-]?room\b/.test(lower) ||
    lower.includes('отель') ||
    lower.includes('հյուրանոց')
  ) {
    return 'HOTEL_ROOM';
  }
  if (
    /\bguesthouse\b/.test(lower) ||
    /\bguest[_\s-]?house\b/.test(lower) ||
    lower.includes('гостев') ||
    lower.includes('հյուրատուն')
  ) {
    return 'GUESTHOUSE';
  }
  if (/\bstudio\b/.test(lower) || lower.includes('студи') || lower.includes('ստուդի')) {
    return 'STUDIO';
  }
  if (/\bvilla\b/.test(lower) || lower.includes('вилл') || lower.includes('վիլլ')) {
    return 'VILLA';
  }
  if (
    /\bapartment\b/.test(lower) ||
    /\bflat\b/.test(lower) ||
    lower.includes('квартир') ||
    lower.includes('բնակարան')
  ) {
    return 'APARTMENT';
  }
  if (
    /\bhouse\b/.test(lower) ||
    /\bcottage\b/.test(lower) ||
    /(^|[^\p{L}])дом([^\p{L}]|$)/u.test(lower) ||
    /(^|[^\p{L}])տուն([^\p{L}]|$)/u.test(lower)
  ) {
    return 'HOUSE';
  }
  return undefined;
}
