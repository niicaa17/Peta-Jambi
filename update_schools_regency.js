const fs = require('fs');

// 1. Read files
let schoolsRaw = fs.readFileSync('layers/schools.js', 'utf8');
let regenciesRaw = fs.readFileSync('layers/jambi_regencies.js', 'utf8');

// Strip var declaration to parse JSON
let schoolsJsonStr = schoolsRaw.replace('var json_schools = ', '').trim();
if (schoolsJsonStr.endsWith(';')) schoolsJsonStr = schoolsJsonStr.slice(0, -1);

let regenciesJsonStr = regenciesRaw.replace('var json_jambi_regencies = ', '').trim();
if (regenciesJsonStr.endsWith(';')) regenciesJsonStr = regenciesJsonStr.slice(0, -1);

const schoolsData = JSON.parse(schoolsJsonStr);
const regenciesData = JSON.parse(regenciesJsonStr);

// 2. Point in Polygon Algorithm (Ray Casting)
function pointInPolygon(point, vs) {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        
        let intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getRegencyForPoint(lon, lat) {
    let point = [lon, lat];
    
    for (let feature of regenciesData.features) {
        if (!feature.geometry) continue;
        
        let isInside = false;
        if (feature.geometry.type === 'Polygon') {
            // First ring is outer, others are holes
            isInside = pointInPolygon(point, feature.geometry.coordinates[0]);
        } else if (feature.geometry.type === 'MultiPolygon') {
            for (let poly of feature.geometry.coordinates) {
                if (pointInPolygon(point, poly[0])) {
                    isInside = true;
                    break;
                }
            }
        }
        
        if (isInside) {
            return feature.properties.regency_key || feature.properties.name_clean || feature.properties.NAME_2;
        }
    }
    return "Luar Jambi / Tidak Diketahui";
}

// 3. Update Schools
let updated = 0;
schoolsData.features.forEach(school => {
    let coords = school.geometry.coordinates;
    let regency = getRegencyForPoint(coords[0], coords[1]);
    
    if (regency) {
        school.properties.regency = regency;
        updated++;
    }
});

console.log(`Updated ${updated} schools with correct regency names.`);

// 4. Save file
fs.writeFileSync('layers/schools.js', `var json_schools = ${JSON.stringify(schoolsData, null, 2)};\n`);
console.log('Saved to layers/schools.js');
