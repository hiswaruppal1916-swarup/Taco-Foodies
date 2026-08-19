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

  renderModeSelection() {
    const container = document.getElementById('checkoutModalContent');
    if (!container) return;

    const subtotal = this.getFoodSubtotal();
    let itemsSummaryHtml = '';
    this.currentItems.forEach(item => {
      itemsSummaryHtml += `
        <div class="checkout-item-chip">
          <span>${item.isVeg ? '🟢' : '🔴'} ${item.name} (x${item.quantity})</span>
          <strong>₹${item.price * item.quantity}</strong>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="checkout-flow-box">
        <h3 class="checkout-title">⚡ Express Order Checkout</h3>
        
        <div class="checkout-items-summary">
          <div class="summary-label">Order Items:</div>
          ${itemsSummaryHtml}
          <div class="summary-subtotal">Food Total: <strong>₹${subtotal}</strong></div>
        </div>

        <h4 style="font-size: 1rem; margin: 16px 0 10px 0; color: var(--text-primary);">Choose Order Type:</h4>
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
      if (card.getAttribute('onclick').includes(this.currentMode)) {
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

        <button type="button" class="whatsapp-place-btn" onclick="checkoutSystem.submitDineInOrder()">
          💬 Confirm & Place Dine-In Order via WhatsApp
        </button>
      </div>
    `;
  }

  renderDeliveryForm(container) {
    const subtotal = this.getFoodSubtotal();
    const deliveryFee = this.getDeliveryFee();
    const grandTotal = subtotal + deliveryFee;

    container.innerHTML = `
      <div class="delivery-form-box">
        <div class="form-section-title">🏠 Delivery Address (Bhupati Nagar Area)</div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="delNameInput" class="form-input" placeholder="e.g. Preetam Pal" required>
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number *</label>
            <input type="tel" id="delPhoneInput" class="form-input" placeholder="e.g. 9876543210" required>
          </div>
          <div class="form-group">
            <label class="form-label">House / Flat No. *</label>
            <input type="text" id="delHouseInput" class="form-input" placeholder="e.g. H-24, Ground Floor" required>
          </div>
          <div class="form-group">
            <label class="form-label">Street / Colony *</label>
            <input type="text" id="delStreetInput" class="form-input" placeholder="e.g. Main Market Road" required>
          </div>
          <div class="form-group">
            <label class="form-label">Area / Village *</label>
            <input type="text" id="delAreaInput" class="form-input" placeholder="e.g. Madha Khali / Bhupati Nagar" required>
          </div>
          <div class="form-group">
            <label class="form-label">City *</label>
            <input type="text" id="delCityInput" class="form-input" value="Bhupati Nagar, West Bengal" readonly style="background: rgba(255,255,255,0.04);">
          </div>
          <div class="form-group full-col">
            <label class="form-label">Landmark (Optional)</label>
            <input type="text" id="delLandmarkInput" class="form-input" placeholder="e.g. Near Bus Stand / SBI ATM">
          </div>
        </div>

        <div class="order-summary-box">
          <h4>Home Delivery Order Summary</h4>
          <div class="summary-line"><span>Food Items Total</span><strong>₹${subtotal}</strong></div>
          <div class="summary-line"><span>Estimated Delivery Fee</span><strong>₹${deliveryFee}</strong></div>
          <div class="summary-line total"><span>Grand Total</span><strong>₹${grandTotal}</strong></div>
          <div class="payment-badge">Payment Method: <strong>Cash on Delivery Only</strong></div>
        </div>

        <button type="button" class="whatsapp-place-btn" onclick="checkoutSystem.submitDeliveryOrder()">
          🚚 Place Home Delivery Order via WhatsApp
        </button>
      </div>
    `;
  }

  submitDineInOrder() {
    const tableInput = document.getElementById('dineInTableInput');
    const tableNum = tableInput ? parseInt(tableInput.value, 10) : 1;
    const guests = this.selectedGuests || 2;
    const subtotal = this.getFoodSubtotal();

    const orderData = {
      type: 'Dine-In',
      table: tableNum,
      guests: guests,
      items: this.currentItems,
      foodTotal: subtotal,
      deliveryFee: 0,
      grandTotal: subtotal,
      paymentMethod: 'Cash on Delivery / Pay at Table'
    };

    // Initialize tracking order
    const order = orderTracker.createOrder(orderData);
    this.closeCheckoutModal();

    // Clear cart if ordered from cart
    if (!this.currentDish) {
      cartSystem.clearCart();
    }

    // Format WhatsApp message
    let msg = `*NEW DINE-IN ORDER - TACO FOODIES*\n`;
    msg += `-----------------------------\n`;
    msg += `📍 TABLE NUMBER: ${tableNum}\n`;
    msg += `👥 GUESTS: ${guests} Diners\n`;
    msg += `🆔 ORDER ID: #${order.id}\n`;
    msg += `-----------------------------\n\n`;
    msg += `*ITEMS ORDERED:*\n`;
    this.currentItems.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}\n`;
    });
    msg += `\n-----------------------------\n`;
    msg += `*TOTAL AMOUNT: ₹${subtotal}*\n`;
    msg += `PAYMENT: Cash on Delivery / Pay at Table\n`;
    msg += `-----------------------------\n`;
    msg += `Please confirm table order & start cooking! 🌮🍜`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/918400310013?text=${encodedMsg}`, '_blank');

    // Show tracking page
    setTimeout(() => {
      orderTracker.openTrackerModal(order.id);
    }, 500);
  }

  submitDeliveryOrder() {
    const name = document.getElementById('delNameInput')?.value.trim();
    const phone = document.getElementById('delPhoneInput')?.value.trim();
    const house = document.getElementById('delHouseInput')?.value.trim();
    const street = document.getElementById('delStreetInput')?.value.trim();
    const area = document.getElementById('delAreaInput')?.value.trim();
    const city = document.getElementById('delCityInput')?.value.trim();
    const landmark = document.getElementById('delLandmarkInput')?.value.trim();

    if (!name || !phone || !house || !street || !area) {
      alert('Please fill out all required delivery fields (Name, Phone, House No, Street, Area)!');
      return;
    }

    const subtotal = this.getFoodSubtotal();
    const deliveryFee = this.getDeliveryFee();
    const grandTotal = subtotal + deliveryFee;

    const fullAddress = `${house}, ${street}, ${area}, ${city}${landmark ? ' (Landmark: ' + landmark + ')' : ''}`;

    const orderData = {
      type: 'Home Delivery',
      customerName: name,
      phone: phone,
      address: fullAddress,
      items: this.currentItems,
      foodTotal: subtotal,
      deliveryFee: deliveryFee,
      grandTotal: grandTotal,
      paymentMethod: 'Cash on Delivery'
    };

    const order = orderTracker.createOrder(orderData);
    this.closeCheckoutModal();

    if (!this.currentDish) {
      cartSystem.clearCart();
    }

    // Format WhatsApp message
    let msg = `*NEW HOME DELIVERY ORDER - TACO FOODIES*\n`;
    msg += `-----------------------------\n`;
    msg += `👤 CUSTOMER: ${name}\n`;
    msg += `📞 PHONE: ${phone}\n`;
    msg += `🏠 ADDRESS: ${fullAddress}\n`;
    msg += `🆔 ORDER ID: #${order.id}\n`;
    msg += `-----------------------------\n\n`;
    msg += `*ORDER ITEMS:*\n`;
    this.currentItems.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}\n`;
    });
    msg += `\n-----------------------------\n`;
    msg += `Food Total: ₹${subtotal}\n`;
    msg += `Delivery Charge: ₹${deliveryFee}\n`;
    msg += `*GRAND TOTAL: ₹${grandTotal}*\n`;
    msg += `PAYMENT: Cash on Delivery\n`;
    msg += `-----------------------------\n`;
    msg += `Please deliver fresh & hot! 🚚🌮`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/918400310013?text=${encodedMsg}`, '_blank');

    setTimeout(() => {
      orderTracker.openTrackerModal(order.id);
    }, 500);
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
