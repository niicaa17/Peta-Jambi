document.addEventListener('DOMContentLoaded', () => {
    // Buat elemen Chatbot UI
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chatbot-container';
    
    chatContainer.innerHTML = `
        <button id="chatbot-toggle" class="chatbot-btn">
            <i class="fa-solid fa-message"></i>
        </button>
        <div id="chatbot-window" class="chatbot-window hidden">
            <div class="chat-header">
                <div class="chat-title">
                    📍 NisaMap
                </div>
                <button id="chatbot-close" class="chat-close-btn"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="chat-messages" class="chat-messages">
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Ketik pesan..." autocomplete="off">
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

    // GROQ API Configuration
    const GROQ_API_KEY = "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"; 
    const SYSTEM_PROMPT = `Anda adalah asisten virtual yang ramah untuk aplikasi WebGIS (Sistem Informasi Geografis Berbasis Web). 
Tugas utama Anda adalah menjawab pertanyaan seputar peta ini.
ATURAN SANGAT PENTING: 
1. Peta ini HANYA menginformasikan dan menampilkan data untuk Provinsi Jambi saja. Jika ada yang bertanya cakupan peta, selalu tegaskan bahwa peta ini khusus untuk Provinsi Jambi.
2. Peta ini HANYA menampilkan data berikut: Perguruan Tinggi, Sekolah Menengah, Rumah Sakit, Masjid, Kantor Polisi, Objek Wisata, dan Batas Kab/Kota. JANGAN menyebutkan data lain seperti jalan, sungai, atau gunung karena data tersebut tidak ada di peta.
3. Namamu adalah Nisa. Jika pengguna HANYA menyapa (misal: "hallo", "hai"), balas dengan: "Hallo Selamat datang!ada yang bisa nisa bantu mengenai peta ini?". JANGAN gunakan kalimat sapaan ini jika pengguna menanyakan pertanyaan lain atau meminta informasi.
Jawab dengan ringkas, sopan, dan dalam bahasa Indonesia.`;

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

    // Fungsi menambah pesan ke UI
    function appendMessage(role, text) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble');
        bubble.classList.add(role === 'user' ? 'user-bubble' : 'bot-bubble');
        
        // Memproses baris baru menjadi <br>
        bubble.innerHTML = text.replace(/\n/g, '<br>');
        
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

    // Fungsi mengirim pesan ke Groq API
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Tambahkan ke UI dan History
        appendMessage('user', text);
        conversationHistory.push({ role: "user", content: text });
        chatInput.value = '';

        if (GROQ_API_KEY === "MASUKKAN_API_KEY_GROQ_ANDA_DISINI") {
            setTimeout(() => {
                appendMessage('bot', "Maaf, API Key Groq belum dikonfigurasi. Silakan ganti teks 'MASUKKAN_API_KEY_GROQ_ANDA_DISINI' dengan kunci API Anda di dalam file `resources/chatbot.js`.");
            }, 500);
            return;
        }

        showLoading();

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant", // Model terbaru dari Groq
                    messages: conversationHistory,
                    temperature: 0.7,
                    max_tokens: 300
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
            conversationHistory.push({ role: "assistant", content: botReply });

        } catch (error) {
            hideLoading();
            console.error("Chatbot Error:", error);
            appendMessage('bot', `Maaf, terjadi kesalahan saat menghubungi server. Pastikan API Key valid dan koneksi internet stabil.\n\n(Pesan Error: ${error.message})`);
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
