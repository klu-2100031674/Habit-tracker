const express = require('express')
const cors = require('cors')
require('dotenv').config()

const verifyHandler = require('./api/verify-payment')

const app = express()
// Enable CORS and preflight responses
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl) or file:// (origin is 'null')
    if (!origin || origin === 'null') return callback(null, true);
    return callback(null, true); // Allow all other origins too
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.options('*', cors())

// Simple request logger to help debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} -> ${req.method} ${req.originalUrl} from ${req.ip}`)
  next()
})
app.use(express.json())

// Serve static files from the root directory
app.use(express.static(__dirname))

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))

app.post('/api/verify-payment', async (req, res) => {
  try {
    await verifyHandler(req, res)
  } catch (e) {
    console.error('Server error:', e)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`))
