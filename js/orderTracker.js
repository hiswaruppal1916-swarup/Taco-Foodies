/**
 * TACO Foodies - Multi-Order Tracking System ("My Orders" / #my-orders)
 * Real-Time Supabase Synchronization:
 * Automatically refreshes customer tracking status in real time when owner updates order in database.
 */
class OrderTracker {
  constructor() {
    this.idListKey = 'taco_customer_order_numbers';
    this.lastRenderedStr = '';
    this.statusMap = {
      'pending': { 
        label: 'Waiting for restaurant confirmation', 
        icon: '⏳', 
        desc: 'Please wait while the restaurant confirms your order.', 
        step: 1 
      },
      'received': { 
        label: 'Waiting for restaurant confirmation', 
        icon: '⏳', 
        desc: 'Please wait while the restaurant confirms your order.', 
        step: 1 
      },
      'accepted': { 
        label: 'Order confirmed', 
        icon: '✅', 
        desc: 'Restaurant confirmed your order & prep is on schedule.', 
        step: 2 
      },
      'confirmed': { 
        label: 'Order confirmed', 
        icon: '✅', 
        desc: 'Restaurant confirmed your order & prep is on schedule.', 
        step: 2 
      },
      'preparing': { 
        label: 'Preparing', 
        icon: '👨‍🍳', 
        desc: 'Chefs are preparing your food fresh in the kitchen!', 
        step: 3 
      },
      'ready': { 
        label: 'Ready for serving', 
        icon: '🍽️', 
        desc: 'Food is hot & ready for serving/pickup!', 
        step: 4 
      },
      'transit_ready': { 
        label: 'Ready for serving', 
        icon: '🍽️', 
        desc: 'Food is hot & ready for serving/pickup!', 
        step: 4 
      },
      'serving': { 
        label: 'Serving / Out for delivery', 
        icon: '🚚', 
        desc: 'Food is being served or out for delivery!', 
        step: 5 
      },
      'delivering': { 
        label: 'Out for delivery', 
        icon: '🚚', 
        desc: 'Food is sizzling hot & out for delivery!', 
        step: 5 
      },
      'completed': { 
        label: 'Completed', 
        icon: '🎉', 
        desc: 'Thank you for dining with TACO Foodies!', 
        step: 6 
      },
      'cancelled': { 
        label: 'Order cancelled', 
        icon: '❌', 
        desc: 'This order was cancelled by the restaurant.', 
        step: 0 
      },
      'unavailable': { 
        label: 'Order cancelled', 
        icon: '❌', 
        desc: 'This item or order was cancelled.', 
        step: 0 
      }
    };
  }

  init() {
    this.setupEventListeners();
    this.checkHashRoute();
    window.addEventListener('hashchange', () => this.checkHashRoute());

    // 1. Supabase Realtime WebSocket listener for this customer's active orders
    if (typeof supabaseService !== 'undefined') {
      supabaseService.addRealtimeListener((payload) => {
        if (!payload || !payload.new) return;

        const updatedItem = payload.new;
        const updatedNum = String(updatedItem.order_number || updatedItem.id);
        const dbId = String(updatedItem.id);
        const tableNum = updatedItem.table_number;

        const myOrderNumbers = this.getOrderIdsList();
        let myTableNum = null;
        if (typeof tableQRScanner !== 'undefined' && tableQRScanner.tableNumber) {
          myTableNum = parseInt(tableQRScanner.tableNumber, 10);
        }

        const isMyOrder = myOrderNumbers.some(num => String(num) === updatedNum || String(num) === dbId) ||
                          (myTableNum && tableNum && parseInt(tableNum, 10) === myTableNum);

        if (isMyOrder) {
          const newStatus = updatedItem.status;
          const info = this.statusMap[newStatus] || { label: newStatus, icon: '🔔' };

          if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
            cartSystem.showToastNotification(`Order #${updatedNum}: ${info.label}`);
          }

          // Always re-render orders page so UI stays synchronized live
          this.renderMyOrdersPage();
        }
      });
    }

    // 2. Fail-safe 4s polling heartbeat when tracking modal is open
    setInterval(() => {
      const modal = document.getElementById('orderTrackerModal');
      if (modal && modal.classList.contains('active')) {
        this.renderMyOrdersPage(true); // silent background refresh
      }
    }, 4000);
  }

  checkHashRoute() {
    const hash = window.location.hash || '';
    if (hash === '#my-orders' || hash === '#track-order') {
      this.openMyOrdersModal();
    }
  }

  getOrderIdsList() {
    try {
      const data = localStorage.getItem(this.idListKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  registerOrder(newOrder) {
    if (!newOrder || !newOrder.id) return newOrder;

    const orderNum = newOrder.order_number || newOrder.id;
    const idList = this.getOrderIdsList();
    if (!idList.includes(orderNum)) {
      idList.push(orderNum);
      localStorage.setItem(this.idListKey, JSON.stringify(idList));
    }

    if (typeof cartSystem !== 'undefined' && cartSystem.showToastNotification) {
      cartSystem.showToastNotification(`🎉 Order #${orderNum} placed successfully!`);
    }

    return newOrder;
  }

  async getCustomerOrdersList() {
    const orderNumbers = this.getOrderIdsList();

    let activeTableNum = null;
    if (typeof tableQRScanner !== 'undefined' && tableQRScanner.tableNumber) {
      activeTableNum = parseInt(tableQRScanner.tableNumber, 10);
    }

    let tableOrders = [];
    if (activeTableNum && typeof supabaseService !== 'undefined') {
      tableOrders = await supabaseService.fetchOrdersByTable(activeTableNum);
    }

    let numOrders = [];
    if (orderNumbers.length > 0 && typeof supabaseService !== 'undefined') {
      numOrders = await supabaseService.fetchCustomerOrders(orderNumbers);
    }

    const ordersMap = {};
    numOrders.forEach(o => { if (o && o.id) ordersMap[o.id] = o; });
    tableOrders.forEach(o => { if (o && o.id) ordersMap[o.id] = o; });

    return Object.values(ordersMap).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  openMyOrdersModal() {
    const modal = document.getElementById('orderTrackerModal');
    if (!modal) return;

    window.location.hash = '#my-orders';
    this.renderMyOrdersPage();
    modal.classList.add('active');
  }

  openTrackerModal() {
    this.openMyOrdersModal();
  }

  closeTrackerModal() {
    const modal = document.getElementById('orderTrackerModal');
    if (modal) modal.classList.remove('active');
    if (window.location.hash === '#my-orders' || window.location.hash === '#track-order') {
      window.location.hash = '';
    }
  }

  async renderMyOrdersPage(silent = false) {
    const container = document.getElementById('orderTrackerContent');
    if (!container) return;

    const allCustomerOrders = await this.getCustomerOrdersList();
    const currentStr = JSON.stringify(allCustomerOrders);

    // Skip DOM updates on silent polls if nothing changed
    if (silent && currentStr === this.lastRenderedStr) {
      return;
    }
    this.lastRenderedStr = currentStr;

    if (allCustomerOrders.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state" style="padding: 40px 20px; text-align: center;">
          <span class="empty-icon">🛵</span>
          <h3 style="font-size: 1.4rem; color: var(--fk-yellow); margin-bottom: 8px;">No Active Orders</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 24px;">
            You haven't placed any orders yet. Select delicious food from our menu to place an order!
          </p>
          <button class="primary-btn" onclick="orderTracker.closeTrackerModal(); window.location.href='#digitalMenuSection';">
            🍽️ Browse Menu & Order
          </button>
        </div>
      `;
      return;
    }

    const activeOrders = allCustomerOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'unavailable');
    const completedOrders = allCustomerOrders.filter(o => o.status === 'completed' || o.status === 'cancelled' || o.status === 'unavailable');

    let activeOrdersHtml = '';
    if (activeOrders.length > 0) {
      activeOrders.forEach(order => {
        activeOrdersHtml += this.generateOrderCardHtml(order, true);
      });
    } else {
      activeOrdersHtml = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); margin-bottom: 20px;">
          🎉 No active orders right now. All your orders are completed!
        </div>
      `;
    }

    let completedOrdersHtml = '';
    if (completedOrders.length > 0) {
      completedOrders.forEach(order => {
        completedOrdersHtml += this.generateOrderCardHtml(order, false);
      });
    }

    container.innerHTML = `
      <div class="my-orders-container">
        <div class="my-orders-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.8rem;">📦</span>
            <div>
              <h2 style="font-size: 1.4rem; color: var(--fk-yellow); font-weight: 900; margin: 0;">My Orders</h2>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Real-Time Order Tracking Center (Supabase DB)</span>
            </div>
          </div>
          <span class="badge-taco-yellow" style="font-size: 0.85rem; padding: 6px 14px;">
            Active Orders (${activeOrders.length})
          </span>
        </div>

        <div class="orders-section">
          <h3 class="section-title-label">🔥 Active Orders (${activeOrders.length})</h3>
          <div class="orders-cards-stack">
            ${activeOrdersHtml}
          </div>
        </div>

        ${completedOrders.length > 0 ? `
          <div class="orders-section" style="margin-top: 32px;">
            <h3 class="section-title-label" style="color: var(--text-secondary);">📜 Order History (${completedOrders.length})</h3>
            <div class="orders-cards-stack">
              ${completedOrdersHtml}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  generateOrderCardHtml(order, isActive = true) {
    const isDelivery = (order.type === 'Home Delivery' || order.type === 'home_delivery');
    const currentStatusInfo = this.statusMap[order.status] || this.statusMap['pending'];
    
    const parsedGuests = (order.guests !== null && order.guests !== undefined && !isNaN(order.guests))
      ? parseInt(order.guests, 10)
      : (order.guest_count || (isDelivery ? 1 : 2));

    const guestDisplay = `Guests: ${parsedGuests}`;

    let itemsHtml = '';
    (order.items || []).forEach(item => {
      const isVegDot = item.isVeg === false ? '🔴' : '🟢';
      const qty = item.quantity || 1;
      const total = (item.price || 0) * qty;
      itemsHtml += `
        <div class="tracker-item-card">
          <div class="item-name-qty">
            <span class="veg-dot">${isVegDot}</span>
            <span class="item-qty-tag">${qty} ×</span>
            <span class="item-name-str">${item.name}</span>
          </div>
          <strong class="item-price-str">₹${total}</strong>
        </div>
      `;
    });

    const step = currentStatusInfo.step;
    const isStep1Active = step >= 1 ? 'active' : '';
    const isStep2Active = step >= 2 ? 'active' : '';
    const isStep3Active = step >= 3 ? 'active' : '';
    const isStep4Active = step >= 4 ? 'active' : '';
    const isStep5Active = step >= 5 ? 'active' : '';
    const isStep6Active = step >= 6 ? 'active' : '';

    const formattedTime = order.timestamp ? new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
    const statusDisplayLabel = currentStatusInfo.label;

    return `
      <div class="order-tracker-card ${isActive ? 'active-card' : 'history-card'}">
        <div class="card-header-row">
          <div class="card-id-col">
            <span class="card-order-num">ORDER #${order.id}</span>
            <span class="card-order-time">🕒 ${formattedTime}</span>
          </div>
          <span class="order-type-chip ${isDelivery ? 'delivery' : 'dine-in'}">
            ${isDelivery ? '🏠 Home Delivery' : `📍 Dine-In (Table ${order.table || 1})`}
          </span>
        </div>

        <div class="card-status-banner ${order.status}">
          <span class="banner-icon">${currentStatusInfo.icon}</span>
          <div>
            <div class="banner-label">${statusDisplayLabel}</div>
            <div class="banner-desc">${currentStatusInfo.desc}</div>
          </div>
        </div>

        ${isActive ? `
          <div class="prep-timer-box">
            <span class="timer-icon">⏳</span>
            <div>
              <span class="prep-label">Estimated Preparation Time:</span>
              <strong class="prep-val">15–20 minutes</strong>
            </div>
          </div>

          <div class="tracker-stepper">
            <div class="step-item ${isStep1Active}">
              <div class="step-dot">1</div>
              <span class="step-name">⏳ Received</span>
            </div>
            <div class="step-line ${isStep2Active}"></div>

            <div class="step-item ${isStep2Active}">
              <div class="step-dot">2</div>
              <span class="step-name">✅ Confirmed</span>
            </div>
            <div class="step-line ${isStep3Active}"></div>

            <div class="step-item ${isStep3Active}">
              <div class="step-dot">3</div>
              <span class="step-name">👨‍🍳 Preparing</span>
            </div>
            <div class="step-line ${isStep4Active}"></div>

            <div class="step-item ${isStep4Active}">
              <div class="step-dot">4</div>
              <span class="step-name">🍽️ Ready</span>
            </div>
            <div class="step-line ${isStep5Active}"></div>

            <div class="step-item ${isStep5Active}">
              <div class="step-dot">5</div>
              <span class="step-name">${isDelivery ? '🚚 Delivery' : '🍽️ Serving'}</span>
            </div>
            <div class="step-line ${isStep6Active}"></div>

            <div class="step-item ${isStep6Active}">
              <div class="step-dot">6</div>
              <span class="step-name">🎉 Completed</span>
            </div>
          </div>
        ` : ''}

        <div class="card-summary-box">
          <div class="summary-details-row">
            ${isDelivery ? `
              <div>👤 <strong>${order.customerName || 'Customer'}</strong> (${order.phone || ''})</div>
              <div>📍 <strong>Address:</strong> ${order.address || 'Address provided'}</div>
            ` : `
              <div>📍 <strong>Table Number:</strong> Table ${order.table || 1}</div>
              <div>👥 <strong>${guestDisplay}</strong></div>
            `}
          </div>

          <div class="card-items-list">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Ordered Items (${(order.items || []).length}):</div>
            ${itemsHtml}
          </div>

          <div class="card-totals-footer">
            <span>Subtotal: ₹${order.foodTotal || 0} ${isDelivery ? '+ ₹' + (order.deliveryFee || 0) + ' Delivery' : ''}</span>
            <span class="card-grand-total">Total: ₹${order.grandTotal || 0}</span>
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
