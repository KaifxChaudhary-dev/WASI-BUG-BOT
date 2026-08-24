const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const url = require('url')

let botProcess = null
let botStatus = {
   status: 'initializing', // 'initializing', 'awaiting_pairing', 'connected'
   code: null,
   phoneNumber: process.env.PHONE_NUMBER || '923192173398',
   user: null,
   error: null
}

// Lightweight HTTP server for Heroku routing & Web Pairing Portal
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
   const parsedUrl = url.parse(req.url, true)

   // API Endpoint to check live status
   if (parsedUrl.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(botStatus))
   }

   // API Endpoint to request pairing code with a specific number
   if (parsedUrl.pathname === '/api/pair') {
      let phone = parsedUrl.query.phone

      const handlePairRequest = (phoneNumber) => {
         if (!phoneNumber) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ success: false, message: 'Phone number is required' }))
         }
         phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
         botStatus.phoneNumber = phoneNumber
         botStatus.code = 'Generating...'
         botStatus.status = 'awaiting_pairing'
         botStatus.error = null

         if (botProcess && botProcess.send) {
            botProcess.send({ type: 'request_pairing', phone: phoneNumber })
         }

         res.writeHead(200, { 'Content-Type': 'application/json' })
         res.end(JSON.stringify({ success: true, phoneNumber }))
      }

      if (req.method === 'POST') {
         let body = ''
         req.on('data', chunk => { body += chunk.toString() })
         req.on('end', () => {
            try {
               const data = JSON.parse(body)
               handlePairRequest(data.phone)
            } catch (e) {
               handlePairRequest(body.replace(/[^0-9]/g, ''))
            }
         })
         return
      } else {
         return handlePairRequest(phone)
      }
   }

   // Main Web UI
   res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
   res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
         <meta charset="UTF-8">
         <title>WASI-BUG-BOT | Web Pairing Portal</title>
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
               background: linear-gradient(135deg, #0b0f19 0%, #1a2234 100%);
               color: #f8fafc; 
               font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
               display: flex; 
               justify-content: center; 
               align-items: center; 
               min-height: 100vh; 
               padding: 1.5rem; 
            }
            .container { 
               background: rgba(30, 41, 59, 0.85); 
               backdrop-filter: blur(12px);
               border: 1px solid rgba(255, 255, 255, 0.1); 
               padding: 2.2rem; 
               border-radius: 20px; 
               box-shadow: 0 20px 40px rgba(0,0,0,0.5); 
               max-width: 480px; 
               width: 100%; 
               text-align: center; 
            }
            h1 { font-size: 1.8rem; margin-bottom: 0.4rem; color: #38bdf8; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .subtitle { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem; }
            .badge { 
               display: inline-flex; 
               align-items: center; 
               gap: 6px; 
               padding: 6px 14px; 
               border-radius: 9999px; 
               font-size: 0.85rem; 
               font-weight: 600; 
               margin-bottom: 1.5rem;
            }
            .badge-init { background: rgba(234, 179, 8, 0.15); color: #facc15; }
            .badge-pair { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
            .badge-connected { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
            
            .card-section { background: #0f172a; padding: 1.4rem; border-radius: 14px; border: 1px solid #334155; margin-bottom: 1.5rem; text-align: left; }
            label { font-size: 0.85rem; color: #cbd5e1; font-weight: 600; margin-bottom: 0.5rem; display: block; }
            .input-group { display: flex; gap: 8px; margin-top: 6px; }
            input[type="text"] {
               flex: 1;
               background: #1e293b;
               border: 1px solid #475569;
               color: #ffffff;
               padding: 10px 14px;
               border-radius: 8px;
               font-size: 1rem;
               outline: none;
               transition: border-color 0.2s;
            }
            input[type="text"]:focus { border-color: #38bdf8; }
            button {
               background: #0284c7;
               color: #ffffff;
               border: none;
               padding: 10px 16px;
               border-radius: 8px;
               font-size: 0.95rem;
               font-weight: 600;
               cursor: pointer;
               transition: background 0.2s, transform 0.1s;
            }
            button:hover { background: #0369a1; }
            button:active { transform: scale(0.98); }
            
            .code-box {
               background: #090d16;
               border: 2px dashed #0284c7;
               border-radius: 12px;
               padding: 1.2rem;
               text-align: center;
               margin-top: 1rem;
            }
            .code-text {
               font-family: "Courier New", Courier, monospace;
               font-size: 2rem;
               font-weight: 700;
               letter-spacing: 4px;
               color: #38bdf8;
               margin: 0.4rem 0;
            }
            .copy-btn {
               background: #334155;
               color: #e2e8f0;
               font-size: 0.8rem;
               padding: 4px 10px;
               margin-top: 6px;
            }
            .copy-btn:hover { background: #475569; }
            
            .steps { margin-top: 1.2rem; text-align: left; font-size: 0.85rem; color: #94a3b8; line-height: 1.6; }
            .steps ol { padding-left: 1.2rem; }
            .steps li { margin-bottom: 0.3rem; }
            
            .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
         </style>
      </head>
      <body>
         <div class="container">
            <h1>🐛 WASI-BUG-BOT</h1>
            <p class="subtitle">WhatsApp Multi-Device Pairing Portal</p>
            
            <div id="statusBadge" class="badge badge-init">● Starting Bot Engine...</div>
            
            <div class="card-section" id="pairSection">
               <label for="phoneInput">Enter WhatsApp Number (with Country Code):</label>
               <div class="input-group">
                  <input type="text" id="phoneInput" placeholder="e.g. 923192173398" value="${botStatus.phoneNumber || ''}">
                  <button id="getPairBtn" onclick="requestPairCode()">Get Code</button>
               </div>
               
               <div class="code-box" id="codeContainer">
                  <span style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Pairing Code</span>
                  <div class="code-text" id="pairingCodeDisplay">${botStatus.code || 'Waiting...'}</div>
                  <button class="copy-btn" id="copyBtn" onclick="copyCode()">📋 Copy Code</button>
               </div>
               
               <div class="steps">
                  <strong style="color: #e2e8f0;">How to connect:</strong>
                  <ol>
                     <li>Open WhatsApp on your phone.</li>
                     <li>Tap <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong>.</li>
                     <li>Tap <strong>Link with phone number instead</strong>.</li>
                     <li>Enter the 8-digit code above.</li>
                  </ol>
               </div>
            </div>

            <div class="card-section" id="connectedSection" style="display: none; text-align: center;">
               <h3 style="color: #4ade80; margin-bottom: 0.5rem;">🎉 Bot Connected Successfully!</h3>
               <p style="color: #94a3b8; font-size: 0.9rem;">Your WhatsApp bot is online, listening for messages, and ready to use.</p>
            </div>
            
            <div class="footer">WASI TECH BOT • Powered by Baileys & Heroku</div>
         </div>

         <script>
            async function fetchStatus() {
               try {
                  const res = await fetch('/api/status');
                  const data = await res.json();
                  
                  const badge = document.getElementById('statusBadge');
                  const codeDisplay = document.getElementById('pairingCodeDisplay');
                  const pairSec = document.getElementById('pairSection');
                  const connSec = document.getElementById('connectedSection');
                  
                  if (data.status === 'connected') {
                     badge.className = 'badge badge-connected';
                     badge.innerText = '● Connected & Online';
                     pairSec.style.display = 'none';
                     connSec.style.display = 'block';
                  } else if (data.status === 'awaiting_pairing') {
                     badge.className = 'badge badge-pair';
                     badge.innerText = '● Awaiting Pairing';
                     pairSec.style.display = 'block';
                     connSec.style.display = 'none';
                     if (data.code) {
                        codeDisplay.innerText = data.code;
                     }
                  } else {
                     badge.className = 'badge badge-init';
                     badge.innerText = '● Initializing Session...';
                     if (data.code) {
                        codeDisplay.innerText = data.code;
                     }
                  }
               } catch (e) {
                  console.error('Failed to poll status:', e);
               }
            }

            async function requestPairCode() {
               const phone = document.getElementById('phoneInput').value.trim();
               if (!phone) return alert('Please enter your WhatsApp phone number!');
               
               document.getElementById('pairingCodeDisplay').innerText = 'Generating...';
               document.getElementById('getPairBtn').disabled = true;
               
               try {
                  await fetch('/api/pair', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ phone })
                  });
               } catch(e) {
                  alert('Error requesting code: ' + e.message);
               } finally {
                  setTimeout(() => {
                     document.getElementById('getPairBtn').disabled = false;
                  }, 2000);
               }
            }

            function copyCode() {
               const code = document.getElementById('pairingCodeDisplay').innerText;
               if (!code || code === 'Waiting...' || code === 'Generating...') return;
               navigator.clipboard.writeText(code).then(() => {
                  const btn = document.getElementById('copyBtn');
                  btn.innerText = '✅ Copied!';
                  setTimeout(() => { btn.innerText = '📋 Copy Code'; }, 2000);
               });
            }

            setInterval(fetchStatus, 3000);
            fetchStatus();
         </script>
      </body>
      </html>
   `)
})

server.listen(port, () => {
   console.log(`Web Pairing Portal listening on port ${port}`)
})

function start() {
   let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)]
   console.log([process.argv[0], ...args].join('\n'))
   botProcess = spawn(process.argv[0], args, {
         stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      })
      .on('message', data => {
         if (data == 'reset') {
            console.log('Restarting Bot...')
            botProcess.kill()
            start()
         } else if (data && typeof data === 'object') {
            if (data.type === 'pairing_code') {
               botStatus.status = 'awaiting_pairing'
               botStatus.code = data.code
               botStatus.phoneNumber = data.phoneNumber
            } else if (data.type === 'status') {
               botStatus.status = data.status
               if (data.user) botStatus.user = data.user
            } else if (data.type === 'pairing_error') {
               botStatus.error = data.error
               botStatus.code = 'Error: ' + data.error
            }
         }
      })
      .on('exit', code => {
         console.error('Exited with code:', code)
         if (code == '.' || code == 1 || code == 0) start()
      })
}
start()
