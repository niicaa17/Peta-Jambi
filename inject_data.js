const fs = require('fs');

// Add prominent schools
let schoolsRaw = fs.readFileSync('layers/schools.js', 'utf8');
let schoolsJsonStr = schoolsRaw.replace('var json_schools = ', '').trim();
if (schoolsJsonStr.endsWith(';')) schoolsJsonStr = schoolsJsonStr.slice(0, -1);
let schoolsData = JSON.parse(schoolsJsonStr);

const newSchools = [
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.5927, -1.6096] },
        "properties": {
            "name": "SMA Negeri 1 Kota Jambi",
            "type": "Negeri",
            "regency": "Kota Jambi",
            "coordinates_str": "-1.60960, 103.59270",
            "category": "Sekolah Menengah Atas"
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.5113, -1.6012] },
        "properties": {
            "name": "SMA Titian Teras H. Abdurrahman Sayoeti",
            "type": "Negeri",
            "regency": "Muaro Jambi",
            "coordinates_str": "-1.60120, 103.51130",
            "category": "Sekolah Menengah Atas"
        }
    },
    {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [103.6162, -1.5975] },
        "properties": {
            "name": "SMA Xaverius 1 Jambi",
            "type": "Swasta",
            "regency": "Kota Jambi",
            "coordinates_str": "-1.59750, 103.61620",
            "category": "Sekolah Menengah Atas"
        }
    }
];

// Determine highest ID
let maxId = 0;
schoolsData.features.forEach(f => {
    if (f.properties.id && f.properties.id > maxId) maxId = f.properties.id;
});

newSchools.forEach(ns => {
    maxId++;
    ns.properties.id = maxId;
    schoolsData.features.push(ns);
});

fs.writeFileSync('layers/schools.js', `var json_schools = ${JSON.stringify(schoolsData, null, 2)};\n`);

// Update UNH in universities
let uniRaw = fs.readFileSync('layers/universities.js', 'utf8');
let uniJsonStr = uniRaw.replace('var json_universities = ', '').trim();
if (uniJsonStr.endsWith(';')) uniJsonStr = uniJsonStr.slice(0, -1);
let uniData = JSON.parse(uniJsonStr);

uniData.features.forEach(u => {
    if (u.properties.name === 'Universitas Nurdin Hamzah') {
        u.properties.address = 'Jl. Kolonel Abunjani, RT. 25, Selamat, Kec. Telanaipura, Kota Jambi';
        u.properties.website = 'https://unh.ac.id';
        u.properties.accreditation = 'B (Baik)';
    }
});

fs.writeFileSync('layers/universities.js', `var json_universities = ${JSON.stringify(uniData, null, 2)};\n`);
console.log('Done appending manual data.');
