import assert from'node:assert/strict';import test from'node:test';import{aboutBlockCreateSchema,teamMemberCreateSchema}from'@sadat-real-estate/contracts';import{aboutBlockSchema,teamMemberSchema}from'../../src/modules/cms/about-team-models.js';import{parseAboutBlock,parseTeamMember,publicAboutBlock,publicTeamMember,sortPublished}from'../../src/modules/cms/about-team.js';
const text={ar:'عن المنصة',en:'About platform'};
test('validates editable About statistics and preserves publication safety', () => {
  const stat = { value: '2,500+', label: text, visible: false };
  const block = { key: 'about_intro', title: text, body: text, order: 0, reason: 'Update About statistics', stats: [stat] };
  assert.deepEqual(parseAboutBlock(block).stats, [stat]);
  assert.deepEqual(publicAboutBlock({ ...block, status: 'published', active: true })?.stats, [stat]);
  assert.equal(publicAboutBlock({ ...block, status: 'draft', active: true }), null);
  assert.equal(publicAboutBlock({ ...block, status: 'published', active: false }), null);
  for (const stats of [[{ ...stat, value: '' }], [{ ...stat, value: 'x'.repeat(25) }], [{ ...stat, label: { en: 'x'.repeat(81) } }], Array(5).fill(stat)]) {
    assert.equal(aboutBlockCreateSchema.safeParse({ ...block, stats }).success, false);
  }
  assert.deepEqual(parseAboutBlock({ ...block, stats: [] }).stats, []);
});
test('validates localized About blocks and team members with strict fields',()=>{assert.equal(aboutBlockCreateSchema.safeParse({key:'mission',title:text,body:text,order:1,reason:'Create About block',extra:true}).success,false);assert.equal(teamMemberCreateSchema.safeParse({key:'leader',name:text,title:text,order:1,reason:'Create team member'}).success,true);assert.equal(parseAboutBlock({key:'mission',title:text,body:text,order:1,reason:'Create About block'}).active,true);assert.equal(parseTeamMember({key:'leader',name:text,title:text,order:1,reason:'Create team member'}).status,'draft')});
test('keeps draft and inactive content out of public projections and sorts deterministically',()=>{const block={key:'mission',title:text,body:text,order:2,status:'published' as const,active:true};assert.deepEqual(publicAboutBlock(block)?.key,'mission');assert.equal(publicAboutBlock({...block,status:'draft'}),null);const member={key:'leader',name:text,title:text,order:1,status:'published' as const,active:true};assert.equal(publicTeamMember(member)?.role?.en,'About platform');assert.equal(publicTeamMember({...member,active:false}),null);assert.deepEqual(sortPublished([{key:'z',order:1},{key:'a',order:1},{key:'b',order:0}]).map(x=>x.key),['b','a','z'])});
test('registers versioned ordered indexes for About and team publication',()=>{assert.equal(aboutBlockSchema.path('updatedBy').options.required,true);assert.equal(teamMemberSchema.path('photoAssetId').options.ref,'Upload');assert.ok(aboutBlockSchema.indexes().some(([keys])=>'status'in keys&&'order'in keys));assert.ok(teamMemberSchema.indexes().some(([keys])=>'status'in keys&&'active'in keys));});
