import * as T from 'three';

const point = node => node.getWorldPosition(new T.Vector3());
const rotation = node => node.getWorldQuaternion(new T.Quaternion());
const down = new T.Vector3(0, -1, 0);

// Measure the fitted hand in its bind pose so the two avatars can share a grip.
export function fitPalm(hand) {
 const socket = new T.Group();
 hand.add(socket);
 const joint = suffix => hand.getObjectByName(hand.name + suffix);
 const index = joint('Index1'), pinky = joint('Pinky1'), middle = joint('Middle1');
 const fingers = [];
 if (!index || !pinky || !middle) return {socket, fingers};
 const across = point(index).sub(point(pinky)).normalize();
 const forward = point(middle).sub(point(hand)).normalize();
 const normal = across.clone().cross(forward).normalize();
 if (normal.y > 0) normal.negate();
 const center = point(middle).lerp(point(pinky), .30).addScaledVector(normal, .014);
 socket.position.copy(hand.worldToLocal(center));
 // The shaft runs diagonally across the first finger pads.
 const axis = across.addScaledVector(forward, .23).normalize().applyQuaternion(rotation(hand).invert());
 for (const digit of ['Index','Middle','Ring','Pinky','Thumb']) {
  for (let n = 1; n <= 3; n++) {
   const bone = joint(digit+n), tip = bone?.children.find(child => child.isBone);
   if (!tip) continue;
   const direction = point(tip).sub(point(bone)).normalize();
   const bend = digit === 'Thumb' ? point(middle).sub(point(bone)).normalize().add(normal) : normal;
   const hinge = direction.cross(bend).normalize().applyQuaternion(rotation(bone).invert());
   const angle = (digit === 'Thumb' ? [.36,.50,.48] : [.94,1.35,.85])[n-1];
   const closed = bone.quaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(hinge, angle));
   fingers.push({bone, closed});
  }
 }
 return {socket, fingers, axis, arm:[hand.parent,hand.parent.parent]};
}

export function reachForClub(grip, target, weight) {
 if (!grip?.arm || weight <= 0) return;
 const goal = point(grip.socket).lerp(target, weight);
 // Rotate the elbow and shoulder toward the handhold, retaining the animated wrist.
 for (let pass = 0; pass < 12; pass++) for (const joint of grip.arm) {
  const pivot = point(joint);
  const current = point(grip.socket).sub(pivot).normalize();
  const wanted = goal.clone().sub(pivot).normalize();
  const delta = new T.Quaternion().setFromUnitVectors(current, wanted);
  joint.quaternion.copy(rotation(joint.parent).invert().multiply(delta).multiply(rotation(joint)));
 }
}

export function carryClub(actor, progress, upright) {
 const {club, palm} = actor;
 if (!palm?.axis) return;
 const q = new T.Quaternion().setFromUnitVectors(down, palm.axis);
 club.quaternion.copy(upright).slerp(q, progress);
 actor.clubHead.quaternion.identity();
 actor.fitShaft();
 // Start just below the head, then feed the shaft through the palm to the rubber grip.
 const along = actor.shaftAxis.clone().applyQuaternion(club.quaternion);
 club.position.copy(along).multiplyScalar(-club.scale.y * T.MathUtils.lerp(.92, .09, progress));
}
