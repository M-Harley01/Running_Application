type LatLng = { latitude: number; longitude: number}

export async function apiCall(a : LatLng, b: LatLng) {

  const url =
    `https://router.project-osrm.org/route/v1/walking/` +
    `${a.longitude},${a.latitude};${b.longitude},${b.latitude}` +
    `?overview=simplified&geometries=geojson`;

  const res = await fetch(url);

  const data = await res.json();

  // OSRM geojson coordinates are [lon, lat]
  const coords = data.routes[0].geometry.coordinates as [number, number][];

  console.log("Fetched coords:", coords);
  return coords;
}