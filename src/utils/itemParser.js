const DEFAULT_DESCRIPTION =
  'An artifact of unknown power, forged in the depths of the cemetery.';

const ITEM_TYPE_LABELS = {
  0: 'Usable',
  1: 'Weapon',
  2: 'Armor',
  3: 'Helmet',
  4: 'Boots',
  5: 'Ring',
  6: 'Amulet',
  7: 'Legs',
  8: 'Shield',
  9: 'Material',
  10: 'Quest',
  11: 'Misc',
};

const RARITY_LABELS = {
  0: 'Common',
  1: 'Normal',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Unique',
  5: 'Legendary',
};

const STAT_DEFINITIONS = [
  ['healthToGive', 'Healing'],
  ['stamineToGive', 'Stamina'],
  ['heartsToGive', 'Hearts Restored'],
  ['strenghtToIncrease', 'Strength'],
  ['heartsToIncrease', 'Hearts'],
  ['healthToIncrease', 'Health'],
  ['weaponDamageIncrease', 'Weapon Damage'],
  ['subweaponDamageMult', 'Subweapon Damage'],
  ['maxHealthToIncrease', 'Max Health'],
  ['defToIncrease', 'Defense'],
  ['stamineToIncrease', 'Max Stamina'],
  ['temporaryAttackBonus', 'Timed Attack'],
  ['temporaryDefenseBonus', 'Timed Defense'],
  ['temporaryMaxStaminaBonus', 'Timed Max Stamina'],
  ['temporaryMaxHealthBonus', 'Timed Max Health'],
  ['temporaryMaxHeartsBonus', 'Timed Hearts'],
  ['temporarySubweaponDamageMultiplierBonus', 'Timed Subweapon Mult'],
  ['temporaryEffectDurationMinutes', 'Duration Minutes'],
  ['bonusDamageToUndeadPercent', 'Damage to Undead %'],
  ['bonusDamageToDemonPercent', 'Damage to Demon %'],
  ['bonusDamageToBeastPercent', 'Damage to Beast %'],
  ['bonusDamageToHumanPercent', 'Damage to Human %'],
  ['bonusDamageToConstructPercent', 'Damage to Construct %'],
  ['bonusDamageToSpiritPercent', 'Damage to Spirit %'],
  ['bonusDamageToInsectPercent', 'Damage to Insect %'],
  ['bonusDamageToPlantPercent', 'Damage to Plant %'],
  ['bonusDamageToAquaticPercent', 'Damage to Aquatic %'],
  ['bonusDamageToDragonPercent', 'Damage to Dragon %'],
  ['bonusDamageToAberrationPercent', 'Damage to Aberration %'],
  ['physicalDamage', 'Physical Damage'],
  ['fireDamage', 'Fire Damage'],
  ['iceDamage', 'Ice Damage'],
  ['lightningDamage', 'Lightning Damage'],
  ['poisonDamage', 'Poison Damage'],
  ['holyDamage', 'Holy Damage'],
  ['darkDamage', 'Dark Damage'],
  ['arcaneDamage', 'Arcane Damage'],
  ['physicalDefensePercent', 'Physical Defense %'],
  ['fireDefensePercent', 'Fire Defense %'],
  ['iceDefensePercent', 'Ice Defense %'],
  ['lightningDefensePercent', 'Lightning Defense %'],
  ['poisonDefensePercent', 'Poison Defense %'],
  ['holyDefensePercent', 'Holy Defense %'],
  ['darkDefensePercent', 'Dark Defense %'],
  ['arcaneDefensePercent', 'Arcane Defense %'],
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatEnum(value, labels) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    return labels[Number(value)] || String(value);
  }
  return String(value).replace(/_/g, ' ');
}

function stripEffectText(description) {
  if (!description) return DEFAULT_DESCRIPTION;
  const cleaned = String(description)
    .replace(/(\r?\n|\s)*(effects|efectos|efeitos)\s*:.*$/is, '')
    .trim();
  return cleaned || DEFAULT_DESCRIPTION;
}

function dataUriFromBase64(base64, mimeType) {
  if (!base64) return null;
  if (String(base64).startsWith('data:')) return base64;
  return `data:${mimeType || 'image/png'};base64,${base64}`;
}

function buildStats(item) {
  return STAT_DEFINITIONS.reduce((stats, [key, label]) => {
    const value = toNumber(item[key]);
    if (value !== null && Math.abs(value) > 0.0001) {
      stats.push({ key, label, value });
    }
    return stats;
  }, []);
}

export function normalizeItemSettings(data) {
  const itemsNode = data?.items || data?.ItemSettings?.items || data;
  const basePath = data?.items || data?.ItemSettings?.items ? 'ItemSettings/items' : 'Items';
  if (!isPlainObject(itemsNode)) return [];

  return Object.entries(itemsNode)
    .map(([firebaseKey, item]) => {
      const source = isPlainObject(item) ? item : { value: item };
      return {
        id: firebaseKey,
        writePath: `${basePath}/${firebaseKey}`,
        firebaseKey,
        itemId: source.itemId || firebaseKey,
        itemName: source.itemName || source.name || firebaseKey.replace(/_/g, ' '),
        description: stripEffectText(source.description),
        itemType: source.itemType,
        typeLabel: formatEnum(source.itemType, ITEM_TYPE_LABELS) || 'Unknown',
        rarity: source.rarity,
        rarityLabel: formatEnum(source.rarity, RARITY_LABELS) || 'Common',
        imageUrl: dataUriFromBase64(source.imageBase64, source.imageMimeType) ||
          source.imageUrl ||
          source.image ||
          null,
        imageAssetPath: source.imageAssetPath || '',
        itemUsePrefabPath: source.itemUsePrefabPath || '',
        pickupPrefabPath: source.pickupPrefabPath || '',
        storeItems: Array.isArray(source.storeItems) ? source.storeItems : [],
        maxStack: source.maxStack,
        craftable: Boolean(source.craftable),
        tradeable: Boolean(source.tradeable),
        tradeLocked: Boolean(source.tradeLocked),
        stats: buildStats(source),
        raw: source,
      };
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export function normalizeCraftingSettings(data) {
  const recipesNode = data?.recipes || data?.CraftingSettings?.recipes || data;
  const basePath = 'CraftingSettings/recipes';
  if (!isPlainObject(recipesNode)) return [];

  return Object.entries(recipesNode)
    .map(([firebaseKey, recipe]) => {
      const source = isPlainObject(recipe) ? recipe : { value: recipe };
      return {
        id: firebaseKey,
        writePath: `${basePath}/${firebaseKey}`,
        recipeId: source.recipeId || firebaseKey,
        displayName: source.displayName || source.output?.itemName || firebaseKey.replace(/_/g, ' '),
        description: stripEffectText(source.description),
        enabled: source.enabled !== false,
        requiredLevel: source.requiredLevel ?? 0,
        moneyCost: source.moneyCost ?? 0,
        ingredients: Array.isArray(source.ingredients) ? source.ingredients : [],
        output: source.output || null,
        raw: source,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
