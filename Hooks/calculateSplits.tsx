import { haversine } from './haversine';

type TrackedPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
};

type Split = {
  splitNumber: number;
  distanceKm: number;
  durationMs: number;
  elevationGainM: number;
  elevationLossM: number;
  netElevationChangeM: number;
  elevationAtSplitM: number;
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

  let currentSplitGain = 0;
  let currentSplitLoss = 0;
  let currentSplitStartAltitude = points[0].altitude ?? 0;

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

    const prevAlt = prev.altitude ?? 0;
    const currAlt = curr.altitude ?? 0;

    const segmentStartDistance = totalDistance;
    const segmentEndDistance = totalDistance + segmentDistance;

    let workingSegmentStartDistance = segmentStartDistance;
    let workingPrevTime = prev.timestamp;
    let workingPrevAlt = prevAlt;

    while (segmentEndDistance >= nextSplitTarget) {
      const distanceNeeded = nextSplitTarget - workingSegmentStartDistance;
      const fractionOfSegment = distanceNeeded / (segmentEndDistance - workingSegmentStartDistance);

      const interpolatedTimestamp =
        workingPrevTime +
        fractionOfSegment * (curr.timestamp - workingPrevTime);

      const interpolatedAltitude =
        workingPrevAlt +
        fractionOfSegment * (currAlt - workingPrevAlt);

      const altitudeDiff = interpolatedAltitude - workingPrevAlt;

      if (altitudeDiff > 0) {
        currentSplitGain += altitudeDiff;
      } else if (altitudeDiff < 0) {
        currentSplitLoss += Math.abs(altitudeDiff);
      }

      const durationMs = interpolatedTimestamp - splitStartTime;

      splits.push({
        splitNumber,
        distanceKm: 1,
        durationMs,
        elevationGainM: currentSplitGain,
        elevationLossM: currentSplitLoss,
        netElevationChangeM: interpolatedAltitude - currentSplitStartAltitude,
        elevationAtSplitM: interpolatedAltitude,
      });

      splitNumber++;
      splitStartTime = interpolatedTimestamp;
      lastSplitDistance = nextSplitTarget;
      nextSplitTarget++;

      currentSplitGain = 0;
      currentSplitLoss = 0;
      currentSplitStartAltitude = interpolatedAltitude;

      workingSegmentStartDistance = lastSplitDistance;
      workingPrevTime = interpolatedTimestamp;
      workingPrevAlt = interpolatedAltitude;
    }

    const remainingAltitudeDiff = currAlt - workingPrevAlt;

    if (remainingAltitudeDiff > 0) {
      currentSplitGain += remainingAltitudeDiff;
    } else if (remainingAltitudeDiff < 0) {
      currentSplitLoss += Math.abs(remainingAltitudeDiff);
    }

    totalDistance = segmentEndDistance;
  }

  const remainingDistance = totalDistance - lastSplitDistance;

  if (remainingDistance > 0) {
    const lastPoint = points[points.length - 1];
    const lastAltitude = lastPoint.altitude ?? 0;
    const durationMs = lastPoint.timestamp - splitStartTime;

    splits.push({
      splitNumber,
      distanceKm: remainingDistance,
      durationMs,
      elevationGainM: currentSplitGain,
      elevationLossM: currentSplitLoss,
      netElevationChangeM: lastAltitude - currentSplitStartAltitude,
      elevationAtSplitM: lastAltitude,
    });
  }

  console.log("Splits:", splits);
  return splits;
}

export function calculateElevation(points: TrackedPoint[]) {
  let gain = 0;
  let loss = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].altitude ?? 0;
    const curr = points[i].altitude ?? 0;

    const diff = curr - prev;

    if (diff > 0) {
      gain += diff;
    } else if (diff < 0) {
      loss += Math.abs(diff);
    }
  }

  return {
    gain,
    loss,
    net: gain - loss,
  };
}