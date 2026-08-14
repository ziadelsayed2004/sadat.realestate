# Localization contracts

The shared product locale contract contains exactly `ar`, `en`, and `zh-CN`. Arabic uses `rtl`; English and Simplified Chinese use `ltr`. `ar` is the default content fallback locale.

`LocalizedText` is a strict object keyed only by supported locale codes. A stored object contains at least one non-empty value, may omit translations that are not ready, rejects unknown locale keys and control characters, and never fabricates missing content. A draft field that has no content yet should be omitted by its owning aggregate instead of storing an empty `LocalizedText` object.

Runtime resolution tries the requested locale, an explicitly configured fallback when supplied, Arabic, and then the remaining supported locales in stable order. The result identifies the locale actually selected, its text direction, and whether fallback occurred. This allows callers to render truthful empty or unavailable states when the owning field itself is absent.

UI translation keys are validated as stable logical identifiers through `uiTranslationKeySchema`. They are not CMS content and must not be stored in or resolved as `LocalizedText` values. Likewise, localized CMS text must not be used as a database key, enum, permission, state, or translation-key identifier.

This primitive adds no HTTP route. OpenAPI, Postman, authentication, authorization, ownership, and publication behavior are therefore unchanged by this task.
