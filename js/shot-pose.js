// Contact frames in the original FBX takes, sampled at 30 frames per second.
export const contactTime = {drive: 35/30, chip: 28/30, putt: 30/30, tee: 80/30};

export function measureShot(actor, name, THREE) {
  const action = actor.actions.get(name);
  if (!action) return null;
  const root = actor.root;
  const head = actor.clubHead;
  const hand = actor.club.parent;
  const finger = [...actor.basePose.keys()].find(b => /RightHandIndex3$/.test(b.name)) || hand;
  function sample(time, part) {
    action.time = time;
    actor.mixer.update(0);
    return root.worldToLocal(part.getWorldPosition(new THREE.Vector3()));
  }
  actor.mixer.stopAllAction();
  action.reset().play();
  const t = contactTime[name];
  let point, travel;
  if (name === 'tee') {
    point = sample(t, finger);
    travel = point.clone().setY(0);
  } else {
    const grip = sample(t, hand);
    // The grip points away from the player's chest and down to ball height.
    const contact = grip.clone().add(new THREE.Vector3(-.54, .029-grip.y, 0));
    const target = hand.worldToLocal(root.localToWorld(contact.clone()));
    actor.club.rotation.set(0,0,0);
    actor.club.scale.setScalar(target.length());
    actor.club.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),target.normalize());
    const before = sample(t-1/60, head);
    travel = sample(t+1/60, head).sub(before);
    point = sample(t, head);
  }
  const pose = {point, yaw: Math.atan2(travel.x,travel.z), grip: actor.club.quaternion.clone(), scale: actor.club.scale.x};
  action.stop();
  return pose;
}
