/**
 * TACO Foodies - Restaurant Owner Dashboard & Auth Engine
 * Multi-Device Realtime Sync across all owner devices and customer devices.
 */
class OwnerDashboardManager {
  constructor() {
    this.activeFilter = 'all';
    this.activeTypeFilter = 'all';
    this.cachedOrders = [];
    this.pollInterval = null;
  }

  init() {
    this.setupEventListeners();
    this.checkHashRoute();

    window.addEventListener('hashchange', () => this.checkHashRoute());

    // 1. Supabase Realtime WebSocket listener for instant live sync across all devices
    if (typeof supabaseService !== 'undefined') {
      supabaseService.addRealtimeListener((payload) => {
        if (!payload) return;

        if (this.isDashboardVisible() || supabaseService.isOwnerLoggedIn()) {
          console.log('⚡ Realtime Event on Owner Dashboard:', payload.eventType);

          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedItem = payload.new;
            const updatedNum = updatedItem.order_number || updatedItem.id;
            const dbId = updatedItem.id;

            const existingOrder = (this.cachedOrders || []).find(o => o.id === updatedNum || o.order_number === updatedNum || o.db_id === dbId);

            if (existingOrder) {
              existingOrder.status = updatedItem.status;
              this.renderSummaryCards();
              this.renderOrdersFeed();
              this.renderAnalytics();
            } else {
              this.refreshDashboardData();
            }
          } else {
            this.refreshDashboardData();
          }
        }
      });
    }

    // 2. Background Heartbeat Poller (4s) for 100% fail-safe multi-device synchronization
    this.startPollingHeartbeat();
  }

  startPollingHeartbeat() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (this.isDashboardVisible()) {
        this.refreshDashboardData(true); // silent background refresh
      }
    }, 4000);
  }

  checkHashRoute() {
    const hash = window.location.hash || '';

    if (hash === '#owner-login') {
      this.showLoginModal();
    } else if (hash === '#owner-dashboard') {
      if (!supabaseService.isOwnerLoggedIn()) {
        alert('Unauthorized access! Only the authorized restaurant owner can view the dashboard.');
        window.location.hash = '#digitalMenuSection';
        return;
      }
      this.openDashboardModal();
    }
  }

  isDashboardVisible() {
    const modal = document.getElementById('ownerDashboardModal');
    return modal && modal.classList.contains('active');
  }

  showLoginModal() {
    const modal = document.getElementById('ownerLoginModal');
    if (modal) modal.classList.add('active');
  }

  closeLoginModal() {
    const modal = document.getElementById('ownerLoginModal');
    if (modal) modal.classList.remove('active');
  }

  openDashboardModal() {
    const modal = document.getElementById('ownerDashboardModal');
    if (!modal) return;

    this.refreshDashboardData();
    modal.classList.add('active');
  }

  closeDashboardModal() {
    const modal = document.getElementById('ownerDashboardModal');
    if (modal) modal.classList.remove('active');
    window.location.hash = '';
  }

  async handleOwnerLogin(e) {
    if (e) e.preventDefault();

    const emailInput = document.getElementById('ownerEmailInput');
    const passwordInput = document.getElementById('ownerPasswordInput');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email) {
      alert('Please enter the owner email address!');
      return;
    }

    const result = await supabaseService.ownerLogin(email, password);

    if (result.success) {
      this.closeLoginModal();
      window.location.hash = '#owner-dashboard';
      this.openDashboardModal();
    } else {
      alert(result.message);
    }
  }

  handleOwnerLogout() {
    supabaseService.ownerLogout();
    this.closeDashboardModal();
    alert('Logged out from Owner Dashboard.');
    window.location.hash = '#digitalMenuSection';
  }

  setFilter(statusFilter) {
    this.activeFilter = statusFilter;
    const filterBtns = document.querySelectorAll('.owner-filter-btn');
    filterBtns.forEach(btn => {
      if (btn.dataset.filter === statusFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.renderOrdersFeed();
  }

  setTypeFilter(typeFilter) {
    this.activeTypeFilter = typeFilter;
    this.renderOrdersFeed();
  }

  async refreshDashboardData(silent = false) {
    if (typeof supabaseService !== 'undefined') {
      const dbOrders = await supabaseService.fetchOwnerOrders('all', 'all');
      
      // Compare if data changed to avoid re-rendering DOM unnecessarily on silent polls
      const newOrdersStr = JSON.stringify(dbOrders);
      const oldOrdersStr = JSON.stringify(this.cachedOrders);

      if (newOrdersStr !== oldOrdersStr || !silent) {
        this.cachedOrders = dbOrders || [];
        this.renderSummaryCards();
        this.renderOrdersFeed();
        this.renderAnalytics();
      }
    }
  }

  isValidStatusTransition(currentStatus, targetStatus) {
    if (targetStatus === 'cancelled') return true; // Any status can transition to cancelled

    const flow = ['pending', 'accepted', 'preparing', 'ready', 'serving', 'completed'];
    const curIdx = flow.indexOf(currentStatus);
    const targetIdx = flow.indexOf(targetStatus);

    if (curIdx === -1 || targetIdx === -1) return true; // Allow if unrecognized current status

    // Enforce sequential workflow (e.g. pending -> accepted -> preparing -> ready -> serving -> completed)
    return targetIdx === curIdx + 1 || targetIdx > curIdx;
  }

  renderSummaryCards() {
    const orders = this.cachedOrders || [];
    const todayStr = new Date().toISOString().split('T')[0];

    const todayOrders = orders.filter(o => o.timestamp && o.timestamp.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (parseFloat(o.grandTotal) || 0), 0);

    const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'received').length;
    const acceptedCount = orders.filter(o => o.status === 'accepted' || o.status === 'confirmed').length;
    const preparingCount = orders.filter(o => o.status === 'preparing').length;
    const readyCount = orders.filter(o => o.status === 'ready' || o.status === 'transit_ready').length;
    const servingCount = orders.filter(o => o.status === 'serving' || o.status === 'delivering').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const cancelledCount = orders.filter(o => o.status === 'cancelled' || o.status === 'unavailable').length;

    const deliveryCount = orders.filter(o => o.type === 'Home Delivery' || o.type === 'home_delivery').length;
    const dineInCount = orders.filter(o => o.type === 'Dine-In' || o.type === 'dine_in').length;

    const summaryContainer = document.getElementById('ownerSummaryCardsContainer');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="kpi-card">
        <span class="kpi-icon">📦</span>
        <div class="kpi-val">${todayOrders.length}</div>
        <div class="kpi-title">Today's Orders</div>
      </div>

      <div class="kpi-card highlight">
        <span class="kpi-icon">💰</span>
        <div class="kpi-val">₹${todayRevenue}</div>
        <div class="kpi-title">Today's Revenue</div>
      </div>

      <div class="kpi-card yellow">
        <span class="kpi-icon">⏳</span>
        <div class="kpi-val">${pendingCount}</div>
        <div class="kpi-title">Pending</div>
      </div>

      <div class="kpi-card blue">
        <span class="kpi-icon">✅</span>
        <div class="kpi-val">${acceptedCount}</div>
        <div class="kpi-title">Accepted</div>
      </div>

      <div class="kpi-card blue">
        <span class="kpi-icon">👨‍🍳</span>
        <div class="kpi-val">${preparingCount}</div>
        <div class="kpi-title">Preparing</div>
      </div>

      <div class="kpi-card orange">
        <span class="kpi-icon">🍽️</span>
        <div class="kpi-val">${readyCount + servingCount}</div>
        <div class="kpi-title">Ready / Serving</div>
      </div>

      <div class="kpi-card green">
        <span class="kpi-icon">🎉</span>
        <div class="kpi-val">${completedCount}</div>
        <div class="kpi-title">Completed</div>
      </div>

      <div class="kpi-card red">
        <span class="kpi-icon">❌</span>
        <div class="kpi-val">${cancelledCount}</div>
        <div class="kpi-title">Cancelled</div>
      </div>
    `;
  }

  renderOrdersFeed() {
    const container = document.getElementById('ownerOrdersFeedGrid');
    if (!container) return;

    let filtered = [...(this.cachedOrders || [])];
    const todayStr = new Date().toISOString().split('T')[0];

    // Status Filter
    if (this.activeFilter && this.activeFilter !== 'all') {
      if (this.activeFilter === 'today') {
        filtered = filtered.filter(o => o.timestamp && o.timestamp.startsWith(todayStr));
      } else if (this.activeFilter === 'pending') {
        filtered = filtered.filter(o => o.status === 'pending' || o.status === 'received');
      } else if (this.activeFilter === 'accepted') {
        filtered = filtered.filter(o => o.status === 'accepted' || o.status === 'confirmed');
      } else if (this.activeFilter === 'preparing') {
        filtered = filtered.filter(o => o.status === 'preparing');
      } else if (this.activeFilter === 'ready') {
        filtered = filtered.filter(o => o.status === 'ready' || o.status === 'transit_ready' || o.status === 'serving' || o.status === 'delivering');
      } else if (this.activeFilter === 'completed') {
        filtered = filtered.filter(o => o.status === 'completed');
      } else if (this.activeFilter === 'cancelled') {
        filtered = filtered.filter(o => o.status === 'cancelled' || o.status === 'unavailable');
      } else if (this.activeFilter === 'delivery') {
        filtered = filtered.filter(o => o.type === 'Home Delivery' || o.type === 'home_delivery');
      } else if (this.activeFilter === 'dine_in') {
        filtered = filtered.filter(o => o.type === 'Dine-In' || o.type === 'dine_in');
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="no-orders-box">
          <span class="no-orders-icon">📋</span>
          <h4>No orders matching filter</h4>
          <p>Incoming customer orders from all devices will appear here automatically in real time.</p>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(order => {
      const isDelivery = (order.type === 'Home Delivery' || order.type === 'home_delivery');
      
      let statusColorClass = 'status-yellow';
      let statusBadgeLabel = '🟡 Pending';

      if (order.status === 'accepted' || order.status === 'confirmed') {
        statusColorClass = 'status-blue';
        statusBadgeLabel = '✅ Accepted';
      } else if (order.status === 'preparing') {
        statusColorClass = 'status-blue';
        statusBadgeLabel = '👨‍🍳 Preparing';
      } else if (order.status === 'ready' || order.status === 'transit_ready') {
        statusColorClass = 'status-orange';
        statusBadgeLabel = '🍽️ Ready';
      } else if (order.status === 'serving' || order.status === 'delivering') {
        statusColorClass = 'status-orange';
        statusBadgeLabel = isDelivery ? '🚚 Out for Delivery' : '🍽️ Serving';
      } else if (order.status === 'completed') {
        statusColorClass = 'status-green';
        statusBadgeLabel = '🎉 Completed';
      } else if (order.status === 'cancelled' || order.status === 'unavailable') {
        statusColorClass = 'status-red';
        statusBadgeLabel = '❌ Cancelled';
      }

      let itemsHtml = '';
      (order.items || []).forEach(i => {
        itemsHtml += `<div class="card-item-row"><span>${i.name} (x${i.quantity})</span><strong>₹${i.price * i.quantity}</strong></div>`;
      });

      const formattedTime = order.timestamp ? new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

      const guestVal = (order.guests !== null && order.guests !== undefined && !isNaN(order.guests))
        ? order.guests
        : (order.guest_count || 1);

      html += `
        <div class="owner-order-card ${statusColorClass}">
          <div class="card-top-header">
            <div class="id-time-col">
              <span class="card-order-id">#${order.id}</span>
              <span class="card-order-time">🕒 ${formattedTime}</span>
            </div>
            <span class="order-status-badge ${statusColorClass}">${statusBadgeLabel}</span>
          </div>

          <div class="card-type-banner">
            ${isDelivery ? `
              <span>🏠 <strong>Home Delivery</strong></span>
              <span>👤 ${order.customerName || 'Customer'} (${order.phone || 'No phone'})</span>
            ` : `
              <span>📍 <strong>Dine-In (Table ${order.table || 1})</strong></span>
              <span>👥 Guests: ${guestVal}</span>
            `}
          </div>

          ${isDelivery && order.address ? `
            <div class="card-address-box">📍 <strong>Address:</strong> ${order.address}</div>
          ` : ''}

          <div class="card-items-box">
            ${itemsHtml}
          </div>

          <div class="card-calc-footer">
            <span>Subtotal: ₹${order.foodTotal} ${isDelivery ? '+ ₹' + order.deliveryFee + ' Delivery' : ''}</span>
            <span class="card-total-val">Total: ₹${order.grandTotal}</span>
          </div>

          <!-- One-Click Status Control Buttons (Strict Authorized Owner Actions) -->
          <div class="one-click-controls">
            <button class="status-btn accept" onclick="ownerDashboard.updateStatus('${order.id}', 'accepted')" title="Accept Order">✓ Accept</button>
            <button class="status-btn prep" onclick="ownerDashboard.updateStatus('${order.id}', 'preparing')" title="Start Preparing">👨‍🍳 Prep</button>
            <button class="status-btn ready" onclick="ownerDashboard.updateStatus('${order.id}', 'ready')" title="Mark Ready">🍽️ Ready</button>
            <button class="status-btn complete" onclick="ownerDashboard.updateStatus('${order.id}', 'completed')" title="Complete Order">✅ Complete</button>
            <button class="status-btn cancel" onclick="ownerDashboard.updateStatus('${order.id}', 'cancelled')" title="Cancel Order">❌ Cancel</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // UPDATE ONLY THE SELECTED ORDER IN SUPABASE DATABASE
  async updateStatus(orderId, newStatus) {
    if (!orderId) return;

    // 1. Verify owner authorization
    if (typeof supabaseService !== 'undefined' && !supabaseService.isOwnerLoggedIn()) {
      alert('Unauthorized! Only the restaurant owner can update order status.');
      return;
    }

    const target = (this.cachedOrders || []).find(o => o.id === orderId || o.order_number === orderId || o.db_id === orderId);

    // 2. Validate workflow transition
    if (target && !this.isValidStatusTransition(target.status, newStatus)) {
      alert(`Invalid workflow transition from '${target.status}' to '${newStatus}'. Workflow must follow: Pending ➔ Accepted ➔ Preparing ➔ Ready ➔ Serving ➔ Completed.`);
      return;
    }

    // 3. Perform database update first & wait for verified success
    let success = false;
    if (typeof supabaseService !== 'undefined') {
      success = await supabaseService.updateOrderStatus(orderId, newStatus);
    }

    if (!success) {
      alert(`Database update failed for Order #${orderId}. Status was not updated.`);
      return; // Do NOT update local state or UI if database update fails
    }

    // 4. Update local cached order object upon confirmed database update
    if (target) {
      target.status = newStatus;
    }

    // 5. Re-render owner UI
    this.renderSummaryCards();
    this.renderOrdersFeed();
    this.renderAnalytics();
  }

  renderAnalytics() {
    const container = document.getElementById('ownerAnalyticsContainer');
    if (!container) return;

    const orders = this.cachedOrders || [];
    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.grandTotal) || 0), 0);
    const avgOrderVal = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    const itemMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(i => {
        itemMap[i.name] = (itemMap[i.name] || 0) + (i.quantity || 1);
      });
    });

    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    let topItemsHtml = '';
    topItems.forEach(([name, qty], idx) => {
      topItemsHtml += `<div class="analytics-row"><span>${idx + 1}. ${name}</span><strong>${qty} ordered</strong></div>`;
    });

    container.innerHTML = `
      <div class="analytics-card">
        <h4>📊 Revenue Overview</h4>
        <div class="analytics-row"><span>Total Orders Processed:</span> <strong>${totalOrdersCount} orders</strong></div>
        <div class="analytics-row"><span>Total Gross Revenue:</span> <strong style="color: var(--fk-yellow);">₹${totalRevenue}</strong></div>
        <div class="analytics-row"><span>Average Order Value:</span> <strong>₹${avgOrderVal}</strong></div>
      </div>

      <div class="analytics-card">
        <h4>🔥 Most Ordered Dishes</h4>
        ${topItemsHtml || '<p style="color: var(--text-secondary); font-size: 0.85rem;">No order history yet.</p>'}
      </div>
    `;
  }

  setupEventListeners() {
    const loginBtn = document.getElementById('openOwnerLoginModalBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        if (supabaseService.isOwnerLoggedIn()) {
          window.location.hash = '#owner-dashboard';
          this.openDashboardModal();
        } else {
          window.location.hash = '#owner-login';
          this.showLoginModal();
        }
      });
    }

    const closeLoginBtn = document.getElementById('closeOwnerLoginBtn');
    if (closeLoginBtn) {
      closeLoginBtn.addEventListener('click', () => {
        this.closeLoginModal();
        window.location.hash = '';
      });
    }

    const closeDashBtn = document.getElementById('closeOwnerDashBtn');
    if (closeDashBtn) {
      closeDashBtn.addEventListener('click', () => {
        this.closeDashboardModal();
      });
    }

    const loginForm = document.getElementById('ownerLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleOwnerLogin(e));
    }
  }
}

const ownerDashboard = new OwnerDashboardManager();
document.addEventListener('DOMContentLoaded', () => ownerDashboard.init());
