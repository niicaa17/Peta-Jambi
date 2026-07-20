const fs = require('fs');
const https = require('https');

const query = `
[out:json][timeout:25];
(
  node["amenity"="school"](-2.76, 101.12, -0.74, 104.49);
  way["amenity"="school"](-2.76, 101.12, -0.74, 104.49);
  node["amenity"="kindergarten"](-2.76, 101.12, -0.74, 104.49);
  way["amenity"="kindergarten"](-2.76, 101.12, -0.74, 104.49);
  node["building"="school"](-2.76, 101.12, -0.74, 104.49);
  way["building"="school"](-2.76, 101.12, -0.74, 104.49);
);
out center;
`;

const options = {
    hostname: 'overpass-api.de',
    path: '/api/interpreter?data=' + encodeURIComponent(query),
    method: 'GET',
    headers: {
        'User-Agent': 'NodeJS Jambi GIS Script'
    }
};

console.log("Fetching data from Overpass API...");

https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const features = [];
            
            parsed.elements.forEach((el, index) => {
                let lat = el.lat || (el.center && el.center.lat);
                let lon = el.lon || (el.center && el.center.lon);
                
                if (!lat || !lon) return;
                
                if (!el.tags) return;
                let name = el.tags.name ? el.tags.name : (el.tags.amenity === 'kindergarten' ? 'TK (Tidak Bernama)' : 'Sekolah (Tidak Bernama)');
                
                // Try to infer type
                let type = "Swasta/Negeri";
                if (name.toUpperCase().includes("N ") || name.toUpperCase().includes("NEGERI")) type = "Negeri";
                
                let category = "Sekolah";
                if (name.toUpperCase().includes("TK ") || name.toUpperCase().includes("TAMAN KANAK") || el.tags.amenity === 'kindergarten') category = "TK";
                else if (name.toUpperCase().includes("SD ") || name.toUpperCase().includes("SEKOLAH DASAR")) category = "SD";
                else if (name.toUpperCase().includes("SMP ") || name.toUpperCase().includes("MTS")) category = "SMP";
                else if (name.toUpperCase().includes("SMA ") || name.toUpperCase().includes("SMK ") || name.toUpperCase().includes("MAN ")) category = "SMA/SMK";
                
                features.push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    },
                    "properties": {
                        "id": index + 1,
                        "name": name,
                        "regency": "Jambi (Umum)", // Overpass doesn't easily give sub-area without complex queries
                        "type": type,
                        "category": category,
                        "coordinates_str": `${lat.toFixed(5)}, ${lon.toFixed(5)}`
                    }
                });
            });

            const geojson = {
                "type": "FeatureCollection",
                "features": features
            };

            const fileContent = `var json_schools = ${JSON.stringify(geojson, null, 2)};\n`;
            fs.writeFileSync('layers/schools.js', fileContent);
            console.log(`Successfully saved ${features.length} schools to layers/schools.js`);

        } catch (e) {
            console.error("Error parsing response:", e.message);
        }
    });
}).on('error', (e) => {
    console.error("HTTP Error:", e.message);
});
