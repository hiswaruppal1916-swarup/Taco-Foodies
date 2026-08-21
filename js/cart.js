/**
 * TACO Foodies E-Commerce Cart & WhatsApp Order Engine
 */
class CartSystem {
  constructor() {
    this.cartKey = 'taco_foodies_cart_items';
    this.cart = this.loadCart();
  }

  init() {
    this.renderCartDrawer();
    this.updateCartBadge();
    this.setupEventListeners();
  }

  loadCart() {
    try {
      const saved = localStorage.getItem(this.cartKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem(this.cartKey, JSON.stringify(this.cart));
    this.updateCartBadge();
    this.renderCartDrawer();
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: this.cart }));
  }

  addItem(dish, quantity = 1) {
    if (!dish || !dish.id) return;
    
    const existing = this.cart.find(item => item.id === dish.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        id: dish.id,
        name: dish.name,
        price: dish.price,
        originalPrice: dish.originalPrice || dish.price,
        image: dish.image,
        isVeg: dish.isVeg,
        quantity: quantity
      });
    }
    this.saveCart();
    this.bounceCartBadge();
    this.showToastNotification(dish.name, quantity);
  }

  showToastNotification(dishName, count = 1) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<span>🛒</span> <span>Added <strong>${count}x ${dishName}</strong> to cart!</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  removeItem(dishId) {
    this.cart = this.cart.filter(item => item.id !== dishId);
    this.saveCart();
  }

  updateQuantity(dishId, change) {
    const item = this.cart.find(i => i.id === dishId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
      this.removeItem(dishId);
    } else {
      this.saveCart();
    }
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  getItemCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  getTotalPrice() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getOriginalTotalPrice() {
    return this.cart.reduce((total, item) => total + ((item.originalPrice || item.price) * item.quantity), 0);
  }

  bounceCartBadge() {
    const badge = document.getElementById('cartCountBadge');
    if (badge) {
      badge.classList.remove('bounce');
      void badge.offsetWidth; // trigger reflow
      badge.classList.add('bounce');
    }
  }

  updateCartBadge() {
    const count = this.getItemCount();
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });

    const floatingCartTotal = document.getElementById('floatingCartTotal');
    if (floatingCartTotal) {
      floatingCartTotal.textContent = `₹${this.getTotalPrice()}`;
    }
  }

  renderCartDrawer() {
    const cartItemsContainer = document.getElementById('cartDrawerItems');
    const cartTotalEl = document.getElementById('cartTotalAmount');
    const cartSavingsEl = document.getElementById('cartSavingsAmount');
    const cartSubtotalEl = document.getElementById('cartSubtotalAmount');

    if (!cartItemsContainer) return;

    if (this.cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart-state">
          <span class="empty-icon">🌮</span>
          <h3>Your Food Cart is Empty</h3>
          <p>Explore our delicious Mexican & Chinese dishes and add your favorites!</p>
          <button class="primary-btn" onclick="cartSystem.closeCartDrawer()">Browse TACO Foodies Menu</button>
        </div>
      `;
      if (cartTotalEl) cartTotalEl.textContent = '₹0';
      if (cartSavingsEl) cartSavingsEl.textContent = '₹0';
      if (cartSubtotalEl) cartSubtotalEl.textContent = '₹0';
      return;
    }

    const subtotal = this.getOriginalTotalPrice();
    const total = this.getTotalPrice();
    const savings = Math.max(0, subtotal - total);

    if (cartSubtotalEl) cartSubtotalEl.textContent = `₹${subtotal}`;
    if (cartSavingsEl) cartSavingsEl.textContent = `₹${savings}`;
    if (cartTotalEl) cartTotalEl.textContent = `₹${total}`;

    let html = '';
    this.cart.forEach(item => {
      const isVegBadge = item.isVeg 
        ? `<span class="diet-dot veg" title="Vegetarian">🟢</span>` 
        : `<span class="diet-dot non-veg" title="Non-Vegetarian">🔴</span>`;

      html += `
        <div class="cart-item-card">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='images/hero_taco.png'">
          <div class="cart-item-info">
            <div class="title-row">
              ${isVegBadge}
              <h4 class="cart-item-title">${item.name}</h4>
            </div>
            <div class="cart-item-price-row">
              <span class="current-price" style="${(item.price === 0 || item.isFree) ? 'color: #2e7d32; font-weight: 800;' : ''}">${(item.price === 0 || item.isFree) ? 'FREE' : `₹${item.price}`}</span>
              ${item.originalPrice > item.price ? `<span class="old-price">₹${item.originalPrice}</span>` : ''}
            </div>
          </div>
          <div class="cart-qty-control">
            <button class="qty-btn" onclick="cartSystem.updateQuantity('${item.id}', -1)" aria-label="Decrease quantity">-</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="cartSystem.updateQuantity('${item.id}', 1)" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-remove-btn" onclick="cartSystem.removeItem('${item.id}')" title="Remove Dish">🗑️</button>
        </div>
      `;
    });

    cartItemsContainer.innerHTML = html;
  }

  proceedToCheckout() {
    if (this.cart.length === 0) {
      alert('Please add items to your cart before ordering!');
      return;
    }
    this.closeCartDrawer();
    checkoutSystem.openCheckoutForCart();
  }

  openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    this.renderCartDrawer();
  }

  closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  setupEventListeners() {
    const openBtns = document.querySelectorAll('.open-cart-btn');
    openBtns.forEach(btn => btn.addEventListener('click', () => this.openCartDrawer()));

    const closeBtn = document.getElementById('closeCartDrawerBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCartDrawer());

    const overlay = document.getElementById('cartDrawerOverlay');
    if (overlay) overlay.addEventListener('click', () => this.closeCartDrawer());

    const checkoutBtn = document.getElementById('checkoutWhatsAppBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
  }
}

const cartSystem = new CartSystem();
