const fs = require('fs');

// Add prominent universities
let uniRaw = fs.readFileSync('layers/universities.js', 'utf8');
let uniJsonStr = uniRaw.replace('var json_universities = ', '').trim();
if (uniJsonStr.endsWith(';')) uniJsonStr = uniJsonStr.slice(0, -1);
let uniData = JSON.parse(uniJsonStr);

const newUnis = [
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.5222, -1.6167] },
        "properties": {
            "name": "Universitas Jambi (UNJA) Mendalo",
            "type": "Negeri",
            "regency": "Muaro Jambi",
            "address": "Jl. Raya Jambi - Muara Bulian KM. 15, Mendalo Darat",
            "website": "https://unja.ac.id",
            "accreditation": "B",
            "coordinates_str": "-1.61670, 103.52220",
            "category": "Universitas",
            "aliases": ["UNJA"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.5350, -1.5950] },
        "properties": {
            "name": "UIN Sulthan Thaha Saifuddin",
            "type": "Negeri",
            "regency": "Muaro Jambi",
            "address": "Jl. Jambi - Muara Bulian KM. 16, Simpang Sei. Duren",
            "website": "https://uinjambi.ac.id",
            "accreditation": "B",
            "coordinates_str": "-1.59500, 103.53500",
            "category": "Universitas",
            "aliases": ["UIN", "STS"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.5938, -1.5912] },
        "properties": {
            "name": "Universitas Batanghari (UNBARI)",
            "type": "Swasta",
            "regency": "Kota Jambi",
            "address": "Jl. Slamet Riyadi, Broni, Kec. Danau Sipin",
            "website": "https://unbari.ac.id",
            "accreditation": "B",
            "coordinates_str": "-1.59120, 103.59380",
            "category": "Universitas",
            "aliases": ["UNBARI"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6210, -1.6234] },
        "properties": {
            "name": "Universitas Dinamika Bangsa (UNAMA)",
            "type": "Swasta",
            "regency": "Kota Jambi",
            "address": "Jl. Jend. Sudirman, The Hok",
            "website": "https://unama.ac.id",
            "accreditation": "B",
            "coordinates_str": "-1.62340, 103.62100",
            "category": "Universitas",
            "aliases": ["UNAMA", "Dinamika Bangsa"]
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6095, -1.6110] },
        "properties": {
            "name": "Universitas Muhammadiyah Jambi",
            "type": "Swasta",
            "regency": "Kota Jambi",
            "address": "Jl. Kapten Pattimura, Nusa Indah",
            "website": "https://umjambi.ac.id",
            "accreditation": "B",
            "coordinates_str": "-1.61100, 103.60950",
            "category": "Universitas",
            "aliases": ["UMJ", "UM Jambi"]
        }
    }
];

let uniId = 2000;
newUnis.forEach(nu => {
    uniId++;
    nu.properties.id = uniId;
    uniData.features.push(nu);
});
fs.writeFileSync('layers/universities.js', `var json_universities = ${JSON.stringify(uniData, null, 2)};\n`);

// Add prominent SMAs
let schoolsRaw = fs.readFileSync('layers/schools.js', 'utf8');
let schoolsJsonStr = schoolsRaw.replace('var json_schools = ', '').trim();
if (schoolsJsonStr.endsWith(';')) schoolsJsonStr = schoolsJsonStr.slice(0, -1);
let schoolsData = JSON.parse(schoolsJsonStr);

const newSchools = [
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6183, -1.6241] },
        "properties": {
            "name": "SMA Negeri 2 Kota Jambi",
            "type": "Negeri",
            "regency": "Kota Jambi",
            "coordinates_str": "-1.62410, 103.61830",
            "category": "Sekolah Menengah Atas"
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6072, -1.6288] },
        "properties": {
            "name": "SMA Negeri 3 Kota Jambi",
            "type": "Negeri",
            "regency": "Kota Jambi",
            "coordinates_str": "-1.62880, 103.60720",
            "category": "Sekolah Menengah Atas"
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6255, -1.6144] },
        "properties": {
            "name": "SMA Negeri 4 Kota Jambi",
            "type": "Negeri",
            "regency": "Kota Jambi",
            "coordinates_str": "-1.61440, 103.62550",
            "category": "Sekolah Menengah Atas"
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6251, -1.6033] },
        "properties": {
            "name": "SMA Negeri 5 Kota Jambi",
            "type": "Negeri",
            "regency": "Kota Jambi",
            "coordinates_str": "-1.60330, 103.62510",
            "category": "Sekolah Menengah Atas"
        }
    }
];

let schoolId = 5000;
newSchools.forEach(ns => {
    schoolId++;
    ns.properties.id = schoolId;
    schoolsData.features.push(ns);
});
fs.writeFileSync('layers/schools.js', `var json_schools = ${JSON.stringify(schoolsData, null, 2)};\n`);
console.log('Done appending more data.');
