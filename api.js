let coords =  " ";

fetch("https://router.project-osrm.org/route/v1/walking/-2.830603,56.477703;-2.818134,56.481705?overview=simplified&geometries=geojson")
  .then(res => res.json())
  .then(data => {
    //console.dir(data.routes[0].geometry.coordinates, { maxArrayLength: null });
    coords = data.routes[0].geometry.coordinates
    console.dir(coords);
  })
  .catch(console.error);
