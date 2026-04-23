type Cartesian = {
  x: number;
  y: number;
};

export function distanceToSegment(p: Cartesian, a: Cartesian, b: Cartesian) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abLenSqr = abx * abx + aby * aby;

  if (abLenSqr === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  const proj = apx * abx + apy * aby;

  let u = proj / abLenSqr;
  u = Math.max(0, Math.min(1, u));

  const x = a.x + u * abx;
  const y = a.y + u * aby;

  return Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
}

let lastClosestIndex = -1;

export function dToLine(userPoint: Cartesian, route: Cartesian[]) {
  let start = 0;
  let end = route.length;
  let closestDistance = Infinity;
  let closestPointIndex = -1;

  if (lastClosestIndex !== -1) {
    start = Math.max(0, lastClosestIndex - 10);
    end = Math.min(route.length, lastClosestIndex + 10);
  }

  for (let i = start; i < end; i++) {
    const distanceToPoint = Math.sqrt(
      (userPoint.x - route[i].x) ** 2 + (userPoint.y - route[i].y) ** 2
    );

    if (distanceToPoint < closestDistance) {
      closestDistance = distanceToPoint;
      closestPointIndex = i;
    }
  }

  if (closestPointIndex === -1) {
    return Infinity;
  }

  lastClosestIndex = closestPointIndex;

  console.log("Closest point is: ", route[closestPointIndex]);

  if (closestPointIndex === 0) {
    return distanceToSegment(userPoint, route[0], route[1]);
  }

  if (closestPointIndex === route.length - 1) {
    return distanceToSegment(
      userPoint,
      route[route.length - 2],
      route[route.length - 1]
    );
  }

  const prevDistance = distanceToSegment(
    userPoint,
    route[closestPointIndex - 1],
    route[closestPointIndex]
  );

  const nextDistance = distanceToSegment(
    userPoint,
    route[closestPointIndex],
    route[closestPointIndex + 1]
  );

  return Math.min(prevDistance, nextDistance);
}