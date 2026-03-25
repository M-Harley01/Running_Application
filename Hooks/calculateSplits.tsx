import { haversine } from './haversine';

type TrackedPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type Split = {
  splitNumber: number;
  distanceKm: number;
  durationMs: number;
};

export function calculateSplits(points: TrackedPoint[]): Split[] {
  console.log("Youre in calculate splits!", points);

  if (points.length < 2) {
    return [];
  }

  const splits: Split[] = [];

  let totalDistance = 0;
  let splitStartTime = points[0].timestamp;
  let nextSplitTarget = 1;
  let splitNumber = 1;
  let lastSplitDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const segmentDistance = haversine(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );

    if (segmentDistance <= 0) {
      continue;
    }

    const segmentStartDistance = totalDistance;
    const segmentEndDistance = totalDistance + segmentDistance;

    while (segmentEndDistance >= nextSplitTarget) {
      const distanceNeeded = nextSplitTarget - segmentStartDistance;
      const fractionOfSegment = distanceNeeded / segmentDistance;

      const interpolatedTimestamp =
        prev.timestamp +
        fractionOfSegment * (curr.timestamp - prev.timestamp);

      const durationMs = interpolatedTimestamp - splitStartTime;

      splits.push({
        splitNumber,
        distanceKm: 1,
        durationMs,
      });

      splitNumber++;
      splitStartTime = interpolatedTimestamp;
      lastSplitDistance = nextSplitTarget;
      nextSplitTarget++;
    }

    totalDistance = segmentEndDistance;
  }

  const remainingDistance = totalDistance - lastSplitDistance;

  if (remainingDistance > 0) {
    const lastPoint = points[points.length - 1];
    const durationMs = lastPoint.timestamp - splitStartTime;

    splits.push({
      splitNumber,
      distanceKm: remainingDistance,
      durationMs,
    });
  }

  console.log("Splits:", splits);
  return splits;
}