/**
 * TACO Foodies Real-Time Order Tracking & Owner Action Engine
 * Provides live order tracking, status progress stepper, preparation timer,
 * owner quick-action status updates, and multi-tab live sync via LocalStorage events.
 */
class OrderTracker {
  constructor() {
    this.storageKey = 'taco_foodies_orders_v1';
    this.activeOrderId = localStorage.getItem('taco_foodies_current_order_id') || null;
    this.statusMap = {
      'received': { label: 'Order Received', icon: '🟡', desc: 'Waiting for restaurant confirmation...', step: 1 },
      'preparing': { label: 'Preparing Your Order', icon: '👨‍🍳', desc: 'Chefs are crafting your food fresh in the kitchen!', step: 2 },
      'confirmed': { label: 'Order Confirmed', icon: '✅', desc: 'Restaurant confirmed your order & prep is on schedule.', step: 3 },
      'transit_ready': { label: 'Out for Delivery / Ready to Serve', icon: '🚚', desc: 'Food is sizzling hot & on its way to your table/doorstep!', step: 4 },
      'completed': { label: 'Order Completed', icon: '🎉', desc: 'Thank you for dining with TACO Foodies!', step: 5 },
      'unavailable': { label: 'Item Unavailable', icon: '❌', desc: 'Sorry, one or more items are out of stock.', step: 0 }
    };
  }

  init() {
    this.setupStorageSyncListener();
    this.setupEventListeners();
  }

  createOrder(orderData) {
    const id = 'TF-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: id,
      timestamp: new Date().toISOString(),
      status: 'received',
      type: orderData.type,
      customerName: orderData.customerName || 'Dine-In Customer',
      phone: orderData.phone || '',
      table: orderData.table || null,
      guests: orderData.guests || null,
      address: orderData.address || null,
      items: orderData.items || [],
      foodTotal: orderData.foodTotal || 0,
      deliveryFee: orderData.deliveryFee || 0,
      grandTotal: orderData.grandTotal || 0,
      paymentMethod: orderData.paymentMethod || 'Cash on Delivery',
      prepTime: '15–20 minutes'
    };

    const orders = this.getAllOrders();
    orders[id] = newOrder;
    localStorage.setItem(this.storageKey, JSON.stringify(orders));
    localStorage.setItem('taco_foodies_current_order_id', id);
    this.activeOrderId = id;

    return newOrder;
  }

  getAllOrders() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  getOrder(id) {
    const orders = this.getAllOrders();
    return orders[id] || null;
  }

  updateOrderStatus(id, newStatus) {
    const orders = this.getAllOrders();
    if (!orders[id]) return;

    orders[id].status = newStatus;
    orders[id].lastUpdated = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(orders));

    // Dispatch local custom event for current window
    window.dispatchEvent(new CustomEvent('orderStatusChanged', { detail: orders[id] }));

    // Re-render tracker if open
    if (this.activeOrderId === id) {
      this.renderTrackerContent(orders[id]);
    }
  }

  setupStorageSyncListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && this.activeOrderId) {
        const order = this.getOrder(this.activeOrderId);
        if (order) {
          this.renderTrackerContent(order);
          const info = this.statusMap[order.status] || { label: order.status, icon: '🔔' };
          cartSystem.showToastNotification(`${info.icon} Status Update: ${info.label}`);
        }
      }
    });

    window.addEventListener('orderStatusChanged', (e) => {
      const order = e.detail;
      const info = this.statusMap[order.status] || { label: order.status, icon: '🔔' };
      cartSystem.showToastNotification(`${info.icon} Status Update: ${info.label}`);
    });
  }

  openTrackerModal(orderId = null) {
    const targetId = orderId || this.activeOrderId || localStorage.getItem('taco_foodies_current_order_id');
    if (!targetId) {
      alert('No active order found. Place a new order first!');
      return;
    }

    const order = this.getOrder(targetId);
    if (!order) {
      alert('Order details not found.');
      return;
    }

    this.activeOrderId = targetId;
    const modal = document.getElementById('orderTrackerModal');
    if (!modal) return;

    this.renderTrackerContent(order);
    modal.classList.add('active');
  }

  closeTrackerModal() {
    const modal = document.getElementById('orderTrackerModal');
    if (modal) modal.classList.remove('active');
  }

  renderTrackerContent(order) {
    const container = document.getElementById('orderTrackerContent');
    if (!container) return;

    const currentStatusInfo = this.statusMap[order.status] || this.statusMap['received'];
    const isDelivery = order.type === 'Home Delivery';

    let itemsHtml = '';
    order.items.forEach(item => {
      itemsHtml += `
        <div class="tracker-item-row">
          <span>${item.name} (x${item.quantity})</span>
          <strong>₹${item.price * item.quantity}</strong>
        </div>
      `;
    });

    const isStep1Active = currentStatusInfo.step >= 1 ? 'active' : '';
    const isStep2Active = currentStatusInfo.step >= 2 ? 'active' : '';
    const isStep3Active = currentStatusInfo.step >= 3 ? 'active' : '';
    const isStep4Active = currentStatusInfo.step >= 4 ? 'active' : '';
    const isStep5Active = currentStatusInfo.step >= 5 ? 'active' : '';

    container.innerHTML = `
      <div class="tracker-card">
        <div class="tracker-header-box">
          <div class="tracker-id-row">
            <span class="badge-taco-yellow">LIVE ORDER TRACKER</span>
            <span class="tracker-id">ORDER #${order.id}</span>
          </div>
          <h3 class="tracker-status-title">
            <span class="status-icon">${currentStatusInfo.icon}</span> ${currentStatusInfo.label}
          </h3>
          <p class="tracker-status-desc">${currentStatusInfo.desc}</p>
        </div>

        <div class="prep-timer-box">
          <span class="timer-icon">⏳</span>
          <div>
            <span class="prep-label">Estimated Preparation Time:</span>
            <strong class="prep-val">15–20 minutes</strong>
          </div>
        </div>

        <!-- Order Progress Stepper -->
        <div class="tracker-stepper">
          <div class="step-item ${isStep1Active}">
            <div class="step-dot">1</div>
            <span class="step-name">Received</span>
          </div>
          <div class="step-line ${isStep2Active}"></div>

          <div class="step-item ${isStep2Active}">
            <div class="step-dot">2</div>
            <span class="step-name">Preparing</span>
          </div>
          <div class="step-line ${isStep3Active}"></div>

          <div class="step-item ${isStep3Active}">
            <div class="step-dot">3</div>
            <span class="step-name">Confirmed</span>
          </div>
          <div class="step-line ${isStep4Active}"></div>

          <div class="step-item ${isStep4Active}">
            <div class="step-dot">4</div>
            <span class="step-name">${isDelivery ? 'Delivery' : 'Serving'}</span>
          </div>
          <div class="step-line ${isStep5Active}"></div>

          <div class="step-item ${isStep5Active}">
            <div class="step-dot">5</div>
            <span class="step-name">Completed</span>
          </div>
        </div>

        <!-- Order Details Card -->
        <div class="tracker-details-box">
          <div class="details-section-title">📦 Order Summary (${order.type})</div>
          
          ${isDelivery ? `
            <div class="info-row"><span>Customer Name:</span> <strong>${order.customerName}</strong></div>
            <div class="info-row"><span>Phone Number:</span> <strong>${order.phone}</strong></div>
            <div class="info-row"><span>Delivery Address:</span> <strong>${order.address}</strong></div>
          ` : `
            <div class="info-row"><span>Table Number:</span> <strong>Table ${order.table}</strong></div>
            <div class="info-row"><span>Number of Guests:</span> <strong>${order.guests} Guests</strong></div>
          `}

          <div class="tracker-items-list">
            ${itemsHtml}
          </div>

          <div class="tracker-calc-box">
            <div class="calc-row"><span>Food Subtotal</span><strong>₹${order.foodTotal}</strong></div>
            ${isDelivery ? `<div class="calc-row"><span>Delivery Fee</span><strong>₹${order.deliveryFee}</strong></div>` : ''}
            <div class="calc-row grand-total"><span>Grand Total</span><strong>₹${order.grandTotal}</strong></div>
            <div class="payment-note">Payment Method: <strong>${order.paymentMethod}</strong></div>
          </div>
        </div>

        <!-- Restaurant Owner Action Control Bar (For live testing / status update) -->
        <div class="owner-control-panel">
          <div class="owner-panel-title">⚙️ Restaurant Owner Quick Status Action</div>
          <div class="owner-status-buttons">
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'received')">🟡 Received</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'preparing')">👨‍🍳 Preparing</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'confirmed')">✅ Confirmed</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'transit_ready')">${isDelivery ? '🚚 Delivery' : '🍽️ Ready'}</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'completed')">🎉 Completed</button>
            <button class="owner-act-btn cancel" onclick="orderTracker.updateOrderStatus('${order.id}', 'unavailable')">❌ Unavailable</button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const modal = document.getElementById('orderTrackerModal');
    const closeBtn = document.getElementById('closeTrackerModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeTrackerModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeTrackerModal();
      });
    }
  }
}

const orderTracker = new OrderTracker();
document.addEventListener('DOMContentLoaded', () => orderTracker.init());
