const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

const SessionSchema = new mongoose.Schema({
   sessionId: { type: String, required: true, unique: true },
   creds: { type: String, required: true },
   updatedAt: { type: Date, default: Date.now }
})

let SessionModel = null
let isConnected = false

async function connectMongo(uri) {
   if (!uri) return false
   if (isConnected) return true
   try {
      await mongoose.connect(uri, {
         useNewUrlParser: true,
         useUnifiedTopology: true
      })
      SessionModel = mongoose.models.WhatsAppSession || mongoose.model('WhatsAppSession', SessionSchema)
      isConnected = true
      console.log('✅ MongoDB connected for session storage')
      return true
   } catch (err) {
      console.error('❌ MongoDB connection error:', err.message)
      return false
   }
}

async function restoreSessionFromMongo(sessionDir = './session', sessionId = 'default') {
   const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL
   if (!mongoUri) return false

   const connected = await connectMongo(mongoUri)
   if (!connected || !SessionModel) return false

   try {
      if (!fs.existsSync(sessionDir)) {
         fs.mkdirSync(sessionDir, { recursive: true })
      }

      const record = await SessionModel.findOne({ sessionId })
      if (record && record.creds) {
         const credsPath = path.join(sessionDir, 'creds.json')
         fs.writeFileSync(credsPath, record.creds)
         console.log('✅ WhatsApp session restored from MongoDB successfully!')
         return true
      }
   } catch (err) {
      console.error('❌ Error restoring session from MongoDB:', err.message)
   }
   return false
}

async function saveSessionToMongo(sessionDir = './session', sessionId = 'default') {
   const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL
   if (!mongoUri || !SessionModel) return false

   try {
      const credsPath = path.join(sessionDir, 'creds.json')
      if (fs.existsSync(credsPath)) {
         const credsData = fs.readFileSync(credsPath, 'utf-8')
         await SessionModel.findOneAndUpdate(
            { sessionId },
            { creds: credsData, updatedAt: new Date() },
            { upsert: true, new: true }
         )
         console.log('💾 WhatsApp session backed up to MongoDB')
         return true
      }
   } catch (err) {
      console.error('❌ Error saving session to MongoDB:', err.message)
   }
   return false
}

module.exports = {
   connectMongo,
   restoreSessionFromMongo,
   saveSessionToMongo
}
