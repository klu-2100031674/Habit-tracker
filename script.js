window.emailjs = window.emailjs || {}
window.emailjs.init =
  window.emailjs.init ||
  ((user) => {
    window.emailjs.user = user
  })
window.emailjs.init("uz8hiD8fUS8fBs46x")

let userData = {
  name: "",
  email: "",
  paymentId: "",
  amount: "29",
  currency: "INR",
}

const RAZORPAY_PAYMENT_LINK = "https://rzp.io/rzp/5Tyk8eh"

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1yBqnxoOgiDYLgcACr5hwg8yh8eTvi2Y5sOXS4_h9ZSg/edit?usp=sharing"
// ✅ CORRECT - Force copy URL
const GOOGLE_SHEETS_COPY_URL = "https://docs.google.com/spreadsheets/d/1yBqnxoOgiDYLgcACr5hwg8yh8eTvi2Y5sOXS4_h9ZSg/copy"

const VERIFIED_PAYMENTS_KEY = "habitTrackerVerifiedPayments"

function openCheckoutModal() {
  const modal = document.getElementById("checkoutModal")
  modal.classList.add("active")
  document.body.style.overflow = "auto"
}

function sendConfirmationEmail(name, email, paymentId, pdfUrl, sheetUrl) {
  console.log("[v0] Sending email with parameters:")
  console.log("  - buyer_name:", name)
  console.log("  - buyer_email:", email)
  console.log("  - pdf_url:", pdfUrl)
  console.log("  - sheet_url:", sheetUrl)

  window.emailjs
    .send(
      "track-daily", // SERVICE ID
      "habit", // TEMPLATE ID
      {
        buyer_name: name,
        buyer_email: email,
        pdf_url: pdfUrl,
        sheet_url: sheetUrl,
        payment_id: paymentId,
        amount: "₹29",
      },
    )
    .then(
      (response) => {
        console.log("✅ Email sent successfully", response.status, response.text)
        console.log("[v0] Email should contain:")
        console.log("  - PDF Link:", pdfUrl)
        console.log("  - Sheet Link:", sheetUrl)
      },
      (err) => {
        console.warn("⚠️ Email failed", err)
        console.error("[v0] Email error details:", err)
      },
    )
}

function cleanupBlockingModals() {
  document.getElementById("loadingModal")?.remove()
  document.getElementById("paymentIdModal")?.remove()
  document.getElementById("checkoutModal")?.classList.remove("active")
  document.body.style.overflow = "hidden"
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal")
  modal.classList.remove("active")
  document.body.style.overflow = "auto"
  document.getElementById("checkoutStep1").style.display = "block"
  document.getElementById("checkoutStep2").style.display = "none"
}

function openDownloadModal() {
  const modal = document.getElementById("downloadModal")
  modal.classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeDownloadModal() {
  const modal = document.getElementById("downloadModal")
  modal.classList.remove("active")
  document.body.style.overflow = "auto"
}

function showPaymentIdModal() {
  const existingModal = document.getElementById("paymentIdModal")
  if (!existingModal) {
    const modalHTML = `
      <div id="paymentIdModal" class="modal active">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Verify Your Payment</h2>
          </div>
          <div class="modal-body">
            <p class="modal-description">After completing payment, enter your Razorpay Payment ID to access your files instantly.</p>
            <form id="paymentIdForm">
              <div class="form-group">
                <label for="paymentIdInput">Razorpay Payment ID</label>
                <input type="text" id="paymentIdInput" name="paymentIdInput" required placeholder="pay_XXXXXXXXXXXXX">
                <small>Find this in your payment confirmation email or Razorpay dashboard</small>
              </div>
              <button type="submit" class="btn-submit">Verify & Download</button>
              <button type="button" class="btn-secondary" onclick="closePaymentIdModal()">I'll Do This Later</button>
            </form>
          </div>
        </div>
      </div>
    `
    document.body.insertAdjacentHTML("beforeend", modalHTML)

    const paymentIdForm = document.getElementById("paymentIdForm")
    paymentIdForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const paymentId = document.getElementById("paymentIdInput").value.trim()

      if (!paymentId.startsWith("pay_")) {
        alert("Please enter a valid Razorpay Payment ID (starts with pay_)")
        return
      }

      const storedData = localStorage.getItem("habitTrackerUser")
      if (storedData) {
        userData = JSON.parse(storedData)
      }

      userData.paymentId = paymentId

      closePaymentIdModal()

      await verifyPaymentWithBackend(paymentId, userData.email, userData.name)
    })
  } else {
    existingModal.classList.add("active")
  }
  document.body.style.overflow = "hidden"
}

function closePaymentIdModal() {
  const modal = document.getElementById("paymentIdModal")
  if (modal) {
    modal.classList.remove("active")
    document.body.style.overflow = "auto"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const checkoutForm = document.getElementById("checkoutForm")

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault()

    userData.name = document.getElementById("buyerName").value
    userData.email = document.getElementById("buyerEmail").value

    localStorage.setItem("habitTrackerUser", JSON.stringify(userData))

    // Hide step 1, show step 2 with iframe
    document.getElementById("checkoutStep1").style.display = "none"
    document.getElementById("checkoutStep2").style.display = "block"

    // Load Razorpay checkout in iframe
    document.getElementById("razorpayIframe").src = RAZORPAY_PAYMENT_LINK

    setTimeout(() => {
      const loadingModal = document.getElementById("loadingModal")
      const checkoutModal = document.getElementById("checkoutModal")
      const checkoutModalVisible = checkoutModal ? checkoutModal.classList.contains("active") : false

      // Only show manual verification if payment hasn't been detected yet
      if (checkoutModalVisible && !loadingModal) {
        console.log("[v0] Auto-detection timeout - showing manual verification option")
        alert("If you've completed the payment, please click 'Manually Verify Payment' button below to proceed.")
      }
    }, 180000) // 3 minutes
  })

  window.addEventListener("message", async (event) => {
    console.log("[v0] Received postMessage:", event.data)

    if (event.data && typeof event.data === "object") {
      const paymentId =
        event.data.razorpay_payment_id ||
        event.data.paymentId ||
        event.data.payment_id ||
        (event.data.payload && event.data.payload.payment_id) ||
        (event.data.payload &&
          event.data.payload.payment &&
          event.data.payload.payment.entity &&
          event.data.payload.payment.entity.id)

      if (paymentId && paymentId.startsWith("pay_")) {
        console.log("[v0] ✅ Payment completed with ID:", paymentId)

        const storedData = localStorage.getItem("habitTrackerUser")
        if (storedData) {
          userData = JSON.parse(storedData)
        }

        userData.paymentId = paymentId

        closeCheckoutModal()
        await verifyPaymentWithBackend(paymentId, userData.email, userData.name)
        return
      }
    }

    if (event.data === "payment.success" || (event.data && event.data.event === "payment.success")) {
      console.log("[v0] ✅ Payment success event received")
      setTimeout(() => {
        const iframe = document.getElementById("razorpayIframe")
        if (iframe) {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
            const paymentIdElement = iframeDoc.querySelector("[data-payment-id]") || iframeDoc.body
            const paymentIdMatch = paymentIdElement.textContent.match(/pay_[A-Za-z0-9]+/)
            if (paymentIdMatch) {
              const paymentId = paymentIdMatch[0]

              const storedData = localStorage.getItem("habitTrackerUser")
              if (storedData) {
                userData = JSON.parse(storedData)
              }

              userData.paymentId = paymentId
              closeCheckoutModal()
              verifyPaymentWithBackend(paymentId, userData.email, userData.name)
            } else {
              console.log("[v0] Payment ID not found in iframe, showing manual verification")
              closeCheckoutModal()
              showPaymentIdModal()
            }
          } catch (e) {
            console.log("[v0] Cannot access iframe content due to CORS, showing manual verification")
            closeCheckoutModal()
            showPaymentIdModal()
          }
        }
      }, 2000)
    }
  })

  const checkIframeRedirect = setInterval(() => {
    try {
      const iframe = document.getElementById("razorpayIframe")
      if (iframe && iframe.contentWindow) {
        const iframeUrl = iframe.contentWindow.location.href

        // Check if URL contains payment success indicators
        if (
          iframeUrl.includes("payment_id") ||
          iframeUrl.includes("razorpay_payment_id") ||
          iframeUrl.includes("pay_")
        ) {
          console.log("[v0] ✅ Detected payment success in iframe URL")

          // Extract payment ID from URL
          const urlParams = new URLSearchParams(new URL(iframeUrl).search)
          const paymentId =
            urlParams.get("payment_id") ||
            urlParams.get("razorpay_payment_id") ||
            iframeUrl.match(/pay_[A-Za-z0-9]+/)?.[0]

          if (paymentId) {
            clearInterval(checkIframeRedirect)

            const storedData = localStorage.getItem("habitTrackerUser")
            if (storedData) {
              userData = JSON.parse(storedData)
            }

            userData.paymentId = paymentId
            closeCheckoutModal()
            verifyPaymentWithBackend(paymentId, userData.email, userData.name)
          }
        }
      }
    } catch (e) {
      // Cross-origin restrictions prevent access - this is normal
      // We rely on postMessage or manual verification
    }
  }, 1000)

  setTimeout(() => {
    clearInterval(checkIframeRedirect)
  }, 600000)

  const completePaymentBtn = document.getElementById("completePaymentBtn")
  if (completePaymentBtn) {
    completePaymentBtn.addEventListener("click", () => {
      console.log("[v0] Manual verification button clicked")
      closeCheckoutModal()
      showPaymentIdModal()
    })
  }

  checkForPaymentReturn()
  checkVerifiedPayment()

  const faqItems = document.querySelectorAll(".faq-item")

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question")

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active")

      faqItems.forEach((faqItem) => {
        faqItem.classList.remove("active")
      })

      if (!isActive) {
        item.classList.add("active")
      }
    })
  })

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })
})

function checkForPaymentReturn() {
  const storedUserData = localStorage.getItem("habitTrackerUser")

  if (storedUserData) {
    userData = JSON.parse(storedUserData)
  }
}

function checkVerifiedPayment() {
  const verifiedPayments = localStorage.getItem(VERIFIED_PAYMENTS_KEY)

  if (verifiedPayments) {
    try {
      const payments = JSON.parse(verifiedPayments)
      const latestPayment = payments[payments.length - 1]

      if (latestPayment && latestPayment.pdfUrl) {
        showDownloadBanner(latestPayment)
      }
    } catch (error) {
      console.error("Error parsing verified payments:", error)
    }
  }
}

function showDownloadBanner(paymentData) {
  // Remove existing banner if present
  const existingBanner = document.getElementById("downloadBanner")
  if (existingBanner) {
    existingBanner.remove()
  }

  const bannerHTML = `
    <div id="downloadBanner" class="download-banner">
      <div class="container">
        <div class="download-banner-content">
          <div class="download-banner-info">
            <div class="download-banner-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <strong>Payment Verified!</strong>
              <p>Your files are ready to download</p>
            </div>
          </div>
          <div class="download-banner-actions">
            <a href="${paymentData.pdfUrl || "/habit-tracker-guide.pdf"}" download class="banner-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M5 7l3 3 3-3M2 12v2h12v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              PDF Guide
            </a>
            <a href="${paymentData.sheetUrl || GOOGLE_SHEETS_COPY_URL}" target="_blank" class="banner-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 2v12M2 6h12" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              Habit Tracker
            </a>
            <button onclick="closeBanner()" class="banner-close">×</button>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("afterbegin", bannerHTML)
}

function closeBanner() {
  const banner = document.getElementById("downloadBanner")
  if (banner) {
    banner.style.opacity = "0"
    setTimeout(() => banner.remove(), 300)
  }
}

async function verifyPaymentWithBackend(paymentId, email, name) {
  if (!paymentId || !paymentId.startsWith("pay_")) {
    alert("Invalid Razorpay Payment ID")
    showPaymentIdModal()
    return
  }

  if (document.getElementById("loadingModal")) return

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div id="loadingModal" class="modal active">
      <div class="modal-content">
        <div class="loading-spinner"></div>
        <h3>Verifying your payment...</h3>
        <p>Payment ID: ${paymentId}</p>
      </div>
    </div>`,
  )

  try {
    const API_URL =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "file:"
        ? "http://localhost:3000/api/verify-payment"
        : "/api/verify-payment"

    console.log("[v0] API_URL being used:", API_URL)
    console.log("[v0] Sending verification request:", { paymentId, email, name })

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId, // Backend now accepts this
        buyerEmail: email,
        buyerName: name,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] API error:", errorData)
      throw new Error(errorData.message || "Verification failed")
    }

    const data = await response.json()
    document.getElementById("loadingModal")?.remove()

    if (!data.success) {
      alert(data.message || "Payment verification failed")
      showPaymentIdModal()
      return
    }

    console.log("[v0] Verification successful")

    // 🔥 CLOSE EVERYTHING
    document.querySelectorAll(".modal").forEach((m) => m.remove())
    document.body.style.overflow = "auto"

    // ✅ SHOW SUCCESS UI
    showSuccessModal(email, name, data.pdfUrl, data.sheetUrl, true)

    // ✅ SEND EMAIL (LINK-BASED - PDF and Sheet URLs only)
    window.emailjs
      .send(
        "track-daily", // SERVICE ID
        "habit", // TEMPLATE ID
        {
          buyer_name: name,
          buyer_email: email,
          pdf_url: data.pdfUrl,
          sheet_url: data.sheetUrl,
          payment_id: paymentId,
          amount: "₹29",
        },
      )
      .catch(() => {
        console.warn("Email failed, links still available")
        showSuccessModal(email, name, data.pdfUrl, data.sheetUrl, false)
      })
  } catch (err) {
    console.error("[v0] Verification error:", err)
    document.getElementById("loadingModal")?.remove()
    alert("Network error. Please try again or verify your server is running.")
    showPaymentIdModal()
  }
}

function storeVerifiedPayment(paymentData) {
  try {
    let payments = []
    const existing = localStorage.getItem(VERIFIED_PAYMENTS_KEY)

    if (existing) {
      payments = JSON.parse(existing)
    }

    payments.push(paymentData)

    if (payments.length > 5) {
      payments = payments.slice(-5)
    }

    localStorage.setItem(VERIFIED_PAYMENTS_KEY, JSON.stringify(payments))
  } catch (error) {
    console.error("Error storing payment data:", error)
  }
}

function showSuccessModal(email, name, pdfUrl, sheetUrl, emailSent) {
  const emailStatusHTML = emailSent
    ? `
      <div class="email-confirmation-notice">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          <strong>Email Sent!</strong>
          <p>We've sent your Habit Tracker and PDF Guide to <strong>${email}</strong></p>
        </div>
      </div>
    `
    : `
      <div class="email-confirmation-notice" style="background: #fef3c7; border-color: #f59e0b;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/>
          <path d="M12 8v4M12 16h.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <strong style="color: #92400e;">Email Delivery Issue</strong>
          <p style="color: #78350f;">We couldn't send the email, but you can download your files below!</p>
        </div>
      </div>
    `

  const successModalHTML = `
    <div id="successModal" class="modal active">
      <div class="modal-content success-modal-content">
        <button class="modal-close" id="successModalCloseBtn">&times;</button>
        
        <div class="success-icon-large">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="#10b981" fill-opacity="0.15"/>
            <circle cx="40" cy="40" r="32" fill="#10b981" fill-opacity="0.25"/>
            <path d="M25 40l10 10 20-20" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <h2 class="success-title">Payment Successful!</h2>
        
        <div class="user-info-card">
          <div class="user-info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${name}</span>
          </div>
          <div class="user-info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${email}</span>
          </div>
        </div>
        
        ${emailStatusHTML}
        
        <div class="download-section-success">
          <h3>Download Your Files Now</h3>
          <p class="download-description">Access your habit tracker and guide immediately:</p>
          
          <div class="download-buttons-success">
            <a href="${pdfUrl || "/habit-tracker-guide.pdf"}" download class="download-btn-success pdf-btn-success">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div>
                <div class="btn-title-success">Download PDF Guide</div>
                <div class="btn-subtitle-success">Complete setup instructions</div>
              </div>
            </a>
            
            <a href="${sheetUrl || GOOGLE_SHEETS_COPY_URL}" target="_blank" class="download-btn-success sheet-btn-success">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M6 2v12M2 6h12" stroke="currentColor" stroke-width="2"/>
              </svg>
              <div>
                <div class="btn-title-success">Open Habit Tracker</div>
                <div class="btn-subtitle-success">Make your own copy in Google Sheets</div>
              </div>
            </a>
          </div>
        </div>
        
        <div class="success-footer">
          <p>Thank you for your purchase! Start tracking your habits today.</p>
          <button class="btn-close-success" id="successModalCloseFooterBtn">Close</button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", successModalHTML)
  document.body.style.overflow = "hidden"

  const closeBtn = document.getElementById("successModalCloseBtn")
  const closeFooterBtn = document.getElementById("successModalCloseFooterBtn")

  if (closeBtn) {
    closeBtn.addEventListener("click", window.closeSuccessModal)
  }

  if (closeFooterBtn) {
    closeFooterBtn.addEventListener("click", window.closeSuccessModal)
  }

  console.log("[v0] Success modal displayed with close button listeners attached")
}

window.closeSuccessModal = () => {
  // Remove success modal
  const success = document.getElementById("successModal")
  if (success) {
    success.classList.remove("active")
    setTimeout(() => success.remove(), 300)
  }

  // 🔥 REMOVE ALL OTHER MODALS COMPLETELY
  document.querySelectorAll(".modal").forEach((m) => m.remove())

  // Restore page
  document.body.style.overflow = "auto"

  // Reset checkout state safely
  const step1 = document.getElementById("checkoutStep1")
  const step2 = document.getElementById("checkoutStep2")
  if (step1 && step2) {
    step1.style.display = "block"
    step2.style.display = "none"
  }
}
