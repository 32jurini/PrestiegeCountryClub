// Each row sets par, tee-to-green length, two landing centers, pin offset,
// mid-hole rise and green elevation relative to the tee (in course units).
const layouts = {
 royal: [
  ['Elm Avenue',4,204,-12,-24,-10,1,2], ['Mill Pond',3,96,4,6,11,0,-1],
  ['Fox Run',5,278,29,47,5,3,1], ['Old Quarry',4,195,-20,-42,-36,-1,2],
  ['Beech Hollow',4,220,18,35,14,-2,1], ['West Terrace',4,184,-6,17,28,2,4],
  ['The Ha-ha',4,214,24,7,-19,1,-1], ['Clocktower',3,105,-1,-6,-12,0,2],
  ['Long Meadow',5,296,-30,-49,-18,2,1], ['Copper Oak',4,197,13,37,42,0,3],
  ['Garden Wall',4,203,-16,-32,-4,1,0], ['The Bell',3,85,2,7,9,1,2],
  ['Deer Park',5,282,18,-12,-38,-1,2], ['Lime Walk',4,225,-8,15,35,1,3],
  ['Clubhouse Turn',4,217,26,41,6,2,0]
 ],
 ocean: [
  ['Kelp Beds',4,201,-23,-29,-12,0,1], ['Gull Rock',3,94,-4,-8,-17,0,0],
  ['Longshore',5,284,-31,-52,-24,1,0], ['Smugglers Cove',4,196,-8,9,16,-1,1],
  ['Beacon Point',4,212,-15,-41,-34,1,2], ['Harbour Mouth',4,184,8,-6,-13,1,0],
  ['Low Tide',4,224,-20,-39,2,-1,0], ['Saltmarsh',3,103,-7,-14,-20,0,-1],
  ['The Narrows',5,291,-25,-55,-10,2,1], ['Breakwater',4,206,3,14,-8,0,2],
  ['Sea Glass',4,189,-20,-37,-43,1,0], ['Tern Bank',3,82,4,7,12,0,1],
  ['The Estuary',5,274,-15,-47,-19,1,0], ['Lantern Bay',4,219,-23,-32,3,2,1],
  ['Homeward Sound',4,216,6,-19,-32,1,2]
 ],
 summit: [
  ['Timberline',5,278,29,54,27,7,11], ['Needle Gap',3,97,-6,-12,-16,-3,-7],
  ['High Bench',4,204,-13,-41,-28,5,8], ['Spruce Basin',4,211,28,42,7,-4,-2],
  ['Lookout Spur',5,294,-25,-52,-12,9,5], ['North Bowl',4,185,12,-6,-21,-5,-8],
  ['Cedar Shelf',4,213,-18,-36,-45,4,7], ['Eagle Roost',3,103,4,10,14,2,5],
  ['Avalanche Run',5,285,18,43,12,-6,-10], ['Old Fire Road',4,199,-23,-38,-9,4,2],
  ['Needle Creek',4,223,13,-5,-28,-3,2], ['The Overlook',3,90,-3,-10,-16,-4,-9],
  ['Juniper Pass',5,287,22,57,20,7,4], ['The Chute',4,188,-14,-35,-40,-4,-6],
  ['Lodge Approach',4,216,19,32,4,5,1]
 ],
 misty: [
  ['Cloudbreak',5,281,-26,-48,-19,6,2], ['Raven Shelf',3,89,4,9,13,-3,-8],
  ['Cirque Traverse',4,202,18,39,31,6,3], ['Blue Tarn',4,215,-17,-39,-8,-3,-1],
  ['The Headwall',5,289,21,46,17,10,13], ['Glacier Window',4,194,-16,-23,-36,-4,-9],
  ['Knife Edge',4,208,12,35,11,5,7], ['The High Col',3,99,-3,-9,-15,2,4],
  ['Stone Steps',5,274,-19,-44,-13,8,12], ['Cloud Forest',4,198,23,38,7,-4,-2],
  ['Moraine Bend',4,218,-24,-36,-41,3,5], ['Echo Ledge',3,87,3,9,15,-4,-8],
  ['The Long Ascent',5,298,24,49,16,9,14], ['West Arete',4,191,-9,17,30,4,1],
  ['Pinnacle Descent',4,227,-25,-39,-5,-7,-13]
 ]
};

export function extendCourses(courses) {
 for (const [course, rows] of Object.entries(layouts)) {
  rows.forEach(([name,par,length,first,bend,pin,rise,finish], i) => {
   const tee = course==='misty'?24:course==='summit'?12:2;
   const side = i%2===0?1:-1;
   const landing = Math.round(length*(par===5?.42:.34));
   const corner = Math.round(length*(par===3?.63:.72));
   const green = [8+i%5,8+(i*3)%5];
   const route = [[0,0,10,tee],[landing,first,15+i%6,tee+rise],
    [corner,bend,12+(i*3)%7,tee+rise*.6],[length-10,pin,10,tee+finish],[length,pin,9,tee+finish]];
   const sand = [[pin+side*(green[0]+4),length-5,4,6+i%3]];
   if(par>3)sand.push([first-side*(12+i%4),landing,5+i%3,8+i%5]);
   const water = [];
   if(course==='ocean')water.push([bend+side*19,corner,11+i%4,13+i%7]);
   if(course==='royal'&&(i===1||i===7))water.push([first-14,landing+4,7,9]);
   const hint = par===3?'Aim for the center of the green. The bunker guards the '+(side>0?'right':'left')+' side.':
    'Play toward the '+(first>0?'right':'left')+' landing area, then '+(finish>rise?'club up to the raised green.':'follow the turn toward the pin.');
   courses[course].holes.push({name,par,hint,route,green,sand,water});
  });
 }
}
