/* Original procedural bread studies. Illustrations remain in the menu; never replace supplied photos. */
(() => {
  'use strict';
  const eligible = it => !it.photo && (it.look.kind === 'baguette' || (it.look.kind === 'loaf' && !/tea cake/i.test(it.name)));
  function build(THREE, scene, slots) {
    const body = [], scores = [];
    const geometry = new THREE.SphereGeometry(1, 24, 12);
    const colors = [], p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // A paler lower crust and softly toasted crown, with deterministic tiny variation.
      const y = p.getY(i), grain = Math.sin(p.getX(i)*43 + p.getZ(i)*29)*.025;
      const c = new THREE.Color(y > .35 ? '#c28445' : '#edc185').convertSRGBToLinear();
      c.multiplyScalar(1 + grain); colors.push(c.r,c.g,c.b);
      p.setY(i, Math.max(-.58,y));
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const crust = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,envMapIntensity:.22});
    const cut = new THREE.MeshStandardMaterial({color:new THREE.Color('#f2d5a0').convertSRGBToLinear(),roughness:1,envMapIntensity:.12});
    const add=(list,x,y,z,sx,sy,sz,ry=0,rz=0)=>list.push({x,y,z,sx,sy,sz,ry,rz});
    const products=slots.filter(s=>eligible(s.it));
    for(const s of products){
      const baguette=s.it.look.kind==='baguette',boule=/boule|sourdough/i.test(s.it.name);
      const ry=Math.atan2(s.nx,s.nz), r=new THREE.Vector3(s.nz,0,-s.nx);
      const a=baguette?.09:boule?.21:.16,b=baguette?.065:.14,c=baguette?.34:boule?.21:.25;
      for(let copy=0;copy<2;copy++){
        const offset=(copy-.5)*Math.min(s.span*.38,.31), x=s.x+r.x*offset,z=s.z+r.z*offset;
        add(body,x,s.y+b*.58,z,a,b,c,ry);
        body[body.length-1].tint=s.it.look.tint;
        for(let k=0;k<(baguette?5:3);k++){
          const along=(k-((baguette?5:3)-1)/2)*(baguette?.105:.12);
          // Thin pale scoring follows the rounded crown, never a floating card.
          const yy=s.y+b*.58+b*Math.sqrt(Math.max(0,1-(along/c)**2))*.985;
          add(scores,x+Math.sin(ry)*along,yy,z+Math.cos(ry)*along,a*.72,.006,.011,ry+.25);
        }
      }
    }
    function batch(geo,mat,list){const m=new THREE.InstancedMesh(geo,mat,list.length),o=new THREE.Object3D();list.forEach((v,i)=>{o.position.set(v.x,v.y,v.z);o.scale.set(v.sx,v.sy,v.sz);o.rotation.set(0,v.ry,v.rz);o.updateMatrix();m.setMatrixAt(i,o.matrix);if(v.tint)m.setColorAt(i,new THREE.Color(v.tint).convertSRGBToLinear().lerp(new THREE.Color(1,1,1),.55));});m.instanceMatrix.needsUpdate=true;scene.add(m);return m;}
    if(body.length){batch(geometry,crust,body);batch(new THREE.SphereGeometry(1,10,6),cut,scores);}
    return {version:'bakery-detail-20261115',products:products.length,loaves:body.length,addedDrawCalls:body.length?2:0,addedTriangles:body.length*geometry.index.count/3+scores.length*100};
  }
  window.BakeryDetail={eligible,build};
})();
