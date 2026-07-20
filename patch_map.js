const fs = require('fs');

let js = fs.readFileSync('resources/map.js', 'utf8');

// We need to inject globalSearchData initialization
if (!js.includes('let globalSearchData = [];')) {
    js = js.replace('// Universities Loader', 'let globalSearchData = [];\n\n    // Universities Loader');
}

// We need to modify each pointToLayer to store layerRef and clusterRef, and push to globalSearchData
function patchLoader(loaderName, clusterName, catName) {
    let searchStr = `                return marker;\n            }\n        }).addTo(${clusterName});`;
    if (js.includes(searchStr)) {
        let replacement = `                
                // Add to search index
                globalSearchData.push({
                    name: feature.properties.name,
                    aliases: feature.properties.aliases || [],
                    category: '${catName}',
                    layer: marker,
                    cluster: ${clusterName}
                });
                return marker;
            }
        }).addTo(${clusterName});`;
        js = js.replace(searchStr, replacement);
    }
}

patchLoader('Universities Loader', 'universityCluster', 'Perguruan Tinggi');
patchLoader('Hospitals Loader', 'hospitalCluster', 'Rumah Sakit');
patchLoader('Schools Loader', 'schoolCluster', 'Sekolah');
patchLoader('Mosques Loader', 'mosqueCluster', 'Masjid');
patchLoader('Police Loader', 'policeCluster', 'Kantor Polisi');
patchLoader('Tourism Loader', 'tourismCluster', 'Objek Wisata');

// Now inject the search UI logic at the end of the DOMContentLoaded block
let searchLogic = `
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
                        li.innerHTML = \`<span class="search-result-name">\${match.name}</span>
                                        <span class="search-result-cat">\${match.category}</span>\`;
                        li.addEventListener('click', () => {
                            // Close search
                            searchResultsContainer.classList.add('hidden');
                            searchInput.value = match.name;
                            
                            // Fly to location
                            if (match.cluster && match.cluster.zoomToShowLayer) {
                                match.cluster.zoomToShowLayer(match.layer, () => {
                                    match.layer.openPopup();
                                });
                            } else {
                                map.setView(match.layer.getLatLng(), 17);
                                match.layer.openPopup();
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
`;

// Insert search logic right before the end of the DOMContentLoaded block
let lastBrace = js.lastIndexOf('});');
js = js.substring(0, lastBrace) + searchLogic + '\\n' + js.substring(lastBrace);

fs.writeFileSync('resources/map.js', js);
console.log('map.js patched for global search');
