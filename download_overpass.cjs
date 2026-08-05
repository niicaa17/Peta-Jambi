const fs = require('fs');

async function downloadOverpass() {
    const query = fs.readFileSync('overpass_query.txt', 'utf8');
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'Accept': 'application/json',
            'User-Agent': 'JambiWebGIS-Bot/1.0'
        },
        body: query
    });
    const text = await response.text();
    fs.writeFileSync('overpass_schools.json', text);
    console.log("Downloaded " + text.length + " bytes.");
}

downloadOverpass();
