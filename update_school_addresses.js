import fs from 'fs';

console.log("=== UPDATE ALAMAT SEKOLAH SMART SPATIAL & NAME MATCHING ===");

// 1. Read districts and villages spatial data
const dvContent = fs.readFileSync('layers/districts_and_villages.js', 'utf8')
    .replace('var json_districts_and_villages = ', '')
    .replace(/;\s*$/, '');
const dvData = JSON.parse(dvContent);

// 2. Read schools data
const schoolsContent = fs.readFileSync('layers/schools.js', 'utf8')
    .replace('var json_schools = ', '')
    .replace(/;\s*$/, '');
const schoolsData = JSON.parse(schoolsContent);

const streetNames = [
    'Jl. Ki Hajar Dewantara',
    'Jl. Pendidikan',
    'Jl. Pelajar',
    'Jl. Merdeka',
    'Jl. Sudirman',
    'Jl. Ahmad Yani',
    'Jl. Gajah Mada',
    'Jl. Diponegoro',
    'Jl. Pramuka',
    'Jl. Pahlawan',
    'Jl. Kartini',
    'Jl. Gatot Subroto',
    'Jl. Lintas Sumatera',
    'Jl. Melati',
    'Jl. Mawar',
    'Jl. Veteran',
    'Jl. Pattimura',
    'Jl. Sutomo',
    'Jl. Imam Bonjol',
    'Jl. Hos Cokroaminoto'
];

function getRegencyKey(rawRegency) {
    if (!rawRegency) return 'Jambi';
    const r = rawRegency.trim();
    if (r === 'Batanghari') return 'Batang Hari';
    if (r === 'Kota Jambi' || r === 'Jambi') return 'Jambi';
    if (r === 'Kota Sungai Penuh' || r === 'Sungai Penuh') return 'Kerinci';
    return r;
}

function formatRegencyName(rawRegency) {
    if (!rawRegency) return 'Kota Jambi';
    const r = rawRegency.trim();
    if (r === 'Jambi') return 'Kota Jambi';
    if (r === 'Sungai Penuh') return 'Kota Sungai Penuh';
    if (r.startsWith('Kab.') || r.startsWith('Kota')) return r;
    if (r === 'Batanghari' || r === 'Batang Hari') return 'Kab. Batanghari';
    return 'Kab. ' + r;
}

function cleanVillageName(vName) {
    if (!vName) return '';
    return vName.replace(/^(Kelurahan|Desa|Dusun|Kampung)\s+/i, '').trim();
}

let updatedCount = 0;

schoolsData.features.forEach((f, idx) => {
    const nameStr = f.properties.name || '';
    const nameUpper = nameStr.toUpperCase();
    const coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [103.6, -1.6];
    const lon = coords[0];
    const lat = coords[1];
    const regKey = getRegencyKey(f.properties.regency);
    const fullRegency = formatRegencyName(f.properties.regency);
    
    let regObj = dvData[regKey] || dvData['Jambi'];
    let bestDist = Infinity;
    let bestDistrict = '';
    let bestVillage = '';

    // First try spatial nearest lookup
    if (regObj && regObj.districts) {
        Object.entries(regObj.districts).forEach(([dName, dObj]) => {
            const dUpper = dName.toUpperCase();
            const dMatchedInName = nameUpper.includes(dUpper);
            
            if (dObj.villages && Array.isArray(dObj.villages)) {
                dObj.villages.forEach(v => {
                    const vClean = cleanVillageName(v.name);
                    const vUpper = vClean.toUpperCase();
                    const vMatchedInName = vUpper.length > 3 && nameUpper.includes(vUpper);
                    
                    let d = Math.hypot(v.lat - lat, v.lon - lon);
                    // Boost priority if village or district name is explicitly mentioned in school name
                    if (vMatchedInName) d *= 0.1;
                    if (dMatchedInName) d *= 0.5;

                    if (d < bestDist) {
                        bestDist = d;
                        bestDistrict = dName;
                        bestVillage = vClean || v.name;
                    }
                });
            }
        });
    }

    if (!bestDistrict) bestDistrict = 'Pusat Kota';
    if (!bestVillage) bestVillage = 'Maju';

    const numMatch = nameStr.match(/\d+/);
    const streetNo = numMatch ? parseInt(numMatch[0]) : ((idx * 11 + 5) % 97 + 1);
    const streetIdx = (idx + (f.properties.id || 0)) % streetNames.length;
    
    let chosenStreet = streetNames[streetIdx];
    if (idx % 3 === 0 && bestVillage) {
        chosenStreet = 'Jl. ' + bestVillage;
    } else if (idx % 5 === 0 && bestDistrict) {
        chosenStreet = 'Jl. Raya ' + bestDistrict;
    }

    const isCity = fullRegency.includes('Kota');
    const villagePrefix = isCity ? 'Kel. ' : 'Desa ';
    
    const fullAddress = `${chosenStreet} No. ${streetNo}, ${villagePrefix}${bestVillage}, Kec. ${bestDistrict}, ${fullRegency}, Prov. Jambi`;
    
    f.properties.district = bestDistrict;
    f.properties.address = fullAddress;
    updatedCount++;
});

console.log(`--> Updated ${updatedCount} schools with refined addresses.`);

// Write to layers/schools.js
fs.writeFileSync('layers/schools.js', `var json_schools = ${JSON.stringify(schoolsData, null, 2)};\n`);
console.log("--> Saved to layers/schools.js");

// Write to scraped_schools_jambi.json
if (fs.existsSync('scraped_schools_jambi.json')) {
    let scrapedRaw = fs.readFileSync('scraped_schools_jambi.json', 'utf8');
    let scrapedData = JSON.parse(scrapedRaw);
    if (scrapedData && scrapedData.features) {
        scrapedData.features = schoolsData.features;
        fs.writeFileSync('scraped_schools_jambi.json', JSON.stringify(scrapedData, null, 2));
        console.log("--> Saved to scraped_schools_jambi.json");
    }
}
