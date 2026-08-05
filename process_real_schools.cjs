const fs = require('fs');

async function processData() {
    const data = JSON.parse(fs.readFileSync('overpass_schools.json', 'utf8'));
    console.log(`Found ${data.elements.length} elements from Overpass API.`);
    
    let schoolFeatures = [];
    let uniFeatures = [];
    
    let idCounter = 1;
    let uniIdCounter = 1;

    for (const el of data.elements) {
        if (!el.tags || !el.tags.name) continue; 
        const name = el.tags.name;
        
        let lat = el.lat || (el.center && el.center.lat);
        let lon = el.lon || (el.center && el.center.lon);
        
        if (!lat || !lon) continue;
        
        // Extract address
        let addr = "-";
        if (el.tags['addr:street']) addr = el.tags['addr:street'];
        if (el.tags['addr:city']) addr += ", " + el.tags['addr:city'];
        if (addr.startsWith("-, ")) addr = addr.replace("-, ", "");

        const amenity = el.tags.amenity;
        
        // Determine category and jenjang
        let category = 'Sekolah';
        let jenjang = 'Lainnya';
        let isUni = false;
        
        const rawName = name.toUpperCase();
        
        if (amenity === 'university' || amenity === 'college' || rawName.includes('UNIVERSITAS') || rawName.includes('INSTITUT') || rawName.includes('SEKOLAH TINGGI') || rawName.includes('POLITEKNIK')) {
            isUni = true;
            category = 'Universitas';
            jenjang = 'Perguruan Tinggi';
        } else if (amenity === 'kindergarten' || rawName.includes('TK ') || rawName.includes('PAUD')) {
            category = 'TK';
            jenjang = 'TK / PAUD';
        } else if (rawName.includes('SD ') || rawName.includes('SDN ') || rawName.includes('MIN ')) {
            category = 'SD';
            jenjang = 'Sekolah Dasar';
        } else if (rawName.includes('SMP') || rawName.includes('MTS')) {
            category = 'SMP';
            jenjang = 'Sekolah Menengah Pertama';
        } else if (rawName.includes('SMA') || rawName.includes('SMK') || rawName.includes('MAN ')) {
            category = 'SMA/SMK';
            jenjang = 'Sekolah Menengah Atas / Kejuruan';
        }

        const feature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lon, lat]
            },
            properties: {
                id: isUni ? uniIdCounter++ : idCounter++,
                name: name,
                type: rawName.includes('NEGERI') ? 'Negeri' : 'Swasta',
                category: category,
                jenjang: jenjang,
                regency: el.tags['addr:city'] || el.tags['addr:district'] || "Jambi",
                address: addr !== "-" ? addr : (el.tags.description || el.tags.note || "Alamat belum tersedia dari OpenStreetMap"),
                coordinates_str: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
                source: "OpenStreetMap"
            }
        };

        if (isUni) {
            uniFeatures.push(feature);
        } else {
            schoolFeatures.push(feature);
        }
    }
    
    console.log(`Saving ${schoolFeatures.length} schools and ${uniFeatures.length} universities.`);
    
    fs.writeFileSync('./public/layers/schools.js', 'var json_schools = ' + JSON.stringify({ type: "FeatureCollection", features: schoolFeatures }, null, 2) + ';\n');
    fs.writeFileSync('./public/layers/universities.js', 'var json_universities = ' + JSON.stringify({ type: "FeatureCollection", features: uniFeatures }, null, 2) + ';\n');
}

processData();
