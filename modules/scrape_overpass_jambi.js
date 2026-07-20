const https = require('https');

const JAMBI_BBOX = '-2.76, 101.12, -0.74, 104.49';

function fetchOverpassData() {
    return new Promise((resolve) => {
        const query = `
[out:json][timeout:90];
(
  node["amenity"="school"](${JAMBI_BBOX});
  way["amenity"="school"](${JAMBI_BBOX});
  node["amenity"="kindergarten"](${JAMBI_BBOX});
  way["amenity"="kindergarten"](${JAMBI_BBOX});
  node["amenity"="university"](${JAMBI_BBOX});
  way["amenity"="university"](${JAMBI_BBOX});
  node["amenity"="college"](${JAMBI_BBOX});
  way["amenity"="college"](${JAMBI_BBOX});
  node["building"="school"](${JAMBI_BBOX});
  way["building"="school"](${JAMBI_BBOX});
  node["building"="university"](${JAMBI_BBOX});
  way["building"="university"](${JAMBI_BBOX});
);
out center tags;
        `;

        const options = {
            hostname: 'overpass-api.de',
            path: '/api/interpreter?data=' + encodeURIComponent(query),
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 25000
        };

        console.log("--> Fetching Overpass spatial data for Jambi...");

        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    if (!data.trim().startsWith('{')) {
                        console.log("--> Overpass returned non-JSON format, proceeding with official Dapodik dataset.");
                        return resolve([]);
                    }
                    const parsed = JSON.parse(data);
                    if (!parsed.elements) {
                        return resolve([]);
                    }

                    const items = parsed.elements.map((el) => {
                        const lat = el.lat || (el.center && el.center.lat);
                        const lon = el.lon || (el.center && el.center.lon);
                        const tags = el.tags || {};
                        const rawName = tags.name || tags['name:id'] || '';

                        let category = 'Sekolah';
                        let jenjang = 'Lainnya';
                        let nameUpper = rawName.toUpperCase();

                        if (tags.amenity === 'kindergarten' || nameUpper.includes('TK ') || nameUpper.includes('TAMAN KANAK') || nameUpper.includes('PAUD') || nameUpper.includes('RA ')) {
                            category = 'TK';
                            jenjang = 'TK / PAUD';
                        } else if (tags.amenity === 'university' || tags.amenity === 'college' || nameUpper.includes('UNIVERSITAS') || nameUpper.includes('STIKES') || nameUpper.includes('STIE') || nameUpper.includes('STMIK') || nameUpper.includes('IAIN') || nameUpper.includes('UIN ') || nameUpper.includes('POLITEKNIK') || nameUpper.includes('AKADEMI')) {
                            category = 'Universitas';
                            jenjang = 'Perguruan Tinggi';
                        } else if (nameUpper.includes('SD ') || nameUpper.includes('SDN ') || nameUpper.includes('SEKOLAH DASAR') || nameUpper.includes('MIN ')) {
                            category = 'SD';
                            jenjang = 'Sekolah Dasar';
                        } else if (nameUpper.includes('SMP ') || nameUpper.includes('SMPN ') || nameUpper.includes('MTS') || nameUpper.includes('MTSN')) {
                            category = 'SMP';
                            jenjang = 'Sekolah Menengah Pertama';
                        } else if (nameUpper.includes('SMA ') || nameUpper.includes('SMAN ') || nameUpper.includes('SMK ') || nameUpper.includes('SMKN ') || nameUpper.includes('MAN ')) {
                            category = 'SMA/SMK';
                            jenjang = 'Sekolah Menengah Atas / Kejuruan';
                        }

                        let status = 'Swasta/Negeri';
                        if (nameUpper.includes('NEGERI') || nameUpper.includes(' N ') || nameUpper.includes('SDN') || nameUpper.includes('SMPN') || nameUpper.includes('SMAN') || nameUpper.includes('SMKN') || nameUpper.includes('MIN') || nameUpper.includes('MTSN') || nameUpper.includes('MAN')) {
                            status = 'Negeri';
                        } else if (tags['operator:type'] === 'private' || tags.operator) {
                            status = 'Swasta';
                        }

                        let address = tags['addr:full'] || (tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`.trim() : '');

                        return {
                            id: `osm_${el.id}`,
                            npsn: tags['ref:npsn'] || tags['npsn'] || null,
                            name: rawName || `${category} (Tidak Bernama)`,
                            category: category,
                            jenjang: jenjang,
                            type: status,
                            lat: lat,
                            lon: lon,
                            address: address,
                            district: tags['addr:subdistrict'] || tags['addr:district'] || '',
                            city: tags['addr:city'] || tags['addr:province'] || '',
                            website: tags.website || tags['contact:website'] || '',
                            phone: tags.phone || tags['contact:phone'] || '',
                            source: 'OpenStreetMap Overpass'
                        };
                    }).filter(item => item.lat && item.lon);

                    console.log(`--> Overpass API returned ${items.length} institutions in Jambi.`);
                    resolve(items);
                } catch (e) {
                    console.log("--> Overpass parse error, using official Dapodik dataset.");
                    resolve([]);
                }
            });
        });

        req.on('error', () => resolve([]));
        req.on('timeout', () => { req.destroy(); resolve([]); });
    });
}

module.exports = { fetchOverpassData };
