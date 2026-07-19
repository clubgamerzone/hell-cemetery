import { SUBWEAPON_DEFAULTS } from '../data/subweaponDefaults';

export const ELEMENTS = ['Physical', 'Fire', 'Ice', 'Lightning', 'Poison', 'Holy', 'Dark', 'Arcane'];

export function normalizeSubweaponSettings(data) {
  const remote = data?.subweapons || {};
  return Object.entries(SUBWEAPON_DEFAULTS).map(([key, defaults]) => {
    const raw = remote[key] && typeof remote[key] === 'object' ? remote[key] : {};
    const merged = { ...defaults, ...raw };
    return { ...merged, id: key, firebaseKey: key, writePath: `SubweaponSettings/subweapons/${key}`, elementLabel: ELEMENTS[Number(merged.element)] || String(merged.element || 'Physical'), existsInFirebase: Object.keys(raw).length > 0, raw, defaults };
  });
}
