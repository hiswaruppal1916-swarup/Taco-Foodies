/**
 * TACO Foodies Checkout Engine
 * Manages Buy Now workflow, Dine-In table/guest selection,
 * Home Delivery form, ₹50 Delivery Fee calculation, Cash on Delivery, and WhatsApp order submission.
 */
class CheckoutSystem {
  constructor() {
    this.currentDish = null;
    this.currentMode = 'dine-in'; // 'dine-in' or 'delivery'
    this.fixedDeliveryFee = 50;
    this.selectedGuests = 2;
  }

  init() {
    this.setupEventListeners();
  }

  /**
   * Distance-based delivery fee calculator (Extensible architecture for future upgrades)
   * @param {number} distanceKm 
   * @returns {number} fee in INR
   */
  calculateDeliveryFee(distanceKm = 0) {
    if (!distanceKm || distanceKm <= 3) {
      return 50; // Fixed default for 0-3 km
    } else if (distanceKm <= 6) {
      return 80;
    } else {
      return 120;
    }
  }

  getDeliveryFee() {
    return this.fixedDeliveryFee;
  }

  openCheckoutForDish(dish) {
    this.currentDish = dish;
    this.currentItems = [{
      id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity: 1,
      image: dish.image,
      isVeg: dish.isVeg
    }];
    this.openCheckoutModal();
  }

  openCheckoutForCart() {
    this.currentDish = null;
    this.currentItems = [...cartSystem.cart];
    if (this.currentItems.length === 0) {
      alert('Your cart is empty! Add dishes to your cart first.');
      return;
    }
    this.openCheckoutModal();
  }

  openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;

    this.renderModeSelection();
    modal.classList.add('active');
  }

  closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
  }

  setMode(mode) {
    this.currentMode = mode;
    this.renderCheckoutContent();
  }

  setSelectedGuests(num) {
    this.selectedGuests = num;
    const btns = document.querySelectorAll('.guest-pill-btn');
    btns.forEach(b => {
      if (parseInt(b.dataset.guests, 10) === num) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  getFoodSubtotal() {
    if (!this.currentItems) return 0;
    return this.currentItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  changeItemQuantity(index, delta) {
    if (!this.currentItems || !this.currentItems[index]) return;
    this.currentItems[index].quantity += delta;
    if (this.currentItems[index].quantity < 1) {
      this.currentItems[index].quantity = 1;
    }
    this.renderModeSelection();
  }

  renderModeSelection() {
    const container = document.getElementById('checkoutModalContent');
    if (!container) return;

    const subtotal = this.getFoodSubtotal();
    let qtySelectorHtml = '';
    
    this.currentItems.forEach((item, idx) => {
      const itemTotal = item.price * item.quantity;
      qtySelectorHtml += `
        <div class="checkout-qty-wrapper">
          <div class="checkout-qty-header">
            <span>${item.isVeg ? '🟢' : '🔴'} ${item.name}</span>
            <span class="checkout-price-formula">${item.price === 0 ? 'FREE' : `₹${item.price} × ${item.quantity} = ₹${itemTotal}`}</span>
          </div>
          <div class="checkout-qty-row">
            <span style="font-weight: 700; color: var(--text-secondary); font-size: 0.9rem;">Select Quantity:</span>
            <div class="checkout-qty-control">
              <button type="button" class="checkout-qty-btn" onclick="checkoutSystem.changeItemQuantity(${idx}, -1)" aria-label="Decrease Quantity">-</button>
              <span class="checkout-qty-val">${item.quantity}</span>
              <button type="button" class="checkout-qty-btn" onclick="checkoutSystem.changeItemQuantity(${idx}, 1)" aria-label="Increase Quantity">+</button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="checkout-flow-box">
        <h3 class="checkout-title">⚡ Express Order Checkout</h3>
        
        <!-- Large Mobile-Friendly Quantity Selector -->
        ${qtySelectorHtml}

        <h4 style="font-size: 1rem; margin: 12px 0 10px 0; color: var(--text-primary);">Choose Order Type:</h4>
        <div class="checkout-mode-grid">
          <div class="mode-card ${this.currentMode === 'dine-in' ? 'active' : ''}" onclick="checkoutSystem.setMode('dine-in')">
            <span class="mode-icon">🍽️</span>
            <h4>Dine In</h4>
            <p>Order directly to your table inside TACO Foodies restaurant.</p>
          </div>

          <div class="mode-card ${this.currentMode === 'delivery' ? 'active' : ''}" onclick="checkoutSystem.setMode('delivery')">
            <span class="mode-icon">🏠</span>
            <h4>Home Delivery</h4>
            <p>Fast doorstep delivery in Bhupati Nagar (₹50 Fee).</p>
          </div>
        </div>

        <div id="checkoutStepContainer" style="margin-top: 20px;"></div>
      </div>
    `;

    this.renderCheckoutContent();
  }

  renderCheckoutContent() {
    const stepContainer = document.getElementById('checkoutStepContainer');
    if (!stepContainer) return;

    // Update active class on mode cards
    const cards = document.querySelectorAll('.mode-card');
    cards.forEach(card => {
      if (card.getAttribute('onclick') && card.getAttribute('onclick').includes(this.currentMode)) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    if (this.currentMode === 'dine-in') {
      this.renderDineInForm(stepContainer);
    } else {
      this.renderDeliveryForm(stepContainer);
    }
  }

  renderDineInForm(container) {
    const currentTable = (typeof tableQRSystem !== 'undefined' && tableQRSystem.getTable()) || 1;
    const subtotal = this.getFoodSubtotal();

    container.innerHTML = `
      <div class="dinein-form-box">
        <div class="form-section-title">📍 Table & Guest Details</div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Table Number:</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" id="dineInTableInput" class="form-input" value="${currentTable}" min="1" max="50">
            <button type="button" class="secondary-btn" style="padding: 8px 14px; font-size: 0.82rem;" onclick="tableQRSystem.openTablePicker()">Change Table</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Number of Guests:</label>
          <div class="guest-pills-row">
            <button type="button" class="guest-pill-btn ${this.selectedGuests === 1 ? 'active' : ''}" data-guests="1" onclick="checkoutSystem.setSelectedGuests(1)">👤 1 Guest</button>
            <button type="button" class="guest-pill-btn ${this.selectedGuests === 2 ? 'active' : ''}" data-guests="2" onclick="checkoutSystem.setSelectedGuests(2)">👥 2 Guests</button>
            <button type="button" class="guest-pill-btn ${this.selectedGuests === 3 ? 'active' : ''}" data-guests="3" onclick="checkoutSystem.setSelectedGuests(3)">👨‍👩‍👦 3 Guests</button>
            <button type="button" class="guest-pill-btn ${this.selectedGuests === 4 ? 'active' : ''}" data-guests="4" onclick="checkoutSystem.setSelectedGuests(4)">👨‍👩‍👧‍👦 4 Guests</button>
            <button type="button" class="guest-pill-btn ${this.selectedGuests === 5 ? 'active' : ''}" data-guests="5" onclick="checkoutSystem.setSelectedGuests(5)">🎉 5+ Guests</button>
          </div>
        </div>

        <div class="order-summary-box">
          <h4>Final Dine-In Summary</h4>
          <div class="summary-line"><span>Food Subtotal</span><strong>₹${subtotal}</strong></div>
          <div class="summary-line"><span>Service Charge</span><strong style="color: #4caf50;">FREE (₹0)</strong></div>
          <div class="summary-line total"><span>Total Amount</span><strong>₹${subtotal}</strong></div>
          <div class="payment-badge">Payment Method: <strong>Cash on Delivery / Pay at Table</strong></div>
        </div>

        <button type="button" class="primary-btn full-width" style="padding: 14px; font-size: 1.05rem; justify-content: center; background: linear-gradient(135deg, var(--taco-orange) 0%, #e64a19 100%);" onclick="checkoutSystem.submitDineInOrder()">
          ⚡ Confirm & Place Dine-In Order
        </button>
      </div>
    `;
  }

  renderDeliveryForm(container) {
    const subtotal = this.getFoodSubtotal();
    const deliveryFee = this.getDeliveryFee();
    const grandTotal = subtotal + deliveryFee;
    const advancePct = (window.restaurantPaymentSettings && window.restaurantPaymentSettings.advance_percentage) || 30;
    const advanceAmount = Math.round(grandTotal * (advancePct / 100));
    const remainingAmount = grandTotal - advanceAmount;

    container.innerHTML = `
      <div class="delivery-form-box">
        <div class="form-section-title">🏠 Delivery Address & Customer Details</div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="delNameInput" class="form-input" placeholder="e.g. Rahul Sharma" required>
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number *</label>
            <input type="tel" id="delPhoneInput" class="form-input" placeholder="e.g. 9876543210" required>
          </div>
          <div class="form-group">
            <label class="form-label">House / Building *</label>
            <input type="text" id="delHouseInput" class="form-input" placeholder="e.g. House No. 24, Flat 3B" required>
          </div>
          <div class="form-group">
            <label class="form-label">Area / Village *</label>
            <input type="text" id="delAreaInput" class="form-input" placeholder="e.g. Madha Khali / Bhupati Nagar" required>
          </div>
          <div class="form-group">
            <label class="form-label">PIN Code *</label>
            <input type="text" id="delPinInput" class="form-input" placeholder="e.g. 721425" value="721425" required>
          </div>
          <div class="form-group">
            <label class="form-label">City / State</label>
            <input type="text" id="delCityInput" class="form-input" value="Bhupati Nagar, West Bengal" readonly style="background: rgba(255,255,255,0.04);">
          </div>
          <div class="form-group full-col">
            <label class="form-label">Landmark (Optional)</label>
            <input type="text" id="delLandmarkInput" class="form-input" placeholder="e.g. Near Bus Stand / SBI ATM">
          </div>
        </div>

        <div class="order-summary-box">
          <h4>Home Delivery Payment Summary</h4>
          <div class="summary-line"><span>Food Items Total</span><strong>₹${subtotal}</strong></div>
          <div class="summary-line"><span>Delivery Fee</span><strong>₹${deliveryFee}</strong></div>
          <div class="summary-line total"><span>Grand Total</span><strong>₹${grandTotal}</strong></div>
          <div class="summary-line advance" style="color: var(--fk-yellow); font-weight: 800; border-top: 1px dashed var(--border-glass); padding-top: 6px; margin-top: 6px;">
            <span>Advance Required (${advancePct}%)</span>
            <strong style="color: var(--fk-yellow); font-size: 1.05rem;">₹${advanceAmount}</strong>
          </div>
          <div class="summary-line remaining" style="color: var(--taco-teal);">
            <span>Remaining Amount on Delivery (COD)</span>
            <strong>₹${remainingAmount}</strong>
          </div>
        </div>

        <button type="button" class="primary-btn full-width" style="padding: 14px; font-size: 1.05rem; justify-content: center; background: linear-gradient(135deg, var(--taco-orange) 0%, #e64a19 100%); width: 100%; margin-top: 14px;" onclick="checkoutSystem.submitDeliveryOrder()">
          Continue to Payment ➔
        </button>
      </div>
    `;
  }

  generateDemoQRCodeSVG(orderNumber, advanceAmount) {
    const upiId = (window.restaurantPaymentSettings && window.restaurantPaymentSettings.payment_upi_id) || 'tacofoodies@upi';
    const phone = (window.restaurantPaymentSettings && window.restaurantPaymentSettings.payment_phone_number) || '+91 90000 00000';
    
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" width="300" height="340" style="background:#ffffff; border-radius:16px; font-family:sans-serif;">
      <rect width="300" height="340" rx="16" fill="#ffffff"/>
      
      <rect width="300" height="54" rx="16" fill="#00b4d8"/>
      <text x="150" y="24" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle">TACO FOODIES — PAY ADVANCE</text>
      <text x="150" y="42" fill="#ffefb3" font-size="11" font-weight="bold" text-anchor="middle">Order #${orderNumber} • ₹${advanceAmount} (30%)</text>
      
      <g transform="translate(45, 70)">
        <rect width="210" height="210" fill="#f8f9fa" stroke="#e0e0e0" stroke-width="2" rx="12"/>
        
        <rect x="20" y="20" width="45" height="45" fill="#111111"/>
        <rect x="27" y="27" width="31" height="31" fill="#ffffff"/>
        <rect x="34" y="34" width="17" height="17" fill="#00b4d8"/>
        
        <rect x="145" y="20" width="45" height="45" fill="#111111"/>
        <rect x="152" y="27" width="31" height="31" fill="#ffffff"/>
        <rect x="159" y="34" width="17" height="17" fill="#00b4d8"/>

        <rect x="20" y="145" width="45" height="45" fill="#111111"/>
        <rect x="27" y="152" width="31" height="31" fill="#ffffff"/>
        <rect x="34" y="159" width="17" height="17" fill="#00b4d8"/>

        <rect x="80" y="20" width="12" height="12" fill="#111"/>
        <rect x="100" y="20" width="12" height="12" fill="#111"/>
        <rect x="120" y="20" width="12" height="12" fill="#111"/>
        
        <rect x="80" y="40" width="12" height="12" fill="#111"/>
        <rect x="110" y="40" width="22" height="12" fill="#00b4d8"/>
        
        <rect x="20" y="80" width="12" height="12" fill="#111"/>
        <rect x="40" y="80" width="12" height="12" fill="#111"/>
        <rect x="60" y="80" width="12" height="12" fill="#111"/>
        <rect x="80" y="80" width="25" height="25" fill="#ff5722"/>
        <rect x="115" y="80" width="15" height="15" fill="#111"/>
        <rect x="140" y="80" width="15" height="15" fill="#111"/>
        <rect x="165" y="80" width="25" height="25" fill="#111"/>

        <rect x="20" y="105" width="15" height="15" fill="#111"/>
        <rect x="45" y="105" width="25" height="25" fill="#111"/>
        <rect x="80" y="115" width="15" height="15" fill="#111"/>
        <rect x="105" y="105" width="20" height="20" fill="#00b4d8"/>
        <rect x="135" y="105" width="15" height="15" fill="#111"/>
        <rect x="160" y="115" width="25" height="15" fill="#ff5722"/>

        <rect x="80" y="145" width="15" height="15" fill="#111"/>
        <rect x="105" y="145" width="25" height="15" fill="#111"/>
        <rect x="140" y="145" width="15" height="15" fill="#111"/>
        <rect x="165" y="145" width="25" height="25" fill="#00b4d8"/>

        <rect x="80" y="170" width="25" height="20" fill="#111"/>
        <rect x="115" y="170" width="15" height="20" fill="#ff5722"/>
        <rect x="140" y="170" width="20" height="20" fill="#111"/>

        <rect x="85" y="85" width="40" height="40" rx="8" fill="#ffffff" stroke="#ff5722" stroke-width="2"/>
        <text x="105" y="110" font-size="20" text-anchor="middle">🌮</text>
      </g>

      <rect x="25" y="290" width="250" height="36" rx="8" fill="#fff3cd" stroke="#ffe500" stroke-width="1.5"/>
      <text x="150" y="306" fill="#856404" font-size="11" font-weight="bold" text-anchor="middle">DEMO PHONEPE / UPI QR CODE</text>
      <text x="150" y="320" fill="#555555" font-size="10" text-anchor="middle">UPI ID: ${upiId} • ${phone}</text>
    </svg>
    `;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  downloadQRCode(orderId, advanceAmount) {
    const link = document.createElement('a');
    link.href = 'images/phonepe_real_qr.jpg';
    link.download = `TACO_Foodies_PhonePe_QR_${orderId || 'Advance'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openFullscreenQR(orderId, advanceAmount) {
    let modal = document.getElementById('fullscreenQRModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fullscreenQRModal';
      modal.className = 'modal-backdrop';
      modal.style.zIndex = '99999';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-box" style="max-width: 380px; text-align: center; padding: 20px;">
        <button type="button" class="close-modal-btn" onclick="document.getElementById('fullscreenQRModal').classList.remove('active')">✕</button>
        <h3 style="font-size: 1.15rem; color: var(--fk-yellow); margin-bottom: 12px;">📱 Scan PhonePe QR Code</h3>
        <img src="images/phonepe_real_qr.jpg" alt="PhonePe QR Code" style="width: 100%; max-width: 300px; border-radius: 12px; margin-bottom: 14px; background: #ffffff; padding: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 14px;">Scan with PhonePe, Google Pay, Paytm, or any UPI app to pay ₹${advanceAmount || 0}.</p>
        <button class="primary-btn full-width" style="justify-content: center;" onclick="checkoutSystem.downloadQRCode('${orderId}', ${advanceAmount})">⬇️ Download QR Code</button>
      </div>
    `;

    modal.classList.add('active');
  }

  togglePolicyAgreement(isChecked) {
    const btn = document.getElementById('submitAdvancePaymentBtn');
    if (btn) {
      btn.disabled = !isChecked;
      if (isChecked) {
        btn.classList.remove('disabled');
      } else {
        btn.classList.add('disabled');
      }
    }
  }

  showAdvancePaymentPage(order) {
    const container = document.getElementById('checkoutModalContent');
    if (!container || !order) return;

    const orderId = order.id || order.order_number || 'TF-4560';
    const total = order.grandTotal || 0;
    const advance = order.advanceAmount || Math.round(total * 0.3);
    const remaining = order.remainingAmount || (total - advance);

    const settings = window.restaurantPaymentSettings || {};
    const advancePct = settings.advance_percentage || 30;

    container.innerHTML = `
      <div class="advance-payment-box" style="display: flex; flex-direction: column; gap: 16px;">
        <div class="checkout-header-box" style="text-align: center;">
          <span style="font-size: 2.2rem;">💳</span>
          <h3 class="checkout-title" style="margin-top: 4px;">Pay ${advancePct}% Advance Payment</h3>
          <span class="order-conf-id-badge" style="font-size: 0.9rem;">Order ID: #${orderId}</span>
        </div>

        <!-- 1. Order Financial Breakdown Card -->
        <div class="order-summary-box highlight" style="background: rgba(255, 229, 0, 0.05); border-color: rgba(255, 229, 0, 0.3);">
          <div class="summary-line"><span>Total Order Value</span><strong>₹${total}</strong></div>
          <div class="summary-line" style="color: var(--fk-yellow); font-weight: 800;">
            <span>30% Advance Required</span>
            <strong style="color: var(--fk-yellow); font-size: 1.15rem;">₹${advance}</strong>
          </div>
          <div class="summary-line" style="color: var(--taco-teal);">
            <span>Remaining Amount on Delivery (COD)</span>
            <strong>₹${remaining}</strong>
          </div>
        </div>

        <!-- 2. Restaurant Policy Card -->
        <div class="policy-notice-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 14px;">
          <h4 style="font-size: 0.92rem; color: var(--fk-yellow); margin-bottom: 8px; font-weight: 800;">📜 Restaurant Home Delivery Policy</h4>
          <p style="font-size: 0.82rem; color: var(--text-primary); margin-bottom: 6px;">
            📌 <strong>30% Advance Payment Required:</strong> To confirm a Home Delivery order, a 30% advance payment is required.
          </p>
          <p style="font-size: 0.82rem; color: #ffab91; margin-bottom: 6px;">
            ⚠️ <strong>Cancellation Policy:</strong> Once the 30% advance payment has been paid, the advance amount is non-refundable if the customer cancels the order.
          </p>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 12px;">
            🚚 After the advance payment is verified, the remaining amount (₹${remaining}) must be paid according to the restaurant's delivery payment policy on delivery.
          </p>

          <div class="policy-checkbox-wrapper" style="display: flex; align-items: flex-start; gap: 8px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: var(--radius-sm); border: 1px solid rgba(255,229,0,0.2);">
            <input type="checkbox" id="policyAgreeCheckbox" style="margin-top: 3px; cursor: pointer; transform: scale(1.2);" onchange="checkoutSystem.togglePolicyAgreement(this.checked)">
            <label for="policyAgreeCheckbox" style="font-size: 0.82rem; color: var(--fk-yellow); font-weight: 700; cursor: pointer; line-height: 1.3;">
              I have read and agree to the Home Delivery Policy and Cancellation Policy.
            </label>
          </div>
        </div>

        <!-- 3. Real PhonePe QR Code Card -->
        <div class="qr-payment-card" style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 16px; text-align: center;">
          <div style="font-size: 0.88rem; font-weight: 800; color: var(--taco-teal); margin-bottom: 12px;">
            📱 Scan QR Code to Pay Advance (₹${advance})
          </div>

          <div style="position: relative; display: inline-block; margin-bottom: 14px;">
            <img src="images/phonepe_real_qr.jpg" alt="PhonePe Payment QR Code" style="width: 240px; height: 240px; border-radius: 12px; border: 2px solid var(--border-glass); box-shadow: 0 4px 18px rgba(0,0,0,0.4); object-fit: contain; background: #ffffff; padding: 6px;">
          </div>

          <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 4px;">
            <button type="button" class="secondary-btn" style="padding: 8px 14px; font-size: 0.82rem;" onclick="checkoutSystem.downloadQRCode('${orderId}', ${advance})">
              ⬇️ Download QR Code
            </button>
            <button type="button" class="secondary-btn" style="padding: 8px 14px; font-size: 0.82rem;" onclick="checkoutSystem.openFullscreenQR('${orderId}', ${advance})">
              🔍 View Fullscreen
            </button>
          </div>
        </div>

        <!-- 4. Step-by-Step Instructions Card -->
        <div class="instructions-card" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 12px 14px;">
          <h5 style="font-size: 0.85rem; color: var(--fk-yellow); margin-bottom: 8px; font-weight: 800;">📋 Payment Instructions:</h5>
          <ol style="font-size: 0.8rem; color: var(--text-secondary); margin: 0; padding-left: 18px; line-height: 1.5;">
            <li>Scan the QR code using PhonePe or another supported UPI app.</li>
            <li>Pay the exact advance amount of <strong>₹${advance}</strong>.</li>
            <li>Keep the payment confirmation/reference available.</li>
            <li>Return to this website.</li>
            <li>Click "I Have Made the Advance Payment" below.</li>
          </ol>
        </div>

        <!-- 5. Payment Submission Action Button -->
        <button id="submitAdvancePaymentBtn" type="button" class="primary-btn full-width disabled" disabled style="padding: 14px; font-size: 1.05rem; justify-content: center; width: 100%; opacity: 0.6;" onclick="checkoutSystem.submitPaymentVerification('${orderId}')">
          I Have Made the Advance Payment ➔
        </button>
      </div>
    `;
  }

  async submitPaymentVerification(orderId) {
    if (!orderId) return;

    // Duplicate Click Protection
    const btn = document.getElementById('submitAdvancePaymentBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Payment verification submitted ✓';
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    }

    // Update order payment status in Supabase
    let success = false;
    if (typeof supabaseService !== 'undefined') {
      success = await supabaseService.updateOrderPaymentStatus(orderId, 'verification_pending', 'payment_verification_pending');
    }

    if (!success && typeof supabaseService !== 'undefined') {
      alert('Unable to submit your payment verification. Please check your network connection and try again.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'I Have Made the Advance Payment ➔';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
      return;
    }

    const container = document.getElementById('checkoutModalContent');
    if (!container) return;

    container.innerHTML = `
      <div class="order-confirmation-box" style="text-align: center; padding: 20px;">
        <span class="order-conf-icon" style="font-size: 3rem; display: block; margin-bottom: 10px;">⏳</span>
        <h3 class="order-conf-title" style="font-size: 1.3rem; color: var(--fk-yellow); margin-bottom: 6px;">Payment Verification Pending</h3>
        <span class="order-conf-id-badge" style="font-size: 0.88rem;">Order ID: #${orderId}</span>
        <p class="order-conf-message" style="font-size: 0.88rem; color: var(--text-secondary); margin: 14px 0;">
          Your payment information has been submitted. The restaurant owner will verify the advance payment shortly.
        </p>

        <div class="verification-summary-box" style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 14px; margin-bottom: 18px; text-align: left;">
          <div class="summary-line" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;"><span>Status:</span> <strong style="color: var(--fk-yellow);">⏳ Verification Pending</strong></div>
          <div class="summary-line" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;"><span>Advance Submitted:</span> <strong style="color: #4caf50;">30% Advance</strong></div>
          <div class="summary-line" style="font-size: 0.85rem; color: var(--text-secondary);"><span>Real-Time Sync:</span> <strong>Supabase WebSocket Sync</strong></div>
        </div>

        <button class="primary-btn full-width" style="justify-content: center; padding: 14px; font-size: 1rem; width: 100%;" onclick="checkoutSystem.closeCheckoutModal(); orderTracker.openMyOrdersModal();">
          📦 Track My Orders
        </button>
      </div>
    `;
  }

  showOrderConfirmationScreen(order) {
    const container = document.getElementById('checkoutModalContent');
    if (!container) return;

    container.innerHTML = `
      <div class="order-confirmation-box">
        <span class="order-conf-icon">🎉</span>
        <h3 class="order-conf-title">Order Submitted Successfully!</h3>
        <span class="order-conf-id-badge">Order ID: #${order.id}</span>
        <p class="order-conf-message">
          Please wait while the restaurant reviews your order. You can track all active orders in real time.
        </p>
        <button class="primary-btn" style="width: 100%; justify-content: center; padding: 14px; font-size: 1rem; margin-top: 10px;" onclick="checkoutSystem.closeCheckoutModal(); orderTracker.openMyOrdersModal();">
          📦 Track My Orders
        </button>
      </div>
    `;
  }

  async submitDineInOrder() {
    const tableInput = document.getElementById('dineInTableInput');
    const tableNum = tableInput ? parseInt(tableInput.value, 10) : 1;
    const guests = (this.selectedGuests !== null && this.selectedGuests !== undefined && !isNaN(this.selectedGuests)) ? parseInt(this.selectedGuests, 10) : 2;
    const subtotal = this.getFoodSubtotal();

    const orderData = {
      type: 'Dine-In',
      table: tableNum,
      guests: guests,
      items: this.currentItems,
      foodTotal: subtotal,
      deliveryFee: 0,
      grandTotal: subtotal,
      status: 'pending',
      paymentStatus: 'paid',
      advanceAmount: 0,
      remainingAmount: subtotal,
      paymentMethod: 'Cash on Delivery / Pay at Table'
    };

    // Create order in Supabase database & local tracker automatically
    let order = null;
    if (typeof supabaseService !== 'undefined') {
      order = await supabaseService.createOrder(orderData);
    }
    
    if (order && typeof orderTracker !== 'undefined') {
      orderTracker.registerOrder(order);
    }

    // Clear cart if ordered from cart
    if (!this.currentDish) {
      cartSystem.clearCart();
    }

    // Display Order Confirmation Screen directly (No WhatsApp window popup)
    this.showOrderConfirmationScreen(order || { id: 'TF-1000' });
  }

  async submitDeliveryOrder() {
    const name = document.getElementById('delNameInput')?.value.trim();
    const phone = document.getElementById('delPhoneInput')?.value.trim();
    const house = document.getElementById('delHouseInput')?.value.trim();
    const area = document.getElementById('delAreaInput')?.value.trim();
    const city = document.getElementById('delCityInput')?.value.trim();
    const landmark = document.getElementById('delLandmarkInput')?.value.trim();
    const pin = document.getElementById('delPinInput')?.value.trim() || '721425';

    if (!name || !phone || !house || !area) {
      alert('Please fill out all required delivery fields (Full Name, Phone, House/Building, Area/Village)!');
      return;
    }

    const subtotal = this.getFoodSubtotal();
    const deliveryFee = this.getDeliveryFee();
    const grandTotal = subtotal + deliveryFee;
    const advancePct = (window.restaurantPaymentSettings && window.restaurantPaymentSettings.advance_percentage) || 30;
    const advanceAmount = Math.round(grandTotal * (advancePct / 100));
    const remainingAmount = grandTotal - advanceAmount;

    const fullAddress = `${house}, ${area}, ${city}, PIN: ${pin}${landmark ? ' (Landmark: ' + landmark + ')' : ''}`;

    const orderData = {
      type: 'Home Delivery',
      customerName: name,
      phone: phone,
      address: fullAddress,
      guests: 1,
      items: this.currentItems,
      foodTotal: subtotal,
      deliveryFee: deliveryFee,
      grandTotal: grandTotal,
      status: 'payment_pending',
      paymentStatus: 'pending',
      advanceAmount: advanceAmount,
      remainingAmount: remainingAmount,
      paymentMethod: '30% Advance + COD'
    };

    // STEP 1 REQUIREMENT: Immediately create permanent order record in Supabase BEFORE payment page
    let order = null;
    if (typeof supabaseService !== 'undefined') {
      order = await supabaseService.createOrder(orderData);
    }
    
    if (!order) {
      alert('Unable to create order in database. Please check your internet connection and try again.');
      return;
    }

    if (typeof orderTracker !== 'undefined') {
      orderTracker.registerOrder(order);
    }

    if (!this.currentDish) {
      cartSystem.clearCart();
    }

    // STEP 4 REQUIREMENT: Display Advance Payment Page using the ALREADY-CREATED Order
    this.showAdvancePaymentPage(order);
  }

  setupEventListeners() {
    const modal = document.getElementById('checkoutModal');
    const closeBtn = document.getElementById('closeCheckoutModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCheckoutModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeCheckoutModal();
      });
    }
  }
}

const checkoutSystem = new CheckoutSystem();
document.addEventListener('DOMContentLoaded', () => checkoutSystem.init());
