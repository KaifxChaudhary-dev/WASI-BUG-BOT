const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

// Start lightweight web server to bind to Heroku's $PORT and prevent H10/H14 errors in browser
const port = process.env.PORT || 3000
const server = http.createServer((req, res) => {
   res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
   res.end(`
      <!DOCTYPE html>
      <html>
      <head>
         <title>WASI-BUG-BOT Status</title>
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <style>
            body { background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; max-width: 420px; text-align: center; }
            h1 { color: #22c55e; margin: 0 0 10px; font-size: 1.8rem; }
            .badge { display: inline-block; padding: 4px 12px; background: rgba(34, 197, 94, 0.15); color: #4ade80; border-radius: 999px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0.5rem 0; }
            .tip { margin-top: 1.25rem; font-size: 0.85rem; color: #64748b; border-top: 1px solid #334155; padding-top: 1rem; }
         </style>
      </head>
      <body>
         <div class="card">
            <h1>🐛 WASI-BUG-BOT</h1>
            <div class="badge">● Online & Active</div>
            <p>The WhatsApp Bot service is running smoothly.</p>
            <div class="tip">To view QR / pairing codes or terminal outputs, check your <strong>Heroku Application Logs</strong>.</div>
         </div>
      </body>
      </html>
   `)
})

server.listen(port, () => {
   console.log(`HTTP status server listening on port ${port}`)
})

function start() {
   let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)]
   console.log([process.argv[0], ...args].join('\n'))
   let p = spawn(process.argv[0], args, {
         stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      })
      .on('message', data => {
         if (data == 'reset') {
            console.log('Restarting Bot...')
            p.kill()
            start()
            delete p
         }
      })
      .on('exit', code => {
         console.error('Exited with code:', code)
         if (code == '.' || code == 1 || code == 0) start()
      })
}
start()
