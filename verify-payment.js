// This file should be deployed as a serverless function or API endpoint

/**
 * Backend API endpoint to verify Razorpay payment and generate secure download links
 *
 * Required environment variables:
 * - RAZORPAY_KEY_ID
 * - RAZORPAY_KEY_SECRET
 * - EMAILJS_PRIVATE_KEY
 * - PDF_SIGNING_SECRET
 */

const crypto = require("crypto")

// Example serverless function structure (Vercel, Netlify, etc.)
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { paymentId, buyerEmail, buyerName } = req.body

    console.log("[Backend] Verifying payment:", paymentId)

    // Step 1: Verify payment with Razorpay API
    const razorpayAuth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString(
      "base64",
    )

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${razorpayAuth}`,
      },
    })

    if (!paymentResponse.ok) {
      throw new Error("Payment verification failed")
    }

    const paymentData = await paymentResponse.json()

    console.log("[Backend] Payment data:", paymentData) 
    // Check if payment is successful
    if (paymentData.status !== "captured") {
      return res.status(400).json({ error: "Payment not successful" })
    }

    console.log("[Backend] Payment verified successfully")

    // Step 2: Generate secure signed download links
    const pdfUrl = generateSignedUrl("habit-tracker-guide.pdf", 7) // 7 days expiry
    const sheetUrl = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/copy"

    // Step 3: Send email via EmailJS from backend (more secure)
    const emailParams = {
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      payment_id: paymentId,
      amount: paymentData.amount / 100, // Convert paise to rupees
      currency: paymentData.currency,
      signed_pdf_url: pdfUrl,
      sheet_force_copy_url: sheetUrl,
      purchase_date: new Date().toLocaleDateString("en-IN"),
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN"),
      support_email: "support@habittracker.com",
      brand_logo_url: "https://your-domain.com/logo.svg",
    }

    // Send email (you can use EmailJS API or any email service)
    await sendEmailViaEmailJS(emailParams)

    console.log("[Backend] Email sent successfully")

    // Step 4: Return download links to frontend
    return res.status(200).json({
      success: true,
      pdfUrl,
      sheetUrl,
      message: "Payment verified and email sent",
    })
  } catch (error) {
    console.error("[Backend] Error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Helper function to generate signed download URL
function generateSignedUrl(filename, expiryDays) {
  const expiry = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
  const baseUrl = `https://your-cdn.com/files/${filename}`

  // Create signature
  const signature = crypto
    .createHmac("sha256", process.env.PDF_SIGNING_SECRET)
    .update(`${filename}-${expiry}`)
    .digest("hex")

  return `${baseUrl}?expires=${expiry}&signature=${signature}`
}

// Helper function to send email via EmailJS
async function sendEmailViaEmailJS(params) {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: "service_apvc4bd",
      template_id: "habit",
      user_id: "wnc0CaYrKlWKSS39G",
      accessToken: process.env.EMAILJS_PRIVATE_KEY, // Store private key in backend
      template_params: params,
    }),
  })

  if (!response.ok) {
    throw new Error("Email sending failed")
  }

  return response.json()
}
