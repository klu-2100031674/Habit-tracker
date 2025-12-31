require("dotenv").config()
const axios = require("axios")

module.exports = async (req, res) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      message: "Method not allowed" 
    })
  }

  try {
    const { paymentId, buyerEmail, buyerName } = req.body
    
    console.log("═══════════════════════════════════════")
    console.log("📥 VERIFICATION REQUEST RECEIVED")
    console.log("Payment ID:", paymentId)
    console.log("Email:", buyerEmail)
    console.log("Name:", buyerName)
    console.log("═══════════════════════════════════════")

    // Validate payment ID
    if (!paymentId) {
      console.log("❌ No payment ID provided")
      return res.status(400).json({
        success: false,
        message: "Missing payment ID",
      })
    }

    // Get Razorpay credentials from .env
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error("❌ Razorpay credentials missing in .env file")
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      })
    }

    console.log("🔐 Using Razorpay Key:", keyId)

    // ✅ VERIFY PAYMENT WITH RAZORPAY
    console.log("🔍 Verifying payment with Razorpay API...")
    
    let payment
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
      
      const response = await axios.get(
        `https://api.razorpay.com/v1/payments/${paymentId}`,
        {
          headers: { 
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000,
        }
      )
      
      payment = response.data
      
      console.log("✅ Razorpay Response Received")
      console.log("Payment Status:", payment.status)
      console.log("Captured:", payment.captured)
      console.log("Amount:", payment.amount / 100, payment.currency)
      
    } catch (razorpayError) {
      console.error("❌ Razorpay API Error:")
      console.error(razorpayError.response?.data || razorpayError.message)
      
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID or payment not found",
      })
    }

    // Check if payment is captured
    if (payment.status !== "captured" || payment.captured !== true) {
      console.log("❌ Payment not captured. Status:", payment.status)
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${payment.status}`,
      })
    }

    console.log("✅ PAYMENT VERIFIED SUCCESSFULLY!")

    // ✅ PREPARE DOWNLOAD LINKS
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5500"
    const pdfUrl = `${FRONTEND_URL}/habit-tracker-guide.pdf`
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1yBqnxoOgiDYLgcACr5hwg8yh8eTvi2Y5sOXS4_h9ZSg/copy"

    // ✅ SEND EMAIL VIA EMAILJS
    let emailSent = false
    
    // Check if EmailJS is configured
    const emailConfigured =
      process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      process.env.EMAILJS_USER_ID &&
      process.env.EMAILJS_PRIVATE_KEY

    if (!emailConfigured) {
      console.warn("⚠️ EmailJS not configured in .env")
    }

    if (emailConfigured && buyerEmail && buyerName) {
      try {
        console.log("📧 Sending email to:", buyerEmail)
        
        const emailPayload = {
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_USER_ID,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: {
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            payment_id: paymentId,
            amount: `₹${payment.amount / 100}`,
            signed_pdf_url: pdfUrl,
            sheet_force_copy_url: sheetUrl,
            pdf_url: pdfUrl, // Alternative name
            sheet_url: sheetUrl, // Alternative name
          },
        }

        console.log("📤 Sending to EmailJS API...")
        console.log("Service ID:", emailPayload.service_id)
        console.log("Template ID:", emailPayload.template_id)

        const emailResponse = await axios.post(
          "https://api.emailjs.com/api/v1.0/email/send",
          emailPayload,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
          }
        )

        if (emailResponse.status >= 200 && emailResponse.status < 300) {
          emailSent = true
          console.log("✅ EMAIL SENT SUCCESSFULLY!")
          console.log("Email response:", emailResponse.data)
        }
        
      } catch (emailError) {
        console.error("❌ EMAIL SENDING FAILED:")
        console.error("Error:", emailError.message)
        console.error("Details:", emailError.response?.data)
        // Don't fail the whole request - payment is verified
      }
    } else {
      console.log("⚠️ Skipping email - missing buyer info or EmailJS config")
    }

    // ✅ RETURN SUCCESS RESPONSE
    console.log("═══════════════════════════════════════")
    console.log("✅ VERIFICATION COMPLETE")
    console.log("Email Sent:", emailSent ? "YES" : "NO")
    if (!emailSent) {
      console.log("💡 Tip: Check if EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_USER_ID, and EMAILJS_PRIVATE_KEY are set in Render environment variables.")
    }
    console.log("═══════════════════════════════════════")

    return res.status(200).json({
      success: true,
      emailSent,
      pdfUrl,
      sheetUrl,
      paymentId,
      amount: `₹${payment.amount / 100}`,
      message: emailSent 
        ? "Payment verified and email sent successfully" 
        : "Payment verified (email delivery pending)",
    })

  } catch (error) {
    console.error("❌ FATAL ERROR:")
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Server error. Please contact support.",
    })
  }
}
