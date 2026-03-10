export function routeToCartesian(lat1: number, lon1: number, lat2: number, lon2: number){

    const radius = 6371;
    
    const lat1_rad = lat1 * (Math.PI/180);
    const lon1_rad = lon1 * (Math.PI/180);
    const lat2_rad = lat2 * (Math.PI/180);
    const lon2_rad = lon2 * (Math.PI/180);

    const x1 = radius * Math.cos(lat1_rad) * Math.cos(lon1_rad);
    const x2 = radius * Math.cos(lat2_rad) * Math.cos(lon2_rad);

    const y1 = radius * Math.cos(lat1_rad) * Math.sin(lon1_rad);
    const y2 = radius * Math.cos(lat2_rad) * Math.sin(lon2_rad);


    return[
        {x: x1, y: y1}, 
        {x: x2, y: y2}
    ];
}

export function userToCartesian(lat: number, lon: number){

    const radius = 6371;
    
    const lat1_rad = lat * (Math.PI/180);
    const lon1_rad = lon * (Math.PI/180);

    const x = radius * Math.cos(lat1_rad) * Math.cos(lon1_rad);
    const y = radius * Math.cos(lat1_rad) * Math.sin(lon1_rad);

    return{x: x, y: y};
}