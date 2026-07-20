document.addEventListener('DOMContentLoaded', function () {
    // 1. Map Initialization
    // Centered on Jambi Province [-1.6115, 102.8] with zoom level 8
    const map = L.map('map', {
        zoomControl: false // Move zoom control to top-right
    }).setView([-1.6115, 102.8], 8);

    // Expose map to global scope for dashboard panel toggle
    window.map = map;

    L.control.zoom({ position: 'topright' }).addTo(map);

    // 2. Base Layers definition
    const baseLayers = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }),
        "CartoDB Dark Matter": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '© OpenStreetMap contributors, © CartoDB'
        }),
        "Satellite View": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
            maxZoom: 18,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        })
    };

    // Set Default Base Map
    baseLayers["OpenStreetMap"].addTo(map);
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

    // 3. Variables for Layer Group Control
    let provinceLayer;
    let regencyLayer;
    let universityCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<div class="marker-cluster marker-cluster-medium"><div>' + cluster.getChildCount() + '</div></div>',
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });
    
    let schoolCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<div class="marker-cluster marker-cluster-small"><div>' + cluster.getChildCount() + '</div></div>',
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    let hospitalCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<div class="marker-cluster marker-cluster-large"><div>' + cluster.getChildCount() + '</div></div>',
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    let mosqueCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<div class="marker-cluster marker-cluster-mosque"><div>' + cluster.getChildCount() + '</div></div>',
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    let policeCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<div class="marker-cluster marker-cluster-police"><div>' + cluster.getChildCount() + '</div></div>',
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    let tourismCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<div class="marker-cluster marker-cluster-tourism"><div>' + cluster.getChildCount() + '</div></div>',
                className: 'custom-cluster-icon',
                iconSize: L.point(40, 40)
            });
        }
    });

    // Temporary layers for penelusuran (Kecamatan and Desa)
    let kecaLayerGroup = L.layerGroup().addTo(map);
    let desaLayerGroup = L.layerGroup().addTo(map);
    let regencyMarkers = L.layerGroup().addTo(map);

    // BPS Population density styling limits (Jiwa / km2)
    // 0-45, 45-60, 60-75, 75-100, 100-300, 300+
    function getDensityColor(d) {
        return d > 300  ? '#b10026' : // Sangat Padat - Dark Red
               d > 100  ? '#e31a1c' : // Padat - Red
               d > 75   ? '#fc4e2a' : // Sedang-Padat - Orange-Red
               d > 60   ? '#fd8d3c' : // Sedang - Orange
               d > 45   ? '#feb24c' : // Rendah-Sedang - Light Orange
                          '#ffffb2' ;  // Rendah - Pale Yellow
    }

    function regencyStyle(feature) {
        return {
            fillColor: getDensityColor(feature.properties.density),
            weight: 2,
            opacity: 1,
            color: '#555',
            dashArray: '',
            fillOpacity: 0.55
        };
    }

    function highlightRegency(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#333',
            dashArray: '',
            fillOpacity: 0.75
        });
        layer.bringToFront();
    }

    function resetRegency(e) {
        regencyLayer.resetStyle(e.target);
    }

    function onEachRegencyFeature(feature, layer) {
        // Hover effects
        layer.on({
            mouseover: highlightRegency,
            mouseout: resetRegency,
            click: function (e) {
                map.fitBounds(layer.getBounds());
                // Sync select dropdown
                const regencySelect = document.getElementById('select-regency');
                regencySelect.value = feature.properties.regency_key;
                triggerRegencyChange(feature.properties.regency_key);
            }
        });

        // Popup definition
        let popupContent = `
            <div class="info-box">
                <h4>${feature.properties.name_clean}</h4>
                <p><strong>BPS Kode:</strong> ${feature.properties.ID_2 || '15'}</p>
                <p><strong>Total Penduduk:</strong> ${feature.properties.population.toLocaleString('id-ID')} Jiwa</p>
                <p><strong>Luas Wilayah:</strong> ${feature.properties.area_sqkm.toLocaleString('id-ID')} km²</p>
                <p><strong>Kepadatan Penduduk:</strong> ${feature.properties.density.toLocaleString('id-ID')} jiwa/km²</p>
        `;

        if (feature.properties.is_split) {
            popupContent += `
                <hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 8px 0;">
                <p style="font-size: 11px; color: var(--text-muted);"><strong>Pembagian Administratif Rinci:</strong></p>
                <p style="font-size: 11px;">• Kabupaten Kerinci: ${feature.properties.kerinci_pop.toLocaleString('id-ID')} Jiwa (${feature.properties.kerinci_area} km²)</p>
                <p style="font-size: 11px;">• Kota Sungai Penuh: ${feature.properties.sungaipenuh_pop.toLocaleString('id-ID')} Jiwa (${feature.properties.sungaipenuh_area} km²)</p>
            `;
        }

        popupContent += `</div>`;
        layer.bindPopup(popupContent);
    }

    // Custom pins generator helper
    function createPin(iconClass, color) {
        return L.divIcon({
            html: `<div class="marker-pin" style="background-color: ${color}"><i class="${iconClass}"></i></div>`,
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -30]
        });
    }

    const uniIcon = createPin('fa-solid fa-graduation-cap', '#f59e0b');
    const schoolIcon = createPin('fa-solid fa-school', '#10b981');
    const hospitalIcon = createPin('fa-solid fa-hospital', '#ef4444');
    const regencyIcon = createPin('fa-solid fa-building-columns', '#6366f1');
    const districtIcon = createPin('fa-solid fa-landmark', '#3b82f6');
    const villageIcon = createPin('fa-solid fa-house', '#eab308');
    const mosqueIcon = createPin('fa-solid fa-mosque', '#0d9488');
    const policeIcon = createPin('fa-solid fa-shield-halved', '#475569');
    const tourismIcon = createPin('fa-solid fa-camera-retro', '#db2777');

    // 4. Render Offline Boundary and POI Layers (Using global variables directly, bypassing CORS)
    
    // Load Jambi Province Outer Boundary
    if (typeof json_jambi_province !== 'undefined') {
        provinceLayer = L.geoJSON(json_jambi_province, {
            style: {
                color: '#333',
                weight: 3,
                opacity: 1,
                fillColor: 'transparent',
                fillOpacity: 0
            },
            interactive: false
        }).addTo(map);
    }

    // Load Jambi Regencies (Kabupaten) Boundary
    if (typeof json_jambi_regencies !== 'undefined') {
        regencyLayer = L.geoJSON(json_jambi_regencies, {
            style: regencyStyle,
            onEachFeature: function(feature, layer) {
                onEachRegencyFeature(feature, layer);
                
                // Add marker symbol at centroid
                const center = layer.getBounds().getCenter();
                const marker = L.marker(center, { icon: regencyIcon });
                marker.bindPopup(layer.getPopup());
                marker.on('click', function() {
                    map.fitBounds(layer.getBounds());
                    const regencySelect = document.getElementById('select-regency');
                    regencySelect.value = feature.properties.regency_key;
                    triggerRegencyChange(feature.properties.regency_key);
                });
                regencyMarkers.addLayer(marker);
            }
        }).addTo(map);
        
        // Generate custom legend on map
        generateLegend();
    }

    let globalSearchData = [];


    function createPopupContent(feature, categoryLabel) {
        let typeStr = feature.properties.type ? ` (${feature.properties.type})` : '';
        return `
            <div class="info-box">
                <h4>${feature.properties.name}</h4>
                <p><strong>Kategori:</strong> ${categoryLabel}${typeStr}</p>
                <p><strong>Kabupaten/Kota:</strong> ${feature.properties.regency || 'Tidak Diketahui'}</p>
                ${feature.properties.address ? `<p><strong>Alamat:</strong> ${feature.properties.address}</p>` : ''}
                ${feature.properties.website ? `<p><strong>Website:</strong> <a href="${feature.properties.website}" target="_blank">${feature.properties.website}</a></p>` : ''}
                ${feature.properties.accreditation ? `<p><strong>Akreditasi:</strong> ${feature.properties.accreditation}</p>` : ''}
                <p><strong>Koordinat:</strong> ${feature.properties.coordinates_str}</p>
            </div>
        `;
    }

    // Universities Loader
    let universitiesData = [];
    if (typeof json_universities !== 'undefined') {
        universitiesData = json_universities.features;
        L.geoJSON(json_universities, {
            pointToLayer: function (feature, latlng) {
                const marker = L.marker(latlng, { icon: uniIcon });
                marker.bindPopup(createPopupContent(feature, 'Perguruan Tinggi'));
                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: 'Perguruan Tinggi',
                    layer: marker,
                    cluster: universityCluster
                });
                return marker;
            }
        }).addTo(universityCluster);
        universityCluster.addTo(map);
    }

    // Hospitals Loader
    let hospitalsData = [];
    if (typeof json_hospitals !== 'undefined') {
        hospitalsData = json_hospitals.features;
        L.geoJSON(json_hospitals, {
            pointToLayer: function (feature, latlng) {
                const marker = L.marker(latlng, { icon: hospitalIcon });
                marker.bindPopup(createPopupContent(feature, 'Rumah Sakit'));
                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: 'Rumah Sakit',
                    layer: marker,
                    cluster: hospitalCluster
                });
                return marker;
            }
        }).addTo(hospitalCluster);
        hospitalCluster.addTo(map);
    }

    // Schools Loader
    let schoolsData = [];
    if (typeof json_schools !== 'undefined') {
        schoolsData = json_schools.features;
        L.geoJSON(json_schools, {
            pointToLayer: function (feature, latlng) {
                let cat = feature.properties.category || '';
                let color = '#4CAF50'; // Default green
                let iconClass = 'fa-school';
                
                if (cat === 'SD') { color = '#F44336'; } // Red
                else if (cat === 'SMP') { color = '#2196F3'; } // Blue
                else if (cat.includes('SMA') || cat.includes('SMK')) { color = '#9E9E9E'; } // Grey
                else if (cat === 'TK') { color = '#E91E63'; iconClass = 'fa-child-reaching'; } // Pink
                
                const marker = L.marker(latlng, { icon: createPin(iconClass, color) });
                marker.bindPopup(createPopupContent(feature, cat || 'Sekolah'));
                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: 'Sekolah',
                    layer: marker,
                    cluster: schoolCluster
                });
                return marker;
            }
        }).addTo(schoolCluster);
        schoolCluster.addTo(map);
    }

    // Mosques Loader
    let mosquesData = [];
    if (typeof json_mosques !== 'undefined') {
        mosquesData = json_mosques.features;
        L.geoJSON(json_mosques, {
            pointToLayer: function (feature, latlng) {
                const marker = L.marker(latlng, { icon: mosqueIcon });
                marker.bindPopup(createPopupContent(feature, 'Masjid'));
                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: 'Masjid',
                    layer: marker,
                    cluster: mosqueCluster
                });
                return marker;
            }
        }).addTo(mosqueCluster);
        mosqueCluster.addTo(map);
    }

    // Police Stations Loader
    let policeData = [];
    if (typeof json_police !== 'undefined') {
        policeData = json_police.features;
        L.geoJSON(json_police, {
            pointToLayer: function (feature, latlng) {
                const marker = L.marker(latlng, { icon: policeIcon });
                marker.bindPopup(createPopupContent(feature, 'Kantor Polisi'));
                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: 'Kantor Polisi',
                    layer: marker,
                    cluster: policeCluster
                });
                return marker;
            }
        }).addTo(policeCluster);
        policeCluster.addTo(map);
    }

    // Tourism / Objek Wisata Loader
    let tourismData = [];
    if (typeof json_tourism !== 'undefined') {
        tourismData = json_tourism.features;
        L.geoJSON(json_tourism, {
            pointToLayer: function (feature, latlng) {
                const marker = L.marker(latlng, { icon: tourismIcon });
                marker.bindPopup(createPopupContent(feature, 'Objek Wisata'));
                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: 'Objek Wisata',
                    layer: marker,
                    cluster: tourismCluster
                });
                return marker;
            }
        }).addTo(tourismCluster);
        tourismCluster.addTo(map);
    }

    // 5. Toggle switch event listeners
    document.getElementById('toggle-uni').addEventListener('change', function (e) {
        if (e.target.checked) map.addLayer(universityCluster);
        else map.removeLayer(universityCluster);
    });

    document.getElementById('toggle-schools').addEventListener('change', function (e) {
        if (e.target.checked) map.addLayer(schoolCluster);
        else map.removeLayer(schoolCluster);
    });

    document.getElementById('toggle-hospitals').addEventListener('change', function (e) {
        if (e.target.checked) map.addLayer(hospitalCluster);
        else map.removeLayer(hospitalCluster);
    });

    document.getElementById('toggle-mosques').addEventListener('change', function (e) {
        if (e.target.checked) map.addLayer(mosqueCluster);
        else map.removeLayer(mosqueCluster);
    });

    document.getElementById('toggle-police').addEventListener('change', function (e) {
        if (e.target.checked) map.addLayer(policeCluster);
        else map.removeLayer(policeCluster);
    });

    document.getElementById('toggle-tourism').addEventListener('change', function (e) {
        if (e.target.checked) map.addLayer(tourismCluster);
        else map.removeLayer(tourismCluster);
    });

    document.getElementById('toggle-boundary').addEventListener('change', function (e) {
        if (e.target.checked) {
            map.addLayer(regencyLayer);
            map.addLayer(regencyMarkers);
        } else {
            map.removeLayer(regencyLayer);
            map.removeLayer(regencyMarkers);
        }
    });

    // 6. Region Browser & Hierarchical Select Navigation
    let regionalHierarchy = {};
    const regencySelect = document.getElementById('select-regency');
    const districtSelect = document.getElementById('select-district');
    const villageSelect = document.getElementById('select-village');

    // Populate Kecamatan & Desa Hierarchy directly from the loaded variable
    if (typeof json_districts_and_villages !== 'undefined') {
        regionalHierarchy = json_districts_and_villages;
        // Populate regency dropdown list
        Object.keys(json_districts_and_villages).sort().forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = json_districts_and_villages[key].name;
            regencySelect.appendChild(opt);
        });
    }

    function triggerRegencyChange(regencyKey) {
        districtSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
        villageSelect.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
        villageSelect.disabled = true;
        
        kecaLayerGroup.clearLayers();
        desaLayerGroup.clearLayers();

        if (!regencyKey || !regionalHierarchy[regencyKey]) {
            districtSelect.disabled = true;
            return;
        }

        districtSelect.disabled = false;
        const regData = regionalHierarchy[regencyKey];

        // Populate Kecamatan dropdown
        const districtsList = Object.keys(regData.districts).sort();
        districtsList.forEach(kName => {
            const opt = document.createElement('option');
            opt.value = kName;
            opt.textContent = regData.districts[kName].name;
            districtSelect.appendChild(opt);

            // Draw Kecamatan centroid markers on the map
            const distInfo = regData.districts[kName];
            const distMarker = L.marker([distInfo.lat, distInfo.lon], { icon: districtIcon })
                .bindTooltip(`
                    <strong>Kecamatan ${kName}</strong><br>
                    Penduduk: ${distInfo.population.toLocaleString('id-ID')} Jiwa<br>
                    Koord: ${distInfo.lat.toFixed(5)}, ${distInfo.lon.toFixed(5)}
                `, { direction: 'top', offset: [0, -30] });
            
            kecaLayerGroup.addLayer(distMarker);
        });
    }

    regencySelect.addEventListener('change', function (e) {
        const val = e.target.value;
        triggerRegencyChange(val);

        if (val && regencyLayer) {
            // Find matched feature boundary in geojson and zoom in
            regencyLayer.eachLayer(layer => {
                if (layer.feature.properties.regency_key === val) {
                    map.fitBounds(layer.getBounds());
                    layer.openPopup();
                }
            });
        }
    });

    districtSelect.addEventListener('change', function (e) {
        const rVal = regencySelect.value;
        const dVal = e.target.value;
        
        villageSelect.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
        desaLayerGroup.clearLayers();

        if (!dVal || !regionalHierarchy[rVal] || !regionalHierarchy[rVal].districts[dVal]) {
            villageSelect.disabled = true;
            return;
        }

        villageSelect.disabled = false;
        const distData = regionalHierarchy[rVal].districts[dVal];

        // Focus map to Kecamatan center
        map.setView([distData.lat, distData.lon], 11);

        // Populate Desa dropdown
        const villagesList = distData.villages;
        villagesList.forEach((village, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = village.name;
            villageSelect.appendChild(opt);

            // Draw Desa centroid marker on map
            const desaMarker = L.marker([village.lat, village.lon], { icon: villageIcon })
                .bindTooltip(`
                    <strong>${village.name}</strong><br>
                    Kecamatan: ${dVal}<br>
                    Penduduk: ${village.population.toLocaleString('id-ID')} Jiwa<br>
                    Koord: ${village.lat.toFixed(5)}, ${village.lon.toFixed(5)}
                `, { direction: 'top', offset: [0, -30] });

            desaLayerGroup.addLayer(desaMarker);
        });
    });

    villageSelect.addEventListener('change', function (e) {
        const rVal = regencySelect.value;
        const dVal = districtSelect.value;
        const idx = e.target.value;

        if (idx === "") return;

        const village = regionalHierarchy[rVal].districts[dVal].villages[idx];
        
        // Zoom closely to Desa centroid
        map.setView([village.lat, village.lon], 14);

        // Open custom popup on map
        L.popup()
            .setLatLng([village.lat, village.lon])
            .setContent(`
                <div class="info-box">
                    <h4>${village.name}</h4>
                    <p><strong>Tingkat:</strong> Desa / Kelurahan</p>
                    <p><strong>Kecamatan:</strong> ${dVal}</p>
                    <p><strong>Kabupaten/Kota:</strong> ${regionalHierarchy[rVal].name}</p>
                    <p><strong>Jumlah Penduduk:</strong> ${village.population.toLocaleString('id-ID')} Jiwa</p>
                    <p><strong>Koordinat:</strong> ${village.lat.toFixed(5)}, ${village.lon.toFixed(5)}</p>
                </div>
            `)
            .openOn(map);
    });

    // 7. Spatial Analysis Tools
    let activeTool = null; // 'nearest' or 'measure'
    let measurePoints = [];
    let measureLines = L.layerGroup().addTo(map);
    let analysisLines = L.layerGroup().addTo(map);

    const btnNearest = document.getElementById('btn-nearest');
    const btnMeasure = document.getElementById('btn-measure');
    const instPanel = document.getElementById('analysis-instruction');
    const detailsPanel = document.getElementById('analysis-details');

    function resetAnalysis() {
        measurePoints.forEach(p => map.removeLayer(p));
        measurePoints = [];
        measureLines.clearLayers();
        analysisLines.clearLayers();
        detailsPanel.style.display = 'none';
        instPanel.style.display = 'block';
        document.getElementById('map').classList.remove('map-tool-active');
        instPanel.innerHTML = "Pilih alat analisis di atas untuk memulai.";
    }

    btnNearest.addEventListener('click', function () {
        resetAnalysis();
        if (activeTool === 'nearest') {
            activeTool = null;
            btnNearest.classList.remove('active');
        } else {
            activeTool = 'nearest';
            btnNearest.classList.add('active');
            btnMeasure.classList.remove('active');
            document.getElementById('map').classList.add('map-tool-active');
            instPanel.innerHTML = "<div class='pulse-text'><i class='fa-solid fa-hand-pointer'></i> <b>SEKARANG KLIK DI PETA</b><br><span style='color:var(--text-muted); font-size:11px; font-weight:normal;'>Klik lokasi mana saja di peta untuk mencari fasilitas terdekat.</span></div>";
        }
    });

    btnMeasure.addEventListener('click', function () {
        resetAnalysis();
        if (activeTool === 'measure') {
            activeTool = null;
            btnMeasure.classList.remove('active');
        } else {
            activeTool = 'measure';
            btnMeasure.classList.add('active');
            btnNearest.classList.remove('active');
            document.getElementById('map').classList.add('map-tool-active');
            instPanel.innerHTML = "<div class='pulse-text'><i class='fa-solid fa-hand-pointer'></i> <b>SEKARANG KLIK DI PETA</b><br><span style='color:var(--text-muted); font-size:11px; font-weight:normal;'>Klik 2 titik berbeda di peta untuk mengukur jarak.</span></div>";
        }
    });

    // Map Click Handler for Spatial Tools
    map.on('click', function (e) {
        if (!activeTool) return;

        const clickLatLng = e.latlng;

        if (activeTool === 'nearest') {
            performNearestFacilitySearch(clickLatLng);
        } else if (activeTool === 'measure') {
            performDistanceMeasurement(clickLatLng);
        }
    });

    // Nearest Facility Algorithm (Spasial Haversine Distance)
    function performNearestFacilitySearch(clickLatLng) {
        analysisLines.clearLayers();
        
        let nearestUni = null, minUniDist = Infinity;
        let nearestSchool = null, minSchoolDist = Infinity;
        let nearestHosp = null, minHospDist = Infinity;

        // 1. Loop Universities
        universitiesData.forEach(feat => {
            const coords = feat.geometry.coordinates;
            const featLatLng = L.latLng(coords[1], coords[0]);
            const dist = clickLatLng.distanceTo(featLatLng) / 1000; // in km
            if (dist < minUniDist) {
                minUniDist = dist;
                nearestUni = { name: feat.properties.name, latlng: featLatLng, coords_str: feat.properties.coordinates_str };
            }
        });

        // 2. Loop Schools
        schoolsData.forEach(feat => {
            const coords = feat.geometry.coordinates;
            const featLatLng = L.latLng(coords[1], coords[0]);
            const dist = clickLatLng.distanceTo(featLatLng) / 1000; // in km
            if (dist < minSchoolDist) {
                minSchoolDist = dist;
                nearestSchool = { name: feat.properties.name, latlng: featLatLng, coords_str: feat.properties.coordinates_str };
            }
        });

        // 3. Loop Hospitals
        hospitalsData.forEach(feat => {
            const coords = feat.geometry.coordinates;
            const featLatLng = L.latLng(coords[1], coords[0]);
            const dist = clickLatLng.distanceTo(featLatLng) / 1000; // in km
            if (dist < minHospDist) {
                minHospDist = dist;
                nearestHosp = { name: feat.properties.name, latlng: featLatLng, coords_str: feat.properties.coordinates_str };
            }
        });

        // Draw temporary pin at click location
        const clickMarker = L.circleMarker(clickLatLng, {
            radius: 8,
            fillColor: '#6366f1',
            color: '#fff',
            weight: 2,
            fillOpacity: 1
        }).addTo(analysisLines);

        let detailsHtml = `
            <div style="font-weight: 600; margin-bottom: 8px; font-family: 'Outfit'; font-size: 13px; color: var(--accent-indigo);">
                <i class="fa-solid fa-location-dot"></i> Koordinat Klik:<br>
                <span style="font-weight: normal; color: var(--text-muted); font-size: 11px;">${clickLatLng.lat.toFixed(5)}, ${clickLatLng.lng.toFixed(5)}</span>
            </div>
            <hr style="border:0; border-top: 1px solid var(--glass-border); margin: 8px 0;">
        `;

        // Draw dashed lines and append outputs
        if (nearestUni) {
            L.polyline([clickLatLng, nearestUni.latlng], { color: '#f59e0b', weight: 2, dashArray: '5, 8' }).addTo(analysisLines);
            detailsHtml += `
                <p style="margin-bottom: 6px;">
                    <strong style="color: #f59e0b;"><i class="fa-solid fa-graduation-cap"></i> PT Terdekat:</strong><br>
                    ${nearestUni.name}<br>
                    <span style="color: var(--text-muted); font-size: 11px;">Jarak: <strong>${minUniDist.toFixed(2)} km</strong><br>
                    Koord: ${nearestUni.coords_str}</span>
                </p>
            `;
        }

        if (nearestSchool) {
            L.polyline([clickLatLng, nearestSchool.latlng], { color: '#10b981', weight: 2, dashArray: '5, 8' }).addTo(analysisLines);
            detailsHtml += `
                <p style="margin-bottom: 6px;">
                    <strong style="color: #10b981;"><i class="fa-solid fa-school"></i> Sekolah Terdekat:</strong><br>
                    ${nearestSchool.name}<br>
                    <span style="color: var(--text-muted); font-size: 11px;">Jarak: <strong>${minSchoolDist.toFixed(2)} km</strong><br>
                    Koord: ${nearestSchool.coords_str}</span>
                </p>
            `;
        }

        if (nearestHosp) {
            L.polyline([clickLatLng, nearestHosp.latlng], { color: '#ef4444', weight: 2, dashArray: '5, 8' }).addTo(analysisLines);
            detailsHtml += `
                <p style="margin-bottom: 0px;">
                    <strong style="color: #ef4444;"><i class="fa-solid fa-hospital"></i> RS Terdekat:</strong><br>
                    ${nearestHosp.name}<br>
                    <span style="color: var(--text-muted); font-size: 11px;">Jarak: <strong>${minHospDist.toFixed(2)} km</strong><br>
                    Koord: ${nearestHosp.coords_str}</span>
                </p>
            `;
        }

        instPanel.style.display = 'none';
        detailsPanel.innerHTML = detailsHtml;
        detailsPanel.style.display = 'block';
    }

    // Distance Measurement Logic
    function performDistanceMeasurement(clickLatLng) {
        if (measurePoints.length >= 2) {
            // Reset if already has two points
            resetAnalysis();
            activeTool = 'measure';
            btnMeasure.classList.add('active');
            document.getElementById('map').classList.add('map-tool-active');
            instPanel.innerHTML = "<div class='pulse-text'><i class='fa-solid fa-hand-pointer'></i> <b>SEKARANG KLIK DI PETA</b><br><span style='color:var(--text-muted); font-size:11px; font-weight:normal;'>Klik 2 titik berbeda di peta untuk mengukur jarak.</span></div>";
        }

        const pointMarker = L.marker(clickLatLng, {
            icon: L.divIcon({
                html: `<div class="marker-pin" style="background-color: var(--accent-indigo)"><i class="fa-solid fa-flag"></i></div>`,
                className: 'custom-div-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            })
        }).addTo(map);

        measurePoints.push(pointMarker);

        if (measurePoints.length === 1) {
            detailsPanel.innerHTML = `
                <p><strong>Titik A (Mulai) ditandai.</strong></p>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Koord: ${clickLatLng.lat.toFixed(5)}, ${clickLatLng.lng.toFixed(5)}<br>
                    Klik titik kedua untuk mengukur jarak.
                </p>
            `;
            detailsPanel.style.display = 'block';
            instPanel.style.display = 'none';
        } else if (measurePoints.length === 2) {
            const p1 = measurePoints[0].getLatLng();
            const p2 = measurePoints[1].getLatLng();
            
            // Calculate distance in km
            const distance = p1.distanceTo(p2) / 1000;

            // Draw line
            L.polyline([p1, p2], { color: 'var(--accent-indigo)', weight: 3 }).addTo(measureLines);

            // Display stats in panel
            detailsPanel.innerHTML = `
                <div style="font-weight: 600; font-family: 'Outfit'; font-size: 13px; color: var(--accent-indigo); margin-bottom: 8px;">
                    <i class="fa-solid fa-ruler"></i> Hasil Pengukuran Jarak:
                </div>
                <p><strong>Jarak:</strong> <span style="font-size: 16px; color:#fff;">${distance.toFixed(3)} km</span></p>
                <hr style="border:0; border-top: 1px solid var(--glass-border); margin: 8px 0;">
                <p style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
                    • A: ${p1.lat.toFixed(5)}, ${p1.lng.toFixed(5)}<br>
                    • B: ${p2.lat.toFixed(5)}, ${p2.lng.toFixed(5)}
                </p>
                <button id="btn-reset-measure" class="btn" style="margin-top: 10px; width: 100%; font-size: 11px; padding: 6px;"><i class="fa-solid fa-trash"></i> Hapus Garis</button>
            `;
            
            document.getElementById('btn-reset-measure').addEventListener('click', function() {
                resetAnalysis();
                activeTool = 'measure';
                btnMeasure.classList.add('active');
                document.getElementById('map').classList.add('map-tool-active');
                instPanel.innerHTML = "<div class='pulse-text'><i class='fa-solid fa-hand-pointer'></i> <b>SEKARANG KLIK DI PETA</b><br><span style='color:var(--text-muted); font-size:11px; font-weight:normal;'>Klik 2 titik berbeda di peta untuk mengukur jarak.</span></div>";
            });
        }
    }

    // 8. Choropleth Map Legend Control
    function generateLegend() {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend');
            const grades = [0, 45, 60, 75, 100, 300];
            
            div.innerHTML = '<h4>Kepadatan Penduduk</h4>';
            
            for (let i = 0; i < grades.length; i++) {
                const color = getDensityColor(grades[i] + 1);
                const label = grades[i + 1] ? `${grades[i]} &ndash; ${grades[i + 1]}` : `&gt; ${grades[i]}`;
                div.innerHTML += `
                    <div class="legend-item">
                        <i style="background: ${color}"></i> 
                        <span>${label} jiwa/km²</span>
                    </div>
                `;
            }
            return div;
        };
        legend.addTo(map);
    }

    // ============================================================
    // GLOBAL SEARCH FEATURE
    // ============================================================
    const searchInput = document.getElementById('global-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsList = document.getElementById('search-results-list');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            searchResultsList.innerHTML = '';
            
            if (query.length > 0) {
                clearSearchBtn.classList.remove('hidden');
                
                // Filter data
                const matches = globalSearchData.filter(item => {
                    if (item.name.toLowerCase().includes(query)) return true;
                    if (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(query))) return true;
                    return false;
                }).slice(0, 10); // Limit to 10 results
                
                if (matches.length > 0) {
                    searchResultsContainer.classList.remove('hidden');
                    matches.forEach(match => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span class="search-result-name">${match.name}</span>
                                        <span class="search-result-cat">${match.category}</span>`;
                        li.addEventListener('click', () => {
                            // Close search
                            searchResultsContainer.classList.add('hidden');
                            searchInput.value = match.name;
                            
                            // Fly to location
                            if (match.cluster) {
                                // Ensure layer is checked
                                if (!map.hasLayer(match.cluster)) {
                                    map.addLayer(match.cluster);
                                    let cbox;
                                    if(match.category === 'Perguruan Tinggi') cbox = document.getElementById('toggle-uni');
                                    else if(match.category === 'Sekolah') cbox = document.getElementById('toggle-schools');
                                    else if(match.category === 'Rumah Sakit') cbox = document.getElementById('toggle-hospitals');
                                    else if(match.category === 'Masjid') cbox = document.getElementById('toggle-mosques');
                                    else if(match.category === 'Kantor Polisi') cbox = document.getElementById('toggle-police');
                                    else if(match.category === 'Objek Wisata') cbox = document.getElementById('toggle-tourism');
                                    if(cbox) cbox.checked = true;
                                }
                                
                                if (match.cluster.zoomToShowLayer) {
                                    match.cluster.zoomToShowLayer(match.layer, () => {
                                        match.layer.openPopup();
                                    });
                                } else {
                                    map.flyTo(match.layer.getLatLng(), 17, {duration: 1.5});
                                    setTimeout(() => match.layer.openPopup(), 1500);
                                }
                            } else {
                                map.flyTo(match.layer.getLatLng(), 17, {duration: 1.5});
                                setTimeout(() => match.layer.openPopup(), 1500);
                            }
                        });
                        searchResultsList.appendChild(li);
                    });
                } else {
                    searchResultsContainer.classList.remove('hidden');
                    searchResultsList.innerHTML = '<li style="color:#94a3b8; cursor:default;">Tidak ditemukan</li>';
                }
            } else {
                clearSearchBtn.classList.add('hidden');
                searchResultsContainer.classList.add('hidden');
            }
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            searchResultsContainer.classList.add('hidden');
            searchInput.focus();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResultsContainer.classList.add('hidden');
            }
        });
    }
});
