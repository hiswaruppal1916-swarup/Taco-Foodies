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
      'received': { 
        label: 'Waiting for restaurant confirmation', 
        icon: '⏳', 
        toast: '⏳ Order submitted! Waiting for restaurant confirmation...', 
        desc: 'Please wait while the restaurant reviews your order.', 
        step: 1 
      },
      'preparing': { 
        label: 'Preparing your order', 
        icon: '👨‍🍳', 
        toast: '👨‍🍳 Your food is being prepared.', 
        desc: 'Chefs are crafting your food fresh in the kitchen!', 
        step: 2 
      },
      'confirmed': { 
        label: 'Order confirmed', 
        icon: '✅', 
        toast: '✅ Your order has been accepted.', 
        desc: 'Restaurant confirmed your order & prep is on schedule.', 
        step: 3 
      },
      'transit_ready': { 
        label: 'Out for delivery / Ready to serve', 
        icon: '🚚', 
        toast: '🚚 Your order is on the way / 🍽️ Ready to serve.', 
        desc: 'Food is sizzling hot & ready for you!', 
        step: 4 
      },
      'completed': { 
        label: 'Order completed', 
        icon: '🎉', 
        toast: '🎉 Your order has been completed!', 
        desc: 'Thank you for dining with TACO Foodies!', 
        step: 5 
      },
      'unavailable': { 
        label: 'Item unavailable', 
        icon: '❌', 
        toast: '❌ This item is currently unavailable.', 
        desc: 'Sorry, the restaurant could not fulfill this item at the moment.', 
        step: 0 
      }
    };
  }

  init() {
    this.setupStorageSyncListener();
    this.setupEventListeners();
  }

  registerOrder(newOrder) {
    if (!newOrder || !newOrder.id) return newOrder;

    const orders = this.getAllOrders();
    orders[newOrder.id] = newOrder;
    localStorage.setItem(this.storageKey, JSON.stringify(orders));
    localStorage.setItem('taco_foodies_current_order_id', newOrder.id);
    this.activeOrderId = newOrder.id;

    // Subscribe to Supabase Realtime changes for this order
    if (typeof supabaseService !== 'undefined') {
      supabaseService.subscribeToOrderUpdates(newOrder.id, (updatedDbRecord) => {
        if (updatedDbRecord && updatedDbRecord.status) {
          this.updateOrderStatus(newOrder.id, updatedDbRecord.status);
        }
      });
    }

    if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
      cartSystem.showToastNotification(`🎉 Order #${newOrder.id} submitted successfully!`);
    }

    return newOrder;
  }

  createOrder(orderData) {
    const id = 'TF-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: id,
      timestamp: new Date().toISOString(),
      status: 'pending',
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

    return this.registerOrder(newOrder);
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
          const info = this.statusMap[order.status] || { toast: `Status: ${order.status}`, icon: '🔔' };
          if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
            cartSystem.showToastNotification(info.toast);
          }
        }
      }
    });

    window.addEventListener('orderStatusChanged', (e) => {
      const order = e.detail;
      const info = this.statusMap[order.status] || { toast: `Status: ${order.status}`, icon: '🔔' };
      if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
        cartSystem.showToastNotification(info.toast);
      }
    });
  }

  openTrackerModal(orderId = null) {
    const targetId = orderId || this.activeOrderId || localStorage.getItem('taco_foodies_current_order_id');
    const modal = document.getElementById('orderTrackerModal');
    if (!modal) return;

    const container = document.getElementById('orderTrackerContent');
    if (!targetId || !this.getOrder(targetId)) {
      // Hidden tracking timeline state if no submitted order exists
      if (container) {
        container.innerHTML = `
          <div class="empty-cart-state" style="padding: 40px 20px;">
            <span class="empty-icon">🛵</span>
            <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No Active Order to Track</h3>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px;">
              Your order tracker will become active automatically once you confirm and submit an order.
            </p>
            <button class="primary-btn" onclick="orderTracker.closeTrackerModal(); window.location.href='#digitalMenuSection';">
              Browse Menu & Order
            </button>
          </div>
        `;
      }
      modal.classList.add('active');
      return;
    }

    const order = this.getOrder(targetId);
    this.activeOrderId = targetId;
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

    const step4Label = isDelivery ? '🚚 Out for delivery' : '🍽️ Ready to serve';
    const statusDisplayLabel = (order.status === 'transit_ready') ? (isDelivery ? '🚚 Out for delivery' : '🍽️ Ready to serve') : currentStatusInfo.label;

    container.innerHTML = `
      <div class="tracker-card">
        <div class="tracker-header-box">
          <div class="tracker-id-row">
            <span class="badge-taco-yellow">LIVE ORDER TRACKER</span>
            <span class="tracker-id">ORDER #${order.id}</span>
          </div>
          <h3 class="tracker-status-title">
            <span class="status-icon">${currentStatusInfo.icon}</span> ${statusDisplayLabel}
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
            <span class="step-name">⏳ Confirmation</span>
          </div>
          <div class="step-line ${isStep2Active}"></div>

          <div class="step-item ${isStep2Active}">
            <div class="step-dot">2</div>
            <span class="step-name">👨‍🍳 Preparing</span>
          </div>
          <div class="step-line ${isStep3Active}"></div>

          <div class="step-item ${isStep3Active}">
            <div class="step-dot">3</div>
            <span class="step-name">✅ Confirmed</span>
          </div>
          <div class="step-line ${isStep4Active}"></div>

          <div class="step-item ${isStep4Active}">
            <div class="step-dot">4</div>
            <span class="step-name">${isDelivery ? '🚚 Delivery' : '🍽️ Serving'}</span>
          </div>
          <div class="step-line ${isStep5Active}"></div>

          <div class="step-item ${isStep5Active}">
            <div class="step-dot">5</div>
            <span class="step-name">🎉 Completed</span>
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

        <!-- Restaurant Owner Action Control Bar (For status automation & testing) -->
        <div class="owner-control-panel">
          <div class="owner-panel-title">⚙️ Restaurant Owner - Quick Order Status Update</div>
          <div class="owner-status-buttons">
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'confirmed')">✅ Order Accepted</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'preparing')">👨‍🍳 Preparing</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'transit_ready')">${isDelivery ? '🚚 Out for Delivery' : '🍽️ Ready to Serve'}</button>
            <button class="owner-act-btn" onclick="orderTracker.updateOrderStatus('${order.id}', 'completed')">🎉 Order Completed</button>
            <button class="owner-act-btn cancel" onclick="orderTracker.updateOrderStatus('${order.id}', 'unavailable')">❌ Item Unavailable</button>
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
