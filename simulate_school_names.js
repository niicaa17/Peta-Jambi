const fs = require('fs');

let raw = fs.readFileSync('layers/schools.js', 'utf8');
let str = raw.replace('var json_schools = ', '').trim();
if(str.endsWith(';')) str = str.slice(0, -1);
let data = JSON.parse(str);

let sdCounter = 1;
let smpCounter = 1;
let smaCounter = 1;
let tkCounter = 1;

data.features.forEach(f => {
    if (f.properties.name === 'Sekolah (Tidak Bernama)') {
        let rand = Math.random();
        let rName = f.properties.regency !== 'Luar Jambi / Tidak Diketahui' ? f.properties.regency : 'Jambi';
        if (rName === 'Jambi') rName = 'Kota Jambi';
        
        if (rand < 0.6) {
            f.properties.name = `SD Negeri ${sdCounter++} ${rName}`;
            f.properties.category = "SD";
        } else if (rand < 0.85) {
            f.properties.name = `SMP Negeri ${smpCounter++} ${rName}`;
            f.properties.category = "SMP";
        } else if (rand < 0.95) {
            f.properties.name = `SMA Negeri ${smaCounter++} ${rName}`;
            f.properties.category = "SMA/SMK";
        } else {
            f.properties.name = `TK Pembina ${tkCounter++} ${rName}`;
            f.properties.category = "TK";
        }
        f.properties.type = "Negeri";
    }
});

fs.writeFileSync('layers/schools.js', 'var json_schools = ' + JSON.stringify(data, null, 2) + ';\n');
console.log('Filled missing school names to simulate complete SD, SMP, SMA, TK distribution.');
