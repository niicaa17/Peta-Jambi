const fs = require('fs');

function filterFile(filename, varName) {
    if (!fs.existsSync(filename)) return;
    let raw = fs.readFileSync(filename, 'utf8');
    let str = raw.replace(`var ${varName} = `, '').trim();
    if(str.endsWith(';')) str = str.slice(0, -1);
    
    let data;
    try {
        data = JSON.parse(str);
    } catch(e) {
        return;
    }
    
    let originalCount = data.features.length;
    
    data.features = data.features.filter(f => {
        let r = f.properties.regency;
        return r && r !== 'Luar Jambi / Tidak Diketahui';
    });
    
    let newCount = data.features.length;
    if (originalCount !== newCount) {
        fs.writeFileSync(filename, `var ${varName} = ${JSON.stringify(data, null, 2)};\n`);
        console.log(`Filtered ${filename}: ${originalCount} -> ${newCount}`);
    } else {
        console.log(`${filename} unchanged.`);
    }
}

filterFile('layers/schools.js', 'json_schools');
filterFile('layers/universities.js', 'json_universities');
// Other layers like hospitals etc might not have regency tagged in this way, but they were curated manually mostly.
