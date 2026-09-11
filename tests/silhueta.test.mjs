import test from 'node:test'
import assert from 'node:assert/strict'
import {interiorMask} from '../.test-runtime/silhueta.mjs'
function ring(){const p=new Uint8ClampedArray(9*9*4);for(let y=2;y<=6;y++)for(let x=2;x<=6;x++)if(x===2||x===6||y===2||y===6){p[(y*9+x)*4]=240;p[(y*9+x)*4+3]=255}return p}
test('fills transparent body inside outline but not surrounding scenery',()=>{
 const p=ring(),m=interiorMask(p,9,9)
 assert.equal(m[(4*9+4)*4+3],255)
 assert.equal(m[(0*9+4)*4+3],0)
 assert.equal(m[(4*9+1)*4+3],0)
 assert.equal(p[(4*9+4)*4+3],0,'original art is not modified')
})
test('open spaces connected to the outside remain transparent',()=>{
 const p=ring();p[(2*9+4)*4+3]=0
 const m=interiorMask(p,9,9);assert.equal(m[(4*9+4)*4+3],0)
})
test('disconnected feet keep the gap between them clear',()=>{
 const p=new Uint8ClampedArray(15*10*4)
 for(const origin of [2,9])for(let y=2;y<=7;y++)for(let x=origin;x<=origin+3;x++)if(x===origin||x===origin+3||y===2||y===7)p[(y*15+x)*4+3]=255
 const m=interiorMask(p,15,10)
 assert.equal(m[(4*15+3)*4+3],255);assert.equal(m[(4*15+10)*4+3],255);assert.equal(m[(4*15+7)*4+3],0)
})
