document.addEventListener('DOMContentLoaded', () => {
    // Buat elemen Chatbot UI
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chatbot-container';

    chatContainer.innerHTML = `
        <button id="chatbot-toggle" class="chatbot-btn" title="Tanya Nisa AI Map Assistant">
            <i class="fa-solid fa-message"></i>
        </button>
        <div id="chatbot-window" class="chatbot-window hidden">
            <div class="chat-header">
                <div class="chat-title">
                    📍 NisaMap AI - Asisten Peta Jambi
                </div>
                <button id="chatbot-close" class="chat-close-btn"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="chat-messages" class="chat-messages">
                <div class="chat-bubble bot-bubble">
                    Halo! Saya <strong>Nisa</strong>, asisten AI WebGIS Provinsi Jambi. 😊<br>
                    Saya dapat membaca seluruh data peta seperti Perguruan Tinggi, Sekolah, Rumah Sakit, Objek Wisata, Kantor Polisi, dan data statistik 11 Kabupaten/Kota di Provinsi Jambi. Ada yang bisa Nisa bantu?
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Ketik pertanyaan seputar peta Jambi..." autocomplete="off">
                <button id="chat-send"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    document.body.appendChild(chatContainer);

    // Variabel & Element DOM
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const chatWindow = document.getElementById('chatbot-window');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    // API Key tidak disimpan di sini lagi, melainkan di server (Vite/Vercel)

    // Helper: Build dynamic context from map layers loaded in window/memory
    function getMapOverviewContext() {
        let summary = "=== DATA UTAMA MAPS PROVINSI JAMBI ===\n";
        summary += "Provinsi Jambi terdiri dari 11 Kabupaten/Kota dengan Total Penduduk: 3.724.140 Jiwa dan Luas Wilayah: 50.160,05 km².\n\n";

        // 1. Data Regency / Kabupaten & Kota
        if (typeof json_jambi_regencies !== 'undefined' && json_jambi_regencies.features) {
            summary += "Rincian Kabupaten/Kota:\n";
            json_jambi_regencies.features.forEach(f => {
                const p = f.properties;
                summary += `- ${p.name_clean}: Penduduk ${p.population ? p.population.toLocaleString('id-ID') : '-'} jiwa, Luas ${p.area_sqkm || '-'} km², Kepadatan ${p.density || '-'} jiwa/km²\n`;
            });
            summary += "\n";
        }

        // 2. Summary count per Layer Category
        if (typeof json_universities !== 'undefined' && json_universities.features) {
            summary += `Total Perguruan Tinggi di Peta: ${json_universities.features.length} institusi.\n`;
        }
        if (typeof json_hospitals !== 'undefined' && json_hospitals.features) {
            summary += `Total Rumah Sakit di Peta: ${json_hospitals.features.length} lokasi.\n`;
        }
        if (typeof json_tourism !== 'undefined' && json_tourism.features) {
            summary += `Total Objek Wisata di Peta: ${json_tourism.features.length} lokasi.\n`;
        }
        if (typeof json_schools !== 'undefined' && json_schools.features) {
            summary += `Total Sekolah di Peta: ${json_schools.features.length} sekolah.\n`;
        }
        if (typeof json_police !== 'undefined' && json_police.features) {
            summary += `Total Kantor Polisi di Peta: ${json_police.features.length} kantor.\n`;
        }
        if (typeof json_mosques !== 'undefined' && json_mosques.features) {
            summary += `Total Masjid di Peta: ${json_mosques.features.length} lokasi.\n`;
        }

        return summary;
    }

    // Helper: Search layers for features relevant to user's question
    function getRelevantFeaturesContext(query) {
        const q = query.toLowerCase().trim();
        let matchedItems = [];

        // Check global search index if available
        if (window.globalSearchData && Array.isArray(window.globalSearchData)) {
            window.globalSearchData.forEach(item => {
                const name = item.name.toLowerCase();
                const cat = (item.category || '').toLowerCase();
                const reg = (item.regency || '').toLowerCase();

                if (name.includes(q) || q.includes(name) || q.split(/\s+/).some(word => word.length > 3 && name.includes(word))) {
                    matchedItems.push(item);
                }
            });
        }

        // Search in GeoJSON layers if matches are few
        const layersToSearch = [
            { data: typeof json_universities !== 'undefined' ? json_universities : null, cat: 'Perguruan Tinggi' },
            { data: typeof json_hospitals !== 'undefined' ? json_hospitals : null, cat: 'Rumah Sakit' },
            { data: typeof json_tourism !== 'undefined' ? json_tourism : null, cat: 'Objek Wisata' },
            { data: typeof json_police !== 'undefined' ? json_police : null, cat: 'Kantor Polisi' },
            { data: typeof json_mosques !== 'undefined' ? json_mosques : null, cat: 'Masjid' }
        ];

        let specificSummary = "";
        let count = 0;

        layersToSearch.forEach(layerObj => {
            if (layerObj.data && layerObj.data.features) {
                layerObj.data.features.forEach(f => {
                    const props = f.properties;
                    const name = (props.name || '').toLowerCase();
                    const regency = (props.regency || '').toLowerCase();
                    const address = (props.address || '').toLowerCase();

                    if (name.includes(q) || regency.includes(q) || address.includes(q) || q.includes(name)) {
                        if (count < 15) { // Limit to 15 items max for context size
                            specificSummary += `- [${layerObj.cat}] ${props.name} (Kab/Kota: ${props.regency || 'Jambi'}) ${props.type ? `[Tipe: ${props.type}]` : ''} ${props.accreditation ? `[Akreditasi: ${props.accreditation}]` : ''} ${props.address ? `(Alamat: ${props.address})` : ''}\n`;
                            count++;
                        }
                    }
                });
            }
        });

        if (specificSummary) {
            return "\n=== DATA FASILITAS DITEMUKAN PADA PETA UNTUK PERTANYAAN INI ===\n" + specificSummary;
        }

        return "";
    }

    const SYSTEM_PROMPT = `Anda adalah Nisa, asisten virtual AI untuk WebGIS Provinsi Jambi.
Tugas utama Anda adalah membaca dan menjawab pertanyaan pengguna tentang seluruh isi peta WebGIS Provinsi Jambi.

ATURAN UTAMA:
1. Peta ini KHUSUS menampilkan data Provinsi Jambi (11 Kabupaten/Kota, 3,72 juta jiwa, 50.160 km²).
2. Data peta yang tersedia meliputi: Perguruan Tinggi, Sekolah (TK/SD/SMP/SMA), Rumah Sakit, Objek Wisata, Kantor Polisi, Masjid, dan Batas Wilayah Kabupaten/Kota.
3. Anda dapat membaca isi data peta. Gunakan [DATA MAPS REALTIME] yang dilampirkan untuk menjawab pertanyaan pengguna dengan sangat spesifik, akurat, dan ramah.
4. Jika Anda menyebutkan nama lokasi/fasilitas tertentu yang ada di peta, sertakan tag penanda dalam format: [MAPS: Nama Fasilitas] di jawaban Anda. Ini akan memungkinkan pengguna mengklik lokasi tersebut untuk fokus otomatis di peta. Contoh: "RSUD Raden Mattaher berada di Kota Jambi. [MAPS: RSUD Raden Mattaher]".
5. Jawab dengan ringkas, sopan, dan menggunakan bahasa Indonesia yang ramah.`;

    let conversationHistory = [
        { role: "system", content: SYSTEM_PROMPT }
    ];

    // Toggle Chat Window
    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    // Event listener untuk clickable [MAPS: Nama] di dalam pesan bot
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.chat-map-link');
        if (btn) {
            const locName = btn.getAttribute('data-location');
            if (locName && window.focusMapFeature) {
                const found = window.focusMapFeature(locName);
                if (!found) {
                    // Fallback to global search input if direct focus fails
                    const searchInput = document.getElementById('global-search');
                    if (searchInput) {
                        searchInput.value = locName;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }
            }
        }
    });

    // Fungsi menambah pesan ke UI
    function appendMessage(role, text) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble');
        bubble.classList.add(role === 'user' ? 'user-bubble' : 'bot-bubble');

        let formattedText = text;

        // Convert [MAPS: Nama Fasilitas] into interactive clickable buttons
        formattedText = formattedText.replace(/\[MAPS:\s*([^\]]+)\]/g, (match, locName) => {
            return `<button class="chat-map-link" data-location="${locName.trim()}"><i class="fa-solid fa-location-dot"></i> Lihat di Peta: ${locName.trim()}</button>`;
        });

        // Memproses baris baru menjadi <br>
        bubble.innerHTML = formattedText.replace(/\n/g, '<br>');

        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Fungsi menampilkan indikator loading
    function showLoading() {
        const loading = document.createElement('div');
        loading.id = 'chat-loading';
        loading.classList.add('chat-bubble', 'bot-bubble', 'loading-bubble');
        loading.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        chatMessages.appendChild(loading);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Fungsi menghapus indikator loading
    function hideLoading() {
        const loading = document.getElementById('chat-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Fungsi mengirim pesan ke API
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Tambahkan pesan user ke UI
        appendMessage('user', text);
        chatInput.value = '';

        // Synthesize dynamic map context based on user question and loaded layers
        const overviewCtx = getMapOverviewContext();
        const featureCtx = getRelevantFeaturesContext(text);
        const dynamicMapPrompt = `[DATA MAPS REALTIME PROVINSI JAMBI]\n${overviewCtx}${featureCtx}\n\nPertanyaan Pengguna: "${text}"`;

        // Push to prompt conversation history
        const promptMessages = [...conversationHistory, { role: "user", content: dynamicMapPrompt }];

        showLoading();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: promptMessages,
                    temperature: 0.6,
                    max_tokens: 450
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || response.statusText;
                throw new Error(`API Error ${response.status}: ${errMsg}`);
            }

            const data = await response.json();
            const botReply = data.choices[0].message.content;

            hideLoading();
            appendMessage('bot', botReply);

            // Save clean history for context continuity
            conversationHistory.push({ role: "user", content: text });
            conversationHistory.push({ role: "assistant", content: botReply });

        } catch (error) {
            hideLoading();
            console.error("Chatbot Error:", error);
            appendMessage('bot', `Maaf, terjadi kesalahan saat mengolah data peta.\n\n(Pesan Error: ${error.message})`);
        }
    }

    // Event Listeners untuk kirim pesan
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
