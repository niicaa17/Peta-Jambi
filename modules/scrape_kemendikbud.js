const https = require('https');

const KEMENDIKDASMEN_TOKEN = '6d04941d7990b3b5270fe4a2d48dbe2a2eea962ebc7dce8d5b18d9a5017fec43d1c1be738f7479a6e14f8a64d81751fe906c95c416565db6747715be9aaf218846357cc5524d9bfae710652f165b248cc968a62f49d6ac738bf7ea3ac3c74cc9e4dfa7d14bc9bdea26b5f217971af447b4c1346a5611bce1a06a76a099e59b3f';

const JAMBI_REGENCY_NAMES = [
    'Kota Jambi',
    'Kota Sungai Penuh',
    'Kab. Batanghari',
    'Kab. Muaro Jambi',
    'Kab. Bungo',
    'Kab. Tebo',
    'Kab. Merangin',
    'Kab. Sarolangun',
    'Kab. Kerinci',
    'Kab. Tanjung Jabung Barat',
    'Kab. Tanjung Jabung Timur'
];

function fetchKemendikdasmenRegency(regencyName) {
    return new Promise((resolve) => {
        const url = `https://dapo.kemendikdasmen.go.id/api/ikdByKabupatenDetail?kabupaten=${encodeURIComponent(regencyName)}`;
        const options = {
            headers: {
                'Authorization': `Bearer ${KEMENDIKDASMEN_TOKEN}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 15000
        };

        const req = https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && Array.isArray(json.data)) {
                        resolve(json.data);
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    resolve([]);
                }
            });
        });

        req.on('error', () => resolve([]));
        req.on('timeout', () => { req.destroy(); resolve([]); });
    });
}

async function scrapeKemendikbudSchools() {
    console.log("--> Fetching official school data from dapo.kemendikdasmen.go.id API...");
    const allSchools = [];

    for (const regency of JAMBI_REGENCY_NAMES) {
        const items = await fetchKemendikdasmenRegency(regency);
        console.log(`    [Kemendikdasmen] ${regency}: ${items.length} sekolah.`);

        items.forEach(item => {
            const rawName = item.nama || item.nama_sekolah || '';
            const npsn = item.npsn || null;
            const status = item.status_Sekolah || item.status_sekolah || (rawName.toUpperCase().includes('NEGERI') ? 'Negeri' : 'Swasta');
            const jenjangRaw = (item.jenjang || '').toUpperCase();

            let category = 'Sekolah';
            let jenjang = 'Lainnya';

            if (jenjangRaw.includes('TK') || jenjangRaw.includes('PAUD') || rawName.toUpperCase().includes('TK ') || rawName.toUpperCase().includes('TAMAN KANAK')) {
                category = 'TK';
                jenjang = 'TK / PAUD';
            } else if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI')) {
                category = 'SD';
                jenjang = 'Sekolah Dasar';
            } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS')) {
                category = 'SMP';
                jenjang = 'Sekolah Menengah Pertama';
            } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('SMK') || jenjangRaw.includes('MA')) {
                category = 'SMA/SMK';
                jenjang = 'Sekolah Menengah Atas / Kejuruan';
            }

            allSchools.push({
                id: `dapo_${npsn || Math.floor(Math.random()*1000000)}`,
                npsn: npsn,
                name: rawName,
                category: category,
                jenjang: jenjang,
                type: status,
                regency: regency.replace('Kab. ', '').replace('Kota ', ''),
                district: item.kecamatan || '',
                address: item.alamat || item.alamat_jalan || '',
                lat: null, // to be matched with OSM spatial coords or bounding polygon
                lon: null,
                source: 'dapo.kemendikdasmen.go.id'
            });
        });
    }

    console.log(`--> Total official schools harvested from dapo.kemendikdasmen.go.id: ${allSchools.length}`);
    return allSchools;
}

module.exports = { scrapeKemendikbudSchools };
