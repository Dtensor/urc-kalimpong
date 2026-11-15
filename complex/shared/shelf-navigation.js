/* Shared comfortable shelf arrivals. No catalogue or product rendering changes. */
(() => {
 'use strict';
 const FOV=70, MIN_DISTANCE=2.8;
 function corners(THREE,t){
  const out=[],ux=-t.nz,uz=t.nx;
  for(const u of [-t.width/2,t.width/2])for(const y of [t.bottom||0,t.top])for(const depth of [0,t.depth||0])out.push(new THREE.Vector3(t.x+ux*u-t.nx*depth,y,t.z+uz*u-t.nz*depth));
  return out;
 }
 function fit(THREE,t,{aspect,eye=1.6,free}){
  const points=corners(THREE,t),cy=((t.bottom||0)+t.top)/2,ux=-t.nz,uz=t.nx;
  const portrait=aspect<.85,topLimit=portrait?.48:.75,bottomLimit=.78;
  const half=Math.tan(FOV*Math.PI/360),desired=Math.max(MIN_DISTANCE,t.width/(2*half*Math.max(.3,aspect)*.78),(t.top-(t.bottom||0))/(2*half*.76));
  const camera=new THREE.PerspectiveCamera(FOV,aspect,.05,120);camera.rotation.order='YXZ';
  let best=null;
  const distances=[];for(let d=Math.min(6,desired);d<=6.001;d+=.15)distances.push(d);for(let d=Math.min(6,desired)-.1;d>=2.099;d-=.1)distances.push(d);
  for(const d of distances)for(const offset of [0,.3,-.3,.6,-.6,.9,-.9,1.2,-1.2]){
   const x=t.x+t.nx*d+ux*offset,z=t.z+t.nz*d+uz*offset;if(!free(x,z))continue;
   let clear=true;for(let k=1;k<d;k+=.2)if(!free(t.x+t.nx*k+ux*offset,t.z+t.nz*k+uz*offset)){clear=false;break;}if(!clear)continue;
   const dx=t.x-x,dz=t.z-z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(cy+(portrait?half*Math.hypot(dx,dz)*.14:0)-eye,Math.hypot(dx,dz));
   camera.position.set(x,eye,z);camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();
   let maxX=0,maxY=0,minY=Infinity,upperY=-Infinity;for(const point of points){const p=point.clone().project(camera);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));minY=Math.min(minY,p.y);upperY=Math.max(upperY,p.y);}
   const score=Math.max(maxX/.86,upperY/topLimit,-minY/bottomLimit),v={x,z,yaw,pitch,fov:FOV,distance:Math.hypot(dx,dz),setback:d,target:t,maxX,maxY,minY,upperY,fits:score<=1};
   if(v.fits&&v.distance>=MIN_DISTANCE-.001)return v;
   if(!best||score<best.score)best={...v,score};
  }
  if(!best)throw Error('No walkable shelf view: '+t.id);
  return best;
 }
 function create(THREE,scene,options){
  const cache=new Map();let selected=null,returnTo=null;
  const marker=new THREE.Mesh(new THREE.RingGeometry(.27,.36,40),new THREE.MeshBasicMaterial({color:options.color||'#27776d',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.visible=false;marker.userData.shelfStand=true;scene.add(marker);
  function view(target){const aspect=options.aspect(),key=target.id+'@'+aspect.toFixed(4);if(!cache.has(key))cache.set(key,fit(THREE,target,{aspect,eye:options.eye,free:options.free}));return cache.get(key);}
  function select(target,callback){selected=view(target);returnTo=callback;marker.position.set(selected.x,.035,selected.z);marker.visible=true;return selected;}
  function pick(ray){marker.updateMatrixWorld();return marker.visible&&ray.intersectObject(marker).length>0;}
  function activate(){if(returnTo)returnTo();}
  function nearFloor(x,z,targets){let best=null,dist=Infinity;for(const t of targets){const dx=x-t.x,dz=z-t.z,front=dx*t.nx+dz*t.nz,along=dx*(-t.nz)+dz*t.nx;if(front>=-(t.depth||0)-.15&&front<2.2&&Math.abs(along)<=t.width/2+.2){const d=Math.hypot(dx,dz);if(d<dist){dist=d;best=t;}}}return best;}
  return {view,select,pick,activate,nearFloor,marker,get selected(){return selected;},get cached(){return cache.size;}};
 }
 window.ShelfNavigation={fit,corners,create,FOV,MIN_DISTANCE,version:'shelf-navigation-20261115'};
})();
