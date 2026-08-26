import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const execution=path.join(pack,'03_execution');
const read=(name)=>JSON.parse(fs.readFileSync(path.join(execution,name),'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(execution,name),JSON.stringify(value,null,2)+'\n');
const catalog=read('TASK_CATALOG.json');
const target=catalog.find((entry)=>entry.id==='backend_141');
if(!target) throw new Error('backend_141 is missing');
const ordered=catalog.filter((entry)=>entry.id!=='backend_141');
const firstFrontend=ordered.findIndex((entry)=>entry.track==='frontend');
ordered.splice(firstFrontend,0,target);
ordered.forEach((entry,index)=>{entry.sequence=index+1;});
write('TASK_CATALOG.json',ordered);
const taskMap=read('ATOMIC_TASK_MAP.json');
const byId=new Map(taskMap.map((entry)=>[entry.taskId,entry]));
write('ATOMIC_TASK_MAP.json',ordered.map((entry)=>({...byId.get(entry.id),sequence:entry.sequence})));
for(const entry of ordered){
  const file=path.join(pack,entry.atomicTaskFile); const source=fs.readFileSync(file,'utf8');
  const updated=source.replace(/\| Sequence \| \d+ \/ \d+ \|/u,`| Sequence | ${entry.sequence} / ${ordered.length} |`);
  if(updated!==source) fs.writeFileSync(file,updated);
}
console.log(JSON.stringify({taskId:'backend_141',sequence:target.sequence,total:ordered.length},null,2));
