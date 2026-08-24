const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const url = require('url')
const fs = require('fs')

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

   // Serve pair.html
   const pairHtmlPath = path.join(__dirname, 'pair.html')
   if (fs.existsSync(pairHtmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return fs.createReadStream(pairHtmlPath).pipe(res)
   }

   // Fallback minimal response
   res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
   res.end('WASI-BUG-BOT is Running!')
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
