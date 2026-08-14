import{cmsSettingCreateSchema,cmsSettingPatchSchema,type CmsSettingCreate,type CmsSettingPatch,type CmsSettingValue}from'@sadat-real-estate/contracts';
const forbidden=/password|secret|token|credential|privatekey|api[_-]?key/i;
export function validateCmsSettingInput(input:CmsSettingCreate|CmsSettingPatch){const parsed='namespace'in input?cmsSettingCreateSchema.parse(input):cmsSettingPatchSchema.parse(input);if(forbidden.test(JSON.stringify(parsed)))throw new Error('CMS_SECRET_FIELD_FORBIDDEN');return parsed;}
export function mergeCmsSettingValue(current:CmsSettingValue,patch:CmsSettingPatch):CmsSettingValue{if(!patch.value)return current;if(patch.value.kind!==current.kind)throw new Error('CMS_SETTING_KIND_IMMUTABLE');return patch.value;}
export function publicCmsSetting(value:CmsSettingValue,status:'draft'|'published'|'inactive'){return status==='published'?value:null;}
