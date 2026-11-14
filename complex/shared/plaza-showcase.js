/* Original geometry and foliage; CC0 material sources in materials/scanned/provenance.json. */
(() => {
  'use strict';
  function create(THREE, scene, renderer, root) {
    const color = value => new THREE.Color(value).convertSRGBToLinear();
    const group = new THREE.Group(); group.name = 'Plaza architectural detail'; scene.add(group);
    const batches = new Map(), trees = [], shadows = [], loads = [];
    const statistics = { version: 'plaza-showcase-20261114', mapsLoaded: 0, mapErrors: [], openings: 0, trees: 0, addedTriangles: 0 };
    function texture(name, colour = false) {
      const t = new THREE.TextureLoader().load(root + 'materials/scanned/' + name + '.jpg',
        () => { statistics.mapsLoaded++; renderer.shadowMap.needsUpdate = true; }, undefined,
        () => statistics.mapErrors.push(name));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.encoding = colour ? THREE.sRGBEncoding : THREE.LinearEncoding;
      t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); loads.push(t); return t;
    }
    const stone = new THREE.MeshStandardMaterial({map:texture('stone-diff',true),normalMap:texture('stone-nor_gl'),roughnessMap:texture('stone-rough'),roughness:.94,normalScale:new THREE.Vector2(.4,.4),envMapIntensity:.16});
    const plaster = new THREE.MeshStandardMaterial({map:texture('plaster-diff',true),normalMap:texture('plaster-nor_gl'),roughnessMap:texture('plaster-rough'),roughness:1,normalScale:new THREE.Vector2(.22,.22),vertexColors:true,envMapIntensity:.16});
    const paint = new THREE.MeshStandardMaterial({roughness:.78,vertexColors:true,envMapIntensity:.2});
    const brass = new THREE.MeshStandardMaterial({color:color('#bd9653'),metalness:.55,roughness:.48,envMapIntensity:.45});
    const glass = new THREE.MeshStandardMaterial({color:color('#b8d5da'),metalness:.08,roughness:.2,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.8});
    function batch(geometry, material, matrix, tint = '#ffffff') {
      const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
      if(matrix)g.applyMatrix4(matrix);
      if(material.vertexColors){const c=color(tint), n=g.attributes.position.count, data=new Float32Array(n*3);for(let i=0;i<n;i++)data.set([c.r,c.g,c.b],i*3);g.setAttribute('color',new THREE.BufferAttribute(data,3));}
      if(!batches.has(material))batches.set(material,[]);batches.get(material).push(g);geometry.dispose();
    }
    function matrix(parent, x,y,z,rx=0,ry=0,rz=0) {
      const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.updateMatrix();
      return parent ? new THREE.Matrix4().multiplyMatrices(parent.matrixWorld,o.matrix) : o.matrix;
    }
    function box(parent,w,h,d,x,y,z,material,tint) {batch(new THREE.BoxGeometry(w,h,d),material,matrix(parent,x,y,z),tint);}
    function outline(path, x,w,y,h,rise, expansion=0) {
      const l=x-w/2-expansion,r=x+w/2+expansion,b=y,top=y+h+expansion,spring=y+h-rise;
      path.moveTo(l,b);path.lineTo(l,spring);path.quadraticCurveTo(l,top-(top-spring)*.35,x,top);
      path.quadraticCurveTo(r,top-(top-spring)*.35,r,spring);path.lineTo(r,b);path.lineTo(l,b);return path;
    }
    function arch(parent,o,width,depth,z,material,tint) {
      const shape=outline(new THREE.Shape(),o.x,o.w,o.y,o.h,o.rise,width);
      shape.holes.push(outline(new THREE.Path(),o.x,o.w,o.y,o.h,o.rise,0));
      const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:12,steps:1});
      batch(geo,material,matrix(parent,0,0,z),tint);
    }
    function facade(parent,f,openings) {
      parent.updateMatrixWorld(true);
      for(const o of openings){
        arch(parent,o,.18,.33,-.3,plaster,f.plaster);
        arch(parent,{...o,w:o.w+.09,h:o.h+.045},.065,.065,.035,paint,f.trim);
        arch(parent,{...o,w:o.w+.025,h:o.h+.012},.025,.045,.055,brass);
        if(!o.door){
          const shape=outline(new THREE.Shape(),o.x,o.w,o.y,o.h,o.rise);
          batch(new THREE.ShapeGeometry(shape,16),glass,matrix(parent,0,0,-.22));
          box(parent,o.w+.4,.12,.55,o.x,o.y-.04,-.07,plaster,f.plaster);
          box(parent,.045,o.h-o.rise,.12,o.x,o.y+(o.h-o.rise)/2,-.12,paint,f.dado);
        }
        statistics.openings++;
      }
      // Projecting cornices and plinths give side views real depth without covering signs.
      box(parent,f.w+.12,.14,.34,0,f.band[0]-.08,.025,plaster,f.plaster);
      box(parent,f.w+.24,.12,.44,0,f.band[1]+.07,.02,plaster,f.plaster);
      box(parent,f.w+.18,.06,.4,0,f.band[1]+.16,.02,paint,f.trim);
      const side=(f.w-f.door.w)/2;
      for(const s of [-1,1])box(parent,side,.16,.34,s*(f.door.w/2+side/2),.08,.015,paint,f.dado);
    }
    function paving(facades) {
      // Leave the authored medallion and all six coloured approach paths exposed.
      const lanes=facades.map(f=>({a:(f.phi+Math.PI*2)%(Math.PI*2),w:(f.door.w+.7)/2}));lanes.push({a:Math.PI,w:1.1});lanes.sort((a,b)=>a.a-b.a);
      const pos=[],uv=[];
      const point=(r,a)=>[Math.sin(a)*r,.009,Math.min(12.03,-Math.cos(a)*r)];
      function tri(a,b,c){for(const p of [a,b,c]){pos.push(...p);uv.push(p[0]/2,p[2]/2);}}
      for(let k=0;k<lanes.length;k++){
        const left=lanes[k],right=lanes[(k+1)%lanes.length],end=right.a+(k===lanes.length-1?Math.PI*2:0);
        for(let ring=0;ring<18;ring++){
          const r0=3.2+ring*(14.98-3.2)/18,r1=3.2+(ring+1)*(14.98-3.2)/18;
          const a0=left.a+Math.asin(Math.min(.95,(left.w+.035)/r0)),b0=end-Math.asin(Math.min(.95,(right.w+.035)/r0));
          const a1=left.a+Math.asin(Math.min(.95,(left.w+.035)/r1)),b1=end-Math.asin(Math.min(.95,(right.w+.035)/r1));
          if(b0<=a0||b1<=a1)continue;
          for(let j=0;j<12;j++){const p=point(r0,a0+(b0-a0)*j/12),q=point(r0,a0+(b0-a0)*(j+1)/12),r=point(r1,a1+(b1-a1)*j/12),s=point(r1,a1+(b1-a1)*(j+1)/12);tri(p,q,r);tri(q,s,r);}
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
      // x/z winding is corrected explicitly to keep normals facing the sky.
      const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);
      stone.side=THREE.DoubleSide;batch(g,stone);
    }
    function tree(x,y,z,h,random){trees.push({x,y,z,h,angle:random()*Math.PI*2,tint:.78+random()*.2});statistics.trees++;}
    function needleTexture(){
      const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');
      g.strokeStyle='#647457';g.lineWidth=2;g.beginPath();g.moveTo(8,64);g.lineTo(247,64);g.stroke();
      for(let i=0;i<62;i++){const x=12+i*3.7,len=10+24*Math.sin(i/62*Math.PI);for(const sign of [-1,1]){g.strokeStyle=i%3?'#46674a':'#7e9466';g.lineWidth=1.8;g.beginPath();g.moveTo(x,64);g.lineTo(x+len*.55,64+sign*len);g.stroke();}}
      const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
    }
    function foliage(){
      const parts=[];
      for(let tier=0;tier<13;tier++){
        const y=.2+tier*.057, radius=.24*Math.pow(1-y,.65), count=7;
        for(let b=0;b<count;b++)for(let cross=0;cross<2;cross++){
          const a=b/count*Math.PI*2+tier*2.399;const g=new THREE.PlaneGeometry(radius*1.65,.085*(1-y)+.022);
          g.rotateX(cross?1.25:.15);g.rotateZ(-.13);g.translate(radius*.62,y,0);g.rotateY(a);parts.push(g.toNonIndexed());g.dispose();
        }
      }
      const geometry=merge(parts), material=new THREE.MeshStandardMaterial({map:needleTexture(),alphaTest:.3,side:THREE.DoubleSide,roughness:.95,envMapIntensity:.12});
      const mesh=new THREE.InstancedMesh(geometry,material,trees.length),o=new THREE.Object3D();
      trees.forEach((t,i)=>{o.position.set(t.x,t.y,t.z);o.rotation.y=t.angle;o.scale.set(t.h,t.h,t.h);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color(t.tint,t.tint,t.tint));});
      mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;group.add(mesh);statistics.addedTriangles+=geometry.attributes.position.count/3*trees.length;
    }
    function contact(x,z,w,d,angle=0){shadows.push({x,z,w,d,angle});}
    function contactShadows(){
      const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),grad=g.createRadialGradient(64,64,8,64,64,62);grad.addColorStop(0,'rgba(25,24,21,.4)');grad.addColorStop(.4,'rgba(25,24,21,.2)');grad.addColorStop(1,'rgba(25,24,21,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);
      const m=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
      for(const s of shadows)batch(new THREE.PlaneGeometry(s.w,s.d),m,matrix(null,s.x,.018,s.z,-Math.PI/2,0,-s.angle));
    }
    function merge(parts){
      const g=new THREE.BufferGeometry();for(const key of ['position','normal','uv','color']){if(!parts[0].attributes[key])continue;const size=parts[0].attributes[key].itemSize,data=new Float32Array(parts.reduce((n,p)=>n+p.attributes[key].array.length,0));let at=0;for(const p of parts){data.set(p.attributes[key].array,at);at+=p.attributes[key].array.length;}g.setAttribute(key,new THREE.BufferAttribute(data,size));}parts.forEach(p=>p.dispose());g.computeBoundingSphere();return g;
    }
    function finish(){
      foliage();contactShadows();for(const [material,parts] of batches){const geometry=merge(parts),mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=!material.transparent;group.add(mesh);statistics.addedTriangles+=geometry.attributes.position.count/3;}
      statistics.addedDrawCalls=group.children.length;
      installPhoneCheck(renderer,statistics);
    }
    window.__plazaShowcase={statistics,group};
    return {facade,paving,tree,contact,finish};
  }
  function installPhoneCheck(renderer,statistics){
    const enabled=new URLSearchParams(location.search).has('devicecheck');let last=0,run=null,report=null;
    const frame=now=>{
      if(run){if(document.hidden||window.KalimpongExperience?.modalOpen)run.interrupted=true;else if(last&&now>last)run.frames.push(now-last);if(now-run.start>=20000)finish();}
      last=now;
    };
    function begin(){run={start:performance.now(),frames:[],interrupted:false};last=0;panel.querySelector('button').disabled=true;panel.querySelector('p').textContent='Walk and turn for 20 seconds. Keep this tab visible.';}
    function finish(){
      const samples=run.frames.slice(3).sort((a,b)=>a-b),seconds=(performance.now()-run.start)/1000;
      report={version:statistics.version,checkedAt:new Date().toISOString(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,pixelRatio:renderer.getPixelRatio(),samples:samples.length,seconds:Math.round(seconds*10)/10,medianFrameMs:Math.round((samples[Math.floor(samples.length*.5)]||0)*10)/10,p95FrameMs:Math.round((samples[Math.floor(samples.length*.95)]||0)*10)/10,averageFps:Math.round(samples.length/(samples.reduce((a,b)=>a+b,0)/1000||1)),over50ms:samples.filter(x=>x>50).length,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,interrupted:run.interrupted,mapsLoaded:statistics.mapsLoaded,mapErrors:statistics.mapErrors};run=null;
      panel.querySelector('button').disabled=false;panel.querySelector('button').textContent='Run again';panel.querySelector('p').textContent=report.interrupted?'Check interrupted—keep the scene visible and try again.':`${report.averageFps} fps average · ${report.p95FrameMs} ms slower frames. Copy the results back to the chat.`;
      const output=panel.querySelector('textarea');output.hidden=false;output.value=JSON.stringify(report,null,2);panel.querySelector('[data-copy]').hidden=false;
    }
    let panel;
    if(enabled){
      const style=document.createElement('style');style.textContent='#phone-check{position:fixed;z-index:30;left:12px;right:12px;bottom:calc(100px + env(safe-area-inset-bottom));max-width:370px;padding:12px;border:1px solid #d8d0bf;border-radius:14px;background:#fffaf0ee;color:#263d33;font:13px/1.4 system-ui;box-shadow:0 8px 30px #0002}#phone-check p{margin:0 0 8px}#phone-check button{min-height:44px;border:1px solid #60796b;border-radius:8px;background:#fff;padding:8px 12px;margin-right:6px}#phone-check textarea{box-sizing:border-box;width:100%;height:100px;font:11px monospace;margin-top:8px}';document.head.append(style);
      panel=document.createElement('section');panel.id='phone-check';panel.setAttribute('aria-label','Phone performance check');panel.innerHTML='<p role="status">On your iPhone: start, then walk and turn for 20 seconds. Results stay on this device.</p><button type="button">Start phone check</button><button type="button" data-copy hidden>Copy results</button><textarea aria-label="Phone check results" readonly hidden></textarea>';document.body.append(panel);panel.querySelector('button').onclick=begin;
      panel.querySelector('[data-copy]').onclick=async()=>{const text=panel.querySelector('textarea');try{await navigator.clipboard.writeText(text.value);panel.querySelector('p').textContent='Copied. Paste these results into the chat.';}catch(_){text.focus();text.select();panel.querySelector('p').textContent='Select and copy the results below.';}};
      document.addEventListener('visibilitychange',()=>{if(run)run.interrupted=true;});
    }
    window.__plazaDeviceCheck={frame,get report(){return report;},get active(){return !!run;}};
  }
  window.PlazaShowcase={create};
})();
