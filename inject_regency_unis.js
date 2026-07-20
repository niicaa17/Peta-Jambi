const fs = require('fs');

let uniRaw = fs.readFileSync('layers/universities.js', 'utf8');
let uniJsonStr = uniRaw.replace('var json_universities = ', '').trim();
if (uniJsonStr.endsWith(';')) uniJsonStr = uniJsonStr.slice(0, -1);
let uniData = JSON.parse(uniJsonStr);

const newRegencyUnis = [
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [101.9790, -1.4925] },
        "properties": {
            "name": "Universitas Muara Bungo (UMB)",
            "type": "Swasta",
            "regency": "Bungo",
            "coordinates_str": "-1.49250, 101.97900",
            "category": "Universitas",
            "aliases": ["UMB", "Muara Bungo"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [101.9702, -1.5034] },
        "properties": {
            "name": "Universitas Muhammadiyah Muara Bungo",
            "type": "Swasta",
            "regency": "Bungo",
            "coordinates_str": "-1.50340, 101.97020",
            "category": "Universitas",
            "aliases": ["UMMB"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [102.2619, -2.0628] },
        "properties": {
            "name": "Universitas Merangin",
            "type": "Swasta",
            "regency": "Merangin",
            "coordinates_str": "-2.06280, 102.26190",
            "category": "Universitas"
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.2678, -1.7511] },
        "properties": {
            "name": "Institut Agama Islam Nusantara Batanghari",
            "type": "Swasta",
            "regency": "Batanghari",
            "coordinates_str": "-1.75110, 103.26780",
            "category": "Universitas",
            "aliases": ["IAI Nusantara"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [101.3921, -2.0621] },
        "properties": {
            "name": "IAIN Kerinci",
            "type": "Negeri",
            "regency": "Sungai Penuh",
            "coordinates_str": "-2.06210, 101.39210",
            "category": "Universitas",
            "aliases": ["IAIN", "Kerinci"]
        }
    }
];

let uniId = 3000;
newRegencyUnis.forEach(nu => {
    uniId++;
    nu.properties.id = uniId;
    uniData.features.push(nu);
});

fs.writeFileSync('layers/universities.js', `var json_universities = ${JSON.stringify(uniData, null, 2)};\n`);
console.log('Regency universities added.');
