import { POI_DESTINATION_CATEGORIES } from '@repo/shared';
import { DESTINATION_DATASETS } from '@repo/shared/data/poi-datasets';

const KNOWN_CATEGORIES = new Set<string>(POI_DESTINATION_CATEGORIES);
const YEREVAN_SHARED_SLUGS = new Set(['yerevan', 'abovyan', 'vagharshapat']);

function isAllowedSharedId(leftSlug: string, rightSlug: string): boolean {
  return YEREVAN_SHARED_SLUGS.has(leftSlug) && YEREVAN_SHARED_SLUGS.has(rightSlug);
}

describe('DESTINATION_DATASETS catalog', () => {
  it('has unique destination ids within each city dataset', () => {
    for (const dataset of DESTINATION_DATASETS) {
      const ids = dataset.destinations.map((destination) => destination.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it('does not reuse ids across unrelated cities', () => {
    const ownerById = new Map<string, string>();
    const clashes: string[] = [];
    for (const dataset of DESTINATION_DATASETS) {
      for (const destination of dataset.destinations) {
        const existing = ownerById.get(destination.id);
        if (!existing) {
          ownerById.set(destination.id, dataset.citySlug);
          continue;
        }
        if (isAllowedSharedId(existing, dataset.citySlug)) continue;
        clashes.push(destination.id);
      }
    }
    expect(clashes).toEqual([]);
    expect(ownerById.size).toBeGreaterThan(40);
  });
  it('uses only known destination categories', () => {
    const unknown: string[] = [];
    for (const dataset of DESTINATION_DATASETS) {
      for (const destination of dataset.destinations) {
        if (!KNOWN_CATEGORIES.has(destination.category)) {
          unknown.push(`${destination.id}:${destination.category}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });
});
