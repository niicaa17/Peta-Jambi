import { defineConfig, loadEnv } from 'vite';
import https from 'https';

// Plugin lokal: forward /api/chat ke Groq API pakai key dari .env
function localApiPlugin(env) {
  return {
    name: 'local-api-chat',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          return res.end();
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        const GROQ_API_KEY = env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'GROQ_API_KEY tidak ditemukan di file .env' }));
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const postData = body;
          const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Length': Buffer.byteLength(postData),
            },
          };

          const groqReq = https.request(options, (groqRes) => {
            let data = '';
            groqRes.on('data', chunk => { data += chunk; });
            groqRes.on('end', () => {
              res.writeHead(groqRes.statusCode, { 'Content-Type': 'application/json' });
              res.end(data);
            });
          });

          groqReq.on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Gagal terhubung ke Groq API', detail: err.message }));
          });

          groqReq.write(postData);
          groqReq.end();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: './',
    plugins: [localApiPlugin(env)],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: { main: './index.html' }
      }
    },
    server: {
      port: 3000,
      open: true
    }
  };
});
