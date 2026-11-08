// Dependency-free checks for pre-paint theme restoration and cross-tab updates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('app/tdl-appearance.js','utf8');
function boot(saved,blocked=false){
 const events={},root={dataset:{}},meta={};
 const context={document:{documentElement:root,querySelector:()=>meta,addEventListener:()=>{}},window:{addEventListener:(name,fn)=>events[name]=fn},localStorage:{getItem(){if(blocked)throw Error('Storage disabled');return saved;}}};
 vm.runInNewContext(source,context);
 return {root,meta,events};
}
for(const name of ['paper','graphite','forest','dusk']){
 const {root,meta}=boot(name);assert.equal(root.dataset.theme,name);assert.match(meta.content,/^#[a-f0-9]{6}$/);
}
for(const invalid of [null,'','invalid','<script>'])assert.equal(boot(invalid).root.dataset.theme,'paper');
assert.equal(boot(null,true).root.dataset.theme,'paper');
const tab=boot('paper');tab.events.storage({key:'tdl.appearance.v1',newValue:'dusk'});assert.equal(tab.root.dataset.theme,'dusk');
tab.events.storage({key:'tdl.tasks.v1',newValue:'graphite'});assert.equal(tab.root.dataset.theme,'dusk');
tab.events.storage({key:'tdl.appearance.v1',newValue:null});assert.equal(tab.root.dataset.theme,'paper');
const sw=fs.readFileSync('app/sw.js','utf8');
for(const file of ['tdl-appearance.js','tdl-appearance.css'])assert.ok(sw.includes('"./'+file+'"'));
console.log('PASS four palettes, invalid/blocked storage fallback, cross-tab updates, isolated preference key, and offline shell assets');
