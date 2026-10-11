import { Types, type Connection } from 'mongoose';

export function featuredHomepagePlacementFields(updatedBy: Types.ObjectId, updatedAt: Date, active = true) {
  return { surface: 'homepage', label: { ar: 'كارت الرئيسية المميز', en: 'Featured homepage card' }, width: 1200, height: 800, active, sortOrder: 1, allowedLocales: ['ar', 'en'], targetUrlRequired: true, version: 0, updatedBy, updatedAt };
}

// Older installations already have the hero placement but predate featured cards.
// Inherit their setup authority and activation; never overwrite an existing choice.
export async function initializeFeaturedHomepagePlacement(connection: Connection, now = new Date()): Promise<void> {
  const placements = connection.collection('ad_placements');
  const hero = await placements.findOne({ key: 'homepage.hero', surface: 'homepage' }, { projection: { active: 1, updatedBy: 1 } });
  if (!hero || !(hero.updatedBy instanceof Types.ObjectId)) return;
  await placements.updateOne({ key: 'homepage.featured' }, {
    $setOnInsert: featuredHomepagePlacementFields(hero.updatedBy, now, hero.active === true)
  }, { upsert: true });
}
