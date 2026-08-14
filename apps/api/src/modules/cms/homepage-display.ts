import{displaySettingCreateSchema,displaySettingPatchSchema,displaySettingPublicSchema,homepageSectionCreateSchema,homepageSectionPatchSchema,homepageSectionPublicSchema,type DisplaySettingCreate,type DisplaySettingPatch,type HomepageSectionCreate,type HomepageSectionPatch}from'@sadat-real-estate/contracts';
type SectionState=HomepageSectionCreate&{status:'draft'|'published'|'inactive';visible:boolean};
type SettingState=DisplaySettingCreate&{status:'draft'|'published'|'inactive'};
export function parseHomepageSection(input:HomepageSectionCreate|HomepageSectionPatch){return'version'in input?homepageSectionPatchSchema.parse(input):homepageSectionCreateSchema.parse(input)}
export function parseDisplaySetting(input:DisplaySettingCreate|DisplaySettingPatch){return'version'in input?displaySettingPatchSchema.parse(input):displaySettingCreateSchema.parse(input)}
export function sortHomepageSections<T extends{order:number;key:string}>(items:T[]){return[...items].sort((a,b)=>a.order-b.order||a.key.localeCompare(b.key))}
export function publicHomepageSections(items:SectionState[]){return sortHomepageSections(items.filter(item=>item.status==='published'&&item.visible).map(item=>homepageSectionPublicSchema.parse({key:item.key,title:item.title,body:item.body,order:item.order})))}
export function previewHomepageSections(items:SectionState[]){return sortHomepageSections(items.filter(item=>item.status!=='inactive').map(item=>({key:item.key,title:item.title,body:item.body,order:item.order,status:item.status,visible:item.visible})))}
export function publicDisplaySetting(value:SettingState){return value.status==='published'?displaySettingPublicSchema.parse({key:value.key,value:value.value}):null}
