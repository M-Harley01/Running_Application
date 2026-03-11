type Cartesian = {
    x: number;
    y: number;
};

export function distanceToSegment(p: Cartesian, a: Cartesian, b: Cartesian){
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;

    const proj = apx * abx + apy * aby;
    const abLenSqr = abx * abx + aby * aby;

    let u = proj/abLenSqr;
    u = Math.max(0, Math.min(1, u));

    const x = a.x + u * (b.x - a.x);
    const y = a.y + u * (b.y - a.y);

    const distance = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
    return distance
}

let lastClosestIndex = -1;

export function dToLine(userPoint:Cartesian, route: Cartesian[]){
    let start = 0;
    let end = route.length;
    let closestPoint : { x: number; y: number } = {x:0, y:0};
    let closestDistance = Infinity;
    let closestPointIndex = -1;

    if (closestPointIndex !== -1){
        start = Math.max(0, closestPointIndex - 10);
        end = Math.min(route.length, closestPointIndex + 10);
    }

    for(let i = start; i < end; i++){

        const distanceToPoint = Math.sqrt(Math.pow((userPoint.x - route[i].x), 2) + Math.pow((userPoint.y - route[i].y), 2));
        if(distanceToPoint < closestDistance){
            closestPoint = {x: route[i].x, y: route[i].y};
            closestDistance = distanceToPoint;
            closestPointIndex = i
        }
    }

    lastClosestIndex = closestPointIndex;

    console.log("Closest point is: ", route[closestPointIndex])

    if(closestPointIndex === 0){
        return distanceToSegment(userPoint, route[0], route[1]);
    }

    if(closestPointIndex === route.length - 1){
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
    )

    const nextDistance = distanceToSegment(
        userPoint,
        route[closestPointIndex],
        route[closestPointIndex + 1]
    )
    
    return Math.min(prevDistance, nextDistance);
}