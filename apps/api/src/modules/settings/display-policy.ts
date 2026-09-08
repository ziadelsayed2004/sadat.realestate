import type { Connection } from 'mongoose';

export interface DisplayRuntimeSettings {
  populationCount?: number;
  populationLabel?: { ar?: string; en?: string };
  showPopulationCounter?: boolean;
}

export interface DisplaySettingsReader {
  read(): Promise<DisplayRuntimeSettings>;
}

function localized(value: unknown): DisplayRuntimeSettings['populationLabel'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: NonNullable<DisplayRuntimeSettings['populationLabel']> = {};
  for (const locale of ['ar', 'en'] as const) {
    const text = source[locale];
    if (typeof text === 'string' && text.trim().length > 0 && text.trim().length <= 160) result[locale] = text.trim();
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function displayRuntimeSettings(values: Record<string, unknown> | undefined): DisplayRuntimeSettings {
  if (!values) return {};
  const populationCount = values.population_count;
  const populationLabel = localized(values.population_label);
  return {
    ...(typeof populationCount === 'number' && Number.isSafeInteger(populationCount) && populationCount >= 0 && populationCount <= 100_000_000 ? { populationCount } : {}),
    ...(populationLabel ? { populationLabel } : {}),
    ...(typeof values.show_population_counter === 'boolean' ? { showPopulationCounter: values.show_population_counter } : {})
  };
}

export function createMongooseDisplaySettingsReader(connection: Connection): DisplaySettingsReader {
  return {
    async read() {
      const record = await connection.collection('admin_settings').findOne(
        { namespace: 'display' },
        { projection: { values: 1 } }
      );
      return displayRuntimeSettings(record?.values && typeof record.values === 'object' && !Array.isArray(record.values) ? record.values as Record<string, unknown> : undefined);
    }
  };
}
