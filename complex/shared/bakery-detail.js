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
      const c = new THREE.Color('#e1b477').convertSRGBToLinear().lerp(new THREE.Color('#ad6a2e').convertSRGBToLinear(),Math.max(0,Math.min(1,(y+.2)/1.2)));
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
        add(scores,x,s.y+b*.58,z,a,b,c,ry);
      }
    }
    function batch(geo,mat,list){const m=new THREE.InstancedMesh(geo,mat,list.length),o=new THREE.Object3D();list.forEach((v,i)=>{o.position.set(v.x,v.y,v.z);o.scale.set(v.sx,v.sy,v.sz);o.rotation.set(0,v.ry,v.rz);o.updateMatrix();m.setMatrixAt(i,o.matrix);if(v.tint)m.setColorAt(i,new THREE.Color(v.tint).convertSRGBToLinear().lerp(new THREE.Color(1,1,1),.55));});m.instanceMatrix.needsUpdate=true;scene.add(m);return m;}
    // Scoring curves follow the ellipsoid instead of hovering as straight strokes.
    const scoreParts=[];
    for(const z of [-.43,0,.43]){
      const points=[];
      for(let i=0;i<=12;i++){const x=-.65+i/12*1.3,zz=z+x*.12;points.push(new THREE.Vector3(x,Math.sqrt(Math.max(0,1-x*x-zz*zz))+.008,zz));}
      const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.018,4,false);scoreParts.push(g.toNonIndexed());g.dispose();
    }
    const scoring=new THREE.BufferGeometry();
    for(const key of ['position','normal','uv']){
      const size=scoreParts[0].attributes[key].itemSize,data=new Float32Array(scoreParts.reduce((n,g)=>n+g.attributes[key].array.length,0));let offset=0;
      for(const g of scoreParts){data.set(g.attributes[key].array,offset);offset+=g.attributes[key].array.length;}
      scoring.setAttribute(key,new THREE.BufferAttribute(data,size));
    }
    scoreParts.forEach(g=>g.dispose());
    if(body.length){batch(geometry,crust,body);batch(scoring,cut,scores);}
    return {version:'bakery-detail-20261115',products:products.length,loaves:body.length,addedDrawCalls:body.length?2:0,addedTriangles:body.length*geometry.index.count/3+scores.length*scoring.attributes.position.count/3};
  }
  window.BakeryDetail={eligible,build};
})();
