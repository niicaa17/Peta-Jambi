const fs = require('fs');
const path = './public/layers/tourism.js';

async function fetchTourism() {
    console.log("Fetching tourism objects from Overpass API...");
    const overpassQuery = `
        [out:json][timeout:25];
        area["name"="Jambi"]["admin_level"="4"]->.searchArea;
        (
            node["tourism"](area.searchArea);
            way["tourism"](area.searchArea);
            relation["tourism"](area.searchArea);
            node["waterway"="waterfall"](area.searchArea);
            node["historic"](area.searchArea);
        );
        out center;
    `;

    const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'data=' + encodeURIComponent(overpassQuery)
    });
    
    if (!response.ok) {
        console.log(await response.text());
        return;
    }

    const data = await response.json();
    console.log(`Found ${data.elements.length} elements from Overpass API.`);
    
    // Read existing
    let rawContent = fs.readFileSync(path, 'utf-8');
    let jsonString = rawContent.replace('var json_tourism = ', '').replace(/;\s*$/, '');
    let existingData = JSON.parse(jsonString);
    let existingNames = new Set(existingData.features.map(f => f.properties.name.toLowerCase()));
    
    let added = 0;
    for (const el of data.elements) {
        if (!el.tags || !el.tags.name) continue; // Skip unnamed
        const name = el.tags.name;
        if (existingNames.has(name.toLowerCase())) continue; // Skip existing
        
        let lat = el.lat || (el.center && el.center.lat);
        let lon = el.lon || (el.center && el.center.lon);
        
        if (!lat || !lon) continue;
        
        let typeStr = el.tags.tourism || el.tags.waterway || el.tags.historic || "attraction";
        
        existingData.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lon, lat]
            },
            properties: {
                name: name,
                type: typeStr,
                regency: el.tags['addr:city'] || el.tags['addr:district'] || "Jambi",
                coordinates_str: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
                sejarah: el.tags.description || el.tags.wikipedia || "Informasi sejarah singkat belum tersedia untuk lokasi ini yang didapatkan dari data peta terbuka (OSM)."
            }
        });
        existingNames.add(name.toLowerCase());
        added++;
    }
    
    console.log(`Added ${added} new tourism objects.`);
    const newContent = 'var json_tourism = ' + JSON.stringify(existingData, null, 2) + ';';
    fs.writeFileSync(path, newContent, 'utf-8');
}

fetchTourism();
