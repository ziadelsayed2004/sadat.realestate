import type { ProviderApplicationData, ProviderDocumentCategory } from '@sadat-real-estate/contracts';

/**
 * Keep the client-side gate aligned with the requirement snapshot returned by
 * the API. Optional documents can be uploaded, but they must never make an
 * otherwise complete application look incomplete.
 */
export function missingRequiredDocumentCategories(
  application: Pick<ProviderApplicationData, 'requirementsSnapshot' | 'missingDocuments'>
): ProviderDocumentCategory[] {
  const requirements = application.requirementsSnapshot?.requirements;

  // Without a snapshot we cannot safely decide which categories are optional.
  // The documents screen already fails closed in that case, while the review
  // screen should retain the API's missing-document signal.
  if (requirements === undefined) return [...application.missingDocuments];

  const requiredCategories = new Set(
    requirements
      .filter(requirement => requirement.applies && requirement.classification !== 'optional')
      .map(requirement => requirement.key)
  );

  return application.missingDocuments.filter(category => requiredCategories.has(category));
}
