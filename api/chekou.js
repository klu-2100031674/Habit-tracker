require("dotenv").config()
const express = require("express")
const axios = require("axios")
const cors = require("cors")

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 PAYMENT VERIFICATION MODULE - KEY SOURCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════
// This file uses HARDCODED Razorpay credentials (see lines 22-23 below).
// If you see "TEST mode" in logs, check the following:
//   1. The hardcoded RAZORPAY_KEY_ID value on line 22 of this file
//   2. Environment variables if using api/verify-payment.js instead
// 
// This file logs key mode (TEST/LIVE) and source at startup.
// ═══════════════════════════════════════════════════════════════════════════

const app = express()

app.use(express.json())

app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5501"],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
)

const RAZORPAY_KEY_ID = "rzp_live_S2TmOEqqV6FxJP"
const RAZORPAY_KEY_SECRET = "wY2yF7werFeiGKAZZCDWXJgL"

// Detect and log key mode
const isTestMode = RAZORPAY_KEY_ID.startsWith("rzp_test")
const keyMode = isTestMode ? "TEST" : "LIVE"
console.log(`[api/chekou.js] Razorpay Key Mode: ${keyMode}`)
console.log(`[api/chekou.js] Key Source: HARDCODED in api/chekou.js (line 22)`)
console.log(`[api/chekou.js] Key ID: ${RAZORPAY_KEY_ID}`)
if (isTestMode) {
  console.warn(`⚠️ WARNING: Using TEST mode keys in api/chekou.js`)
}

async function verifyPaymentHandler(req, res) {
  // Accept either snake_case `payment_id` or camelCase `paymentId` from clients
  const payment_id = req.body.payment_id || req.body.paymentId

  if (!payment_id) {
    return res.status(400).json({
      success: false,
      message: "Payment ID is required",
    })
  }

  const url = `https://api.razorpay.com/v1/payments/${payment_id}`
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    })

    const p = response.data

    if (p.status === "captured") {
      res.json({ success: true, message: "✅ PAYMENT CAPTURED", paymentId: payment_id })
    } else {
      res.json({ success: false, message: "❌ PAYMENT NOT CAPTURED", paymentId: payment_id })
    }
  } catch (error) {
    console.error("[v0] Razorpay verification error:", error.message)
    res.status(400).json({ success: false, message: "Invalid payment ID or verification failed" })
  }
}

// Export handler so other modules can reuse it without starting a server
module.exports = verifyPaymentHandler

// If run directly, mount routes and start server (useful for local testing)
if (require.main === module) {
  // Mount the handler at both routes so frontend and legacy clients work
  app.post("/verify-payment", verifyPaymentHandler)
  app.post("/api/verify-payment", verifyPaymentHandler)

  app.listen(3000, () => console.log("Backend running on http://localhost:3000"))
}
