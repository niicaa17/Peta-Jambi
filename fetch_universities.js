const fs = require('fs');
const https = require('https');

const query = `
[out:json][timeout:25];
(
  node["amenity"="university"](-2.76, 101.12, -0.74, 104.49);
  way["amenity"="university"](-2.76, 101.12, -0.74, 104.49);
  node["amenity"="college"](-2.76, 101.12, -0.74, 104.49);
  way["amenity"="college"](-2.76, 101.12, -0.74, 104.49);
  node["building"="university"](-2.76, 101.12, -0.74, 104.49);
  way["building"="university"](-2.76, 101.12, -0.74, 104.49);
);
out center;
`;

const options = {
    hostname: 'lz4.overpass-api.de',
    path: '/api/interpreter?data=' + encodeURIComponent(query),
    method: 'GET',
    headers: {
        'User-Agent': 'NodeJS Jambi GIS Script'
    }
};

console.log("Fetching universities from Overpass API...");

https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const features = [];
            
            // Retain existing universities (we don't want to lose UNH with its details)
            let existingRaw = fs.readFileSync('layers/universities.js', 'utf8');
            let existingStr = existingRaw.replace('var json_universities = ', '').trim();
            if(existingStr.endsWith(';')) existingStr = existingStr.slice(0, -1);
            let existingData = JSON.parse(existingStr);
            
            // Map existing names to avoid duplicates
            let existingNames = new Set(existingData.features.map(f => f.properties.name.toLowerCase()));
            
            let idCounter = 1000;
            
            parsed.elements.forEach((el) => {
                let lat = el.lat || (el.center && el.center.lat);
                let lon = el.lon || (el.center && el.center.lon);
                
                if (!lat || !lon) return;
                
                let name = (el.tags && el.tags.name) ? el.tags.name : 'Perguruan Tinggi (Tidak Bernama)';
                if (existingNames.has(name.toLowerCase())) return; // skip duplicate
                
                let type = "Swasta";
                if (name.toUpperCase().includes("NEGERI") || name.toUpperCase().includes("UIN ") || name.toUpperCase().includes("UNJA")) type = "Negeri";
                
                existingData.features.push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    },
                    "properties": {
                        "id": idCounter++,
                        "name": name,
                        "type": type,
                        "category": "Universitas",
                        "coordinates_str": `${lat.toFixed(5)}, ${lon.toFixed(5)}`
                        // regency will be updated by another script
                    }
                });
            });
            
            fs.writeFileSync('layers/universities.js', 'var json_universities = ' + JSON.stringify(existingData, null, 2) + ';\n');
            console.log(`Successfully added new universities. Total now: ${existingData.features.length}`);
            
        } catch (e) {
            console.error("Error parsing JSON: ", e);
        }
    });
}).on('error', (e) => {
    console.error("HTTP Request Error: ", e);
});
