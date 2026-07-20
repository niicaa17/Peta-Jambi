const fs = require('fs');

let regenciesRaw = fs.readFileSync('layers/jambi_regencies.js', 'utf8');
let regenciesJsonStr = regenciesRaw.replace('var json_jambi_regencies = ', '').trim();
if (regenciesJsonStr.endsWith(';')) regenciesJsonStr = regenciesJsonStr.slice(0, -1);
const regenciesData = JSON.parse(regenciesJsonStr);

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
    return null;
}

function processLayer(filename, varName) {
    if (!fs.existsSync(filename)) return;
    let raw = fs.readFileSync(filename, 'utf8');
    let str = raw.replace(`var ${varName} = `, '').trim();
    if (str.endsWith(';')) str = str.slice(0, -1);
    
    let data = JSON.parse(str);
    let count = 0;
    
    data.features.forEach(f => {
        if (f.geometry && f.geometry.coordinates) {
            let reg = getRegencyForPoint(f.geometry.coordinates[0], f.geometry.coordinates[1]);
            if (reg) {
                f.properties.regency = reg;
                count++;
            } else if (!f.properties.regency || f.properties.regency === 'Jambi') {
                f.properties.regency = "Kota Jambi"; // Default prominent central fallback
            }
        }
    });
    
    fs.writeFileSync(filename, `var ${varName} = ${JSON.stringify(data, null, 2)};\n`);
    console.log(`Updated ${count}/${data.features.length} features in ${filename}`);
}

processLayer('layers/schools.js', 'json_schools');
processLayer('layers/universities.js', 'json_universities');
