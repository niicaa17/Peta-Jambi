const fs = require('fs');

let js = fs.readFileSync('resources/map.js', 'utf8');

const popupHelper = `
    function createPopupContent(feature, categoryLabel) {
        let typeStr = feature.properties.type ? \` (\${feature.properties.type})\` : '';
        return \`
            <div class="info-box">
                <h4>\${feature.properties.name}</h4>
                <p><strong>Kategori:</strong> \${categoryLabel}\${typeStr}</p>
                <p><strong>Kabupaten/Kota:</strong> \${feature.properties.regency || 'Tidak Diketahui'}</p>
                \${feature.properties.address ? \`<p><strong>Alamat:</strong> \${feature.properties.address}</p>\` : ''}
                \${feature.properties.website ? \`<p><strong>Website:</strong> <a href="\${feature.properties.website}" target="_blank">\${feature.properties.website}</a></p>\` : ''}
                \${feature.properties.accreditation ? \`<p><strong>Akreditasi:</strong> \${feature.properties.accreditation}</p>\` : ''}
                <p><strong>Koordinat:</strong> \${feature.properties.coordinates_str}</p>
            </div>
        \`;
    }

    // Universities Loader`;

if (!js.includes('function createPopupContent')) {
    js = js.replace('    // Universities Loader', popupHelper);
}

// Replace each bindPopup block by doing simple string replaces or a generic regex without escaped backticks
js = js.replace(/marker\.bindPopup\(\`[\s\S]*?<\/div>\s*\`\);/g, (match, offset, string) => {
    let cat = 'Fasilitas';
    let before = string.substring(offset-150, offset);
    if (before.includes('uniIcon')) cat = 'Perguruan Tinggi';
    else if (before.includes('schoolIcon')) cat = 'Sekolah';
    else if (before.includes('hospitalIcon')) cat = 'Rumah Sakit';
    else if (before.includes('mosqueIcon')) cat = 'Masjid';
    else if (before.includes('policeIcon')) cat = 'Kantor Polisi';
    else if (before.includes('tourismIcon')) cat = 'Objek Wisata';
    
    return `marker.bindPopup(createPopupContent(feature, '${cat}'));`;
});

fs.writeFileSync('resources/map.js', js);
console.log('Popups updated');
