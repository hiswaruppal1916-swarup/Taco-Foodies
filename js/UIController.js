/**
 * TACO Foodies Main UI & Flipkart Interactivity Controller
 */
class UIController {
  constructor() {
    this.menuData = DEFAULT_MENU_DATA;
    this.currentHeroSlide = 0;
    this.slideInterval = null;
    this.activeCategory = 'All';
    this.activeSearch = '';
    this.activeVegFilter = 'all'; // 'all', 'veg', 'non-veg'
  }

  init() {
    // Check if custom Google Sheet menu data exists
    if (typeof googleSheetsSync !== 'undefined') {
      this.menuData = googleSheetsSync.getActiveMenuData();
    }

    this.renderHeroSlider();
    this.renderCategoryPills();
    this.renderHorizontalCarousels();
    this.renderMenuGrid();
    this.renderGalleryGrid();
    this.renderCustomerReviews();
    this.setupDealCountdown();
    this.setupEventListeners();

    // Listen for live Google Sheet data updates
    window.addEventListener('menuDataUpdated', (e) => {
      this.menuData = e.detail;
      this.renderHorizontalCarousels();
      this.renderMenuGrid();
    });
  }

  // --- 1. HERO PROMO SLIDER ---
  renderHeroSlider() {
    const sliderContainer = document.getElementById('heroSliderTrack');
    const dotsContainer = document.getElementById('heroSliderDots');
    if (!sliderContainer) return;

    let slideHtml = '';
    let dotsHtml = '';

    PROMO_SLIDES.forEach((slide, index) => {
      const activeClass = index === 0 ? 'active' : '';
      const slideClasses = `hero-slide ${activeClass} ${slide.isCleanPoster ? 'poster-slide' : ''}`;
      const bgStyle = slide.isCleanPoster
        ? `background-image: url('${slide.image}'); background-size: contain !important; background-repeat: no-repeat !important; background-position: center center !important; background-color: #0b0f19;`
        : `background-image: linear-gradient(90deg, rgba(11, 15, 25, 0.92) 0%, rgba(11, 15, 25, 0.65) 60%, rgba(11, 15, 25, 0.4) 100%), url('${slide.image}');`;

      let innerContent = '';
      if (slide.isCleanPoster) {
        innerContent = `
          <div class="hero-slide-content poster-mode">
            <div class="slide-actions poster-actions">
              <button class="primary-btn hero-cta-btn" onclick="uiController.filterCategoryFromHero('${slide.filterCategory}')">
                ${slide.cta} <span class="arrow">➔</span>
              </button>
              ${slide.dishId ? `
                <button class="primary-btn hero-add-cart-btn" style="background: var(--fk-blue);" onclick="uiController.quickAddToCart('${slide.dishId}', this)">
                  <span>🛒 Add to Cart</span>
                </button>
              ` : ''}
              <button class="secondary-btn" onclick="cartSystem.openCartDrawer()">View Cart</button>
            </div>
          </div>
        `;
      } else {
        innerContent = `
          <div class="hero-slide-content">
            ${slide.badge ? `<span class="slide-badge">${slide.badge}</span>` : ''}
            <h1 class="slide-title">${slide.title}</h1>
            ${slide.subtitle ? `<p class="slide-subtitle">${slide.subtitle}</p>` : ''}
            ${slide.offer ? `
              <div class="slide-offer-row">
                <span class="slide-offer">${slide.offer}</span>
                ${slide.code ? `<span class="slide-code">CODE: <strong>${slide.code}</strong></span>` : ''}
              </div>
            ` : ''}
            <div class="slide-actions">
              <button class="primary-btn hero-cta-btn" onclick="uiController.filterCategoryFromHero('${slide.filterCategory}')">
                ${slide.cta} <span class="arrow">➔</span>
              </button>
              ${slide.dishId ? `
                <button class="primary-btn hero-add-cart-btn" style="background: var(--fk-blue);" onclick="uiController.quickAddToCart('${slide.dishId}', this)">
                  <span>🛒 Add to Cart</span>
                </button>
              ` : ''}
              <button class="secondary-btn" onclick="cartSystem.openCartDrawer()">View Cart</button>
            </div>
          </div>
        `;
      }

      slideHtml += `
        <div class="${slideClasses}" style="${bgStyle}">
          ${innerContent}
        </div>
      `;

      dotsHtml += `<button class="slider-dot ${activeClass}" onclick="uiController.goToHeroSlide(${index})"></button>`;
    });

    sliderContainer.innerHTML = slideHtml;
    if (dotsContainer) dotsContainer.innerHTML = dotsHtml;

    this.startAutoSlider();
  }

  startAutoSlider() {
    this.stopAutoSlider();
    this.slideInterval = setInterval(() => {
      this.nextHeroSlide();
    }, 4500);
  }

  stopAutoSlider() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dot');
    if (!slides.length) return;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    this.currentHeroSlide = (index + slides.length) % slides.length;
    slides[this.currentHeroSlide].classList.add('active');
    if (dots[this.currentHeroSlide]) dots[this.currentHeroSlide].classList.add('active');
  }

  nextHeroSlide() {
    this.goToHeroSlide(this.currentHeroSlide + 1);
  }

  prevHeroSlide() {
    this.goToHeroSlide(this.currentHeroSlide - 1);
  }

  filterCategoryFromHero(cat) {
    this.setActiveCategory(cat);
    const menuSection = document.getElementById('digitalMenuSection');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- 2. CATEGORY PILLS ---
  renderCategoryPills() {
    const categories = ['All', 'Starters', 'Soups & Salads', 'Rice & Biryani', 'Gravy & Main Course', 'Combos & Rotis', 'Drinks & Beverages', 'Trending', 'Deals'];
    const container = document.getElementById('categoryPillsNav');
    if (!container) return;

    let html = '';
    categories.forEach(cat => {
      const activeClass = (cat.toLowerCase() === (this.activeCategory || 'all').toLowerCase()) ? 'active' : '';
      let icon = '🍽️';
      if (cat === 'Starters') icon = '🌮';
      if (cat === 'Soups & Salads') icon = '🍲';
      if (cat === 'Rice & Biryani') icon = '🍚';
      if (cat === 'Gravy & Main Course') icon = '🥘';
      if (cat === 'Combos & Rotis') icon = '👑';
      if (cat === 'Drinks & Beverages') icon = '🥤';
      if (cat === 'Trending') icon = '🔥';
      if (cat === 'Deals') icon = '🎁';

      html += `
        <button class="category-pill ${activeClass}" onclick="uiController.setActiveCategory('${cat}', true)">
          <span class="pill-icon">${icon}</span>
          <span class="pill-name">${cat}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  setActiveCategory(cat, shouldScroll = true) {
    this.activeCategory = cat;
    this.renderCategoryPills();
    this.renderMenuGrid();

    if (shouldScroll) {
      const menuSection = document.getElementById('digitalMenuSection');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // --- 3. HORIZONTAL CAROUSELS (FLIPKART STYLE) ---
  renderHorizontalCarousels() {
    const collections = [
      { id: 'carouselTrending', title: '🔥 Trending Now', items: this.menuData.filter(i => i.isTrending) },
      { id: 'carouselMexican', title: '🌮 Starters & Tacos', items: this.menuData.filter(i => i.category && i.category.toLowerCase().includes('starter')) },
      { id: 'carouselChinese', title: '🍚 Rice & Biryani Specials', items: this.menuData.filter(i => i.category && i.category.toLowerCase().includes('rice')) },
      { id: 'carouselDeals', title: '🎁 Today\'s Deals (Up to 25% OFF)', items: this.menuData.filter(i => i.isTodayDeal) },
      { id: 'carouselBeverages', title: '🥤 Drinks & Coolers', items: this.menuData.filter(i => i.category && (i.category.toLowerCase().includes('drink') || i.category.toLowerCase().includes('beverage'))) }
    ];

    collections.forEach(col => {
      const container = document.getElementById(col.id);
      if (!container) return;

      if (!col.items || col.items.length === 0) {
        container.innerHTML = `<p class="empty-carousel">No dishes available in this collection.</p>`;
        return;
      }

      let html = '';
      col.items.forEach(dish => {
        html += this.createDishCardHTML(dish, true);
      });

      container.innerHTML = html;
    });
  }

  scrollCarousel(carouselId, direction) {
    const container = document.getElementById(carouselId);
    if (!container) return;
    const scrollAmount = direction === 'left' ? -320 : 320;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  // --- 4. DISH CARD HTML GENERATOR ---
  createDishCardHTML(dish, isCarouselItem = false) {
    const vegBadge = dish.isVeg 
      ? `<span class="diet-tag veg" title="Vegetarian">🟢 Veg</span>` 
      : `<span class="diet-tag non-veg" title="Non-Vegetarian">🔴 Non-Veg</span>`;

    const spiceLevel = '🌶️'.repeat(dish.spicyLevel || 0);

    return `
      <div class="flipkart-food-card ${isCarouselItem ? 'carousel-card' : ''}">
        <div class="food-img-wrapper" onclick="uiController.openDishDetailModal('${dish.id}')">
          <img src="${dish.image}" alt="${dish.name}" loading="lazy" class="food-img" onerror="this.src='images/hero_taco.png'">
          ${dish.discount ? `<span class="discount-badge">${dish.discount}</span>` : ''}
          ${dish.tag ? `<span class="feature-tag">${dish.tag}</span>` : ''}
        </div>
        
        <div class="food-card-body">
          <div class="card-meta">
            ${vegBadge}
            ${dish.spicyLevel ? `<span class="spice-level">${spiceLevel}</span>` : ''}
            <span class="card-rating">⭐ ${dish.rating} (${dish.ratingCount})</span>
          </div>

          <h3 class="food-title" onclick="uiController.openDishDetailModal('${dish.id}')">${dish.name}</h3>
          <p class="food-desc">${dish.description}</p>

          <div class="food-card-footer">
            <div class="price-box">
              <span class="curr-price" style="${(dish.price === 0 || dish.isFree) ? 'color: #2e7d32; font-weight: 800;' : ''}">${(dish.price === 0 || dish.isFree) ? 'FREE' : `₹${dish.price}`}</span>
              ${dish.originalPrice > dish.price ? `<span class="orig-price">₹${dish.originalPrice}</span>` : ''}
            </div>
            <div class="card-action-group">
              <button class="add-to-cart-btn" onclick="event.stopPropagation(); uiController.quickAddToCart('${dish.id}', this)" aria-label="Add ${dish.name} to Cart">
                <span>🛒 Add</span>
              </button>
              <button class="buy-now-btn" onclick="event.stopPropagation(); checkoutSystem.openCheckoutForDish(uiController.menuData.find(d=>d.id==='${dish.id}'))" aria-label="Buy ${dish.name} Now">
                <span>⚡ Buy Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  quickAddToCart(dishId, btnElement) {
    const dish = this.menuData.find(d => d.id === dishId);
    if (!dish) return;

    cartSystem.addItem(dish);

    // Micro-animation feedback
    if (btnElement) {
      btnElement.classList.add('added');
      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = `<span>✓ Added</span>`;
      setTimeout(() => {
        btnElement.classList.remove('added');
        btnElement.innerHTML = origHtml;
      }, 1200);
    }
  }

  // --- 5. MAIN DIGITAL MENU MATRIX & FILTERS ---
  renderMenuGrid() {
    const container = document.getElementById('mainMenuGrid');
    const resultCountEl = document.getElementById('searchResultCount');
    if (!container) return;

    let filtered = [...this.menuData];

    // Filter by Category
    if (this.activeCategory && this.activeCategory !== 'All') {
      const catLower = this.activeCategory.toLowerCase();
      if (catLower === 'trending') {
        filtered = filtered.filter(i => i.isTrending || (i.category && i.category.toLowerCase() === 'trending'));
      } else if (catLower === 'deals' || catLower === 'today\'s deals') {
        filtered = filtered.filter(i => i.isTodayDeal || (i.category && i.category.toLowerCase() === 'deals'));
      } else if (catLower.includes('starter')) {
        filtered = filtered.filter(i => i.category && i.category.toLowerCase().includes('starter'));
      } else if (catLower.includes('soup') || catLower.includes('salad')) {
        filtered = filtered.filter(i => i.category && (i.category.toLowerCase().includes('soup') || i.category.toLowerCase().includes('salad')));
      } else if (catLower.includes('rice') || catLower.includes('biryani')) {
        filtered = filtered.filter(i => i.category && (i.category.toLowerCase().includes('rice') || i.category.toLowerCase().includes('biryani')));
      } else if (catLower.includes('gravy') || catLower.includes('main')) {
        filtered = filtered.filter(i => i.category && (i.category.toLowerCase().includes('gravy') || i.category.toLowerCase().includes('main')));
      } else if (catLower.includes('combo') || catLower.includes('roti')) {
        filtered = filtered.filter(i => i.category && (i.category.toLowerCase().includes('combo') || i.category.toLowerCase().includes('roti')));
      } else if (catLower.includes('drink') || catLower.includes('beverage')) {
        filtered = filtered.filter(i => i.category && (i.category.toLowerCase().includes('drink') || i.category.toLowerCase().includes('beverage')));
      } else {
        filtered = filtered.filter(i => i.category && i.category.toLowerCase() === catLower);
      }
    }

    // Filter by Diet (Veg / Non-Veg)
    if (this.activeVegFilter === 'veg') {
      filtered = filtered.filter(i => i.isVeg);
    } else if (this.activeVegFilter === 'non-veg') {
      filtered = filtered.filter(i => !i.isVeg);
    }

    // Filter by Search Query
    if (this.activeSearch.trim()) {
      const q = this.activeSearch.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    if (resultCountEl) {
      resultCountEl.textContent = `Showing ${filtered.length} dishes`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="no-results-box">
          <span class="search-icon">🔍</span>
          <h3>No matching dishes found</h3>
          <p>Try searching for "Taco", "Noodles", or clear your category filters.</p>
          <button class="secondary-btn" onclick="uiController.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(dish => {
      html += this.createDishCardHTML(dish, false);
    });

    container.innerHTML = html;
  }

  resetFilters() {
    this.activeCategory = 'All';
    this.activeSearch = '';
    this.activeVegFilter = 'all';
    const searchInput = document.getElementById('menuSearchInput');
    if (searchInput) searchInput.value = '';
    this.renderCategoryPills();
    this.renderMenuGrid();
  }

  // --- 6. DISH DETAIL LIGHTBOX MODAL ---
  openDishDetailModal(dishId) {
    const dish = this.menuData.find(d => d.id === dishId);
    if (!dish) return;

    this.currentModalDishId = dishId;
    this.currentModalQty = 1;

    const modal = document.getElementById('dishDetailModal');
    const content = document.getElementById('dishDetailContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="dish-detail-card">
        <div class="dish-detail-img-box">
          <img src="${dish.image}" alt="${dish.name}" onerror="this.src='images/hero_taco.png'">
          ${dish.discount ? `<span class="detail-discount">${dish.discount}</span>` : ''}
        </div>
        <div class="dish-detail-info">
          <div class="meta-row">
            ${dish.isVeg ? '<span class="diet-tag veg">🟢 Vegetarian</span>' : '<span class="diet-tag non-veg">🔴 Non-Vegetarian</span>'}
            <span class="rating-tag" style="color: #fbc02d; font-weight: 700;">⭐ ${dish.rating} (43 Diners)</span>
          </div>
          <h2 class="detail-title">${dish.name}</h2>
          <p class="detail-category">Category: <strong>${dish.category}</strong></p>
          <p class="detail-desc">${dish.description}</p>
          
          <div class="detail-pricing">
            <span class="detail-curr" style="${(dish.price === 0 || dish.isFree) ? 'color: #2e7d32; font-weight: 800;' : ''}">${(dish.price === 0 || dish.isFree) ? 'FREE' : `₹${dish.price}`}</span>
            ${dish.originalPrice > dish.price ? `<span class="detail-orig">₹${dish.originalPrice}</span>` : ''}
          </div>

          <div class="modal-qty-row">
            <span style="font-weight: 700; color: var(--text-secondary);">Quantity:</span>
            <div class="modal-qty-control">
              <button class="modal-qty-btn" onclick="uiController.changeModalQty(-1)">-</button>
              <span id="modalDishQty" class="modal-qty-num">1</span>
              <button class="modal-qty-btn" onclick="uiController.changeModalQty(1)">+</button>
            </div>
          </div>

          <div class="detail-actions">
            <button class="buy-now-btn full-width" style="padding: 12px; font-size: 0.95rem; justify-content: center;" onclick="uiController.closeDishDetailModal(); checkoutSystem.openCheckoutForDish(uiController.menuData.find(d=>d.id==='${dish.id}'))">
              ⚡ Buy Now (Express Order)
            </button>
            <button class="add-to-cart-btn full-width" style="padding: 12px; font-size: 0.95rem; justify-content: center;" onclick="uiController.addModalDishToCart('${dish.id}')">
              🛒 Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  changeModalQty(delta) {
    if (!this.currentModalQty) this.currentModalQty = 1;
    this.currentModalQty += delta;
    if (this.currentModalQty < 1) this.currentModalQty = 1;
    const qtyEl = document.getElementById('modalDishQty');
    if (qtyEl) qtyEl.textContent = this.currentModalQty;
  }

  addModalDishToCart(dishId) {
    const dish = this.menuData.find(d => d.id === dishId);
    if (!dish) return;
    const qty = this.currentModalQty || 1;
    cartSystem.addItem(dish, qty);
    this.closeDishDetailModal();
  }

  closeDishDetailModal() {
    const modal = document.getElementById('dishDetailModal');
    if (modal) modal.classList.remove('active');
  }

  // --- 7. RESTAURANT GALLERY LIGHTBOX ---
  renderGalleryGrid(categoryFilter = 'all') {
    const container = document.getElementById('galleryGrid');
    if (!container) return;

    let filtered = GALLERY_PHOTOS;
    if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
      filtered = GALLERY_PHOTOS.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    let html = '';
    filtered.forEach(photo => {
      html += `
        <div class="gallery-card" onclick="uiController.openGalleryModal('${photo.image}', '${photo.title}', '${photo.caption}')">
          <img src="${photo.image}" alt="${photo.title}" loading="lazy" class="gallery-img">
          <div class="gallery-overlay">
            <h4>${photo.title}</h4>
            <span class="gallery-cat">${photo.category}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  filterGallery(category, btnElement) {
    if (btnElement) {
      const container = btnElement.parentElement;
      if (container) {
        container.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
      }
    }
    this.renderGalleryGrid(category);
  }

  openGalleryModal(imgUrl, title, caption) {
    const modal = document.getElementById('galleryModal');
    const imgEl = document.getElementById('galleryModalImg');
    const titleEl = document.getElementById('galleryModalTitle');
    const captionEl = document.getElementById('galleryModalCaption');

    if (modal && imgEl) {
      imgEl.src = imgUrl;
      if (titleEl) titleEl.textContent = title;
      if (captionEl) captionEl.textContent = caption;
      modal.classList.add('active');
    }
  }

  closeGalleryModal() {
    const modal = document.getElementById('galleryModal');
    if (modal) modal.classList.remove('active');
  }

  // --- 8. CUSTOMER REVIEWS & RATING BARS ---
  renderCustomerReviews() {
    const container = document.getElementById('customerReviewsTrack');
    if (!container) return;

    let html = '';
    CUSTOMER_REVIEWS.forEach(review => {
      html += `
        <div class="review-card">
          <div class="review-header">
            <div class="user-avatar">${review.avatar}</div>
            <div class="user-info">
              <h4>${review.name}</h4>
              <span class="review-date">${review.date}</span>
            </div>
          </div>
          <div class="star-rating">
            ${'★'.repeat(review.rating)}
          </div>
          <p class="review-comment">"${review.comment}"</p>
          <div class="review-source">Verified Google Maps Review 5.0 ⭐</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- 9. TODAY'S DEAL COUNTDOWN TIMER ---
  setupDealCountdown() {
    const timerHours = document.getElementById('timerHours');
    const timerMins = document.getElementById('timerMins');
    const timerSecs = document.getElementById('timerSecs');

    if (!timerHours || !timerMins || !timerSecs) return;

    // Set countdown for 4 hours from now
    let totalSeconds = 4 * 3600 + 35 * 60 + 20;

    setInterval(() => {
      if (totalSeconds <= 0) totalSeconds = 4 * 3600;
      totalSeconds--;

      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      timerHours.textContent = String(h).padStart(2, '0');
      timerMins.textContent = String(m).padStart(2, '0');
      timerSecs.textContent = String(s).padStart(2, '0');
    }, 1000);
  }

  setupEventListeners() {
    // Search Input Listener
    const searchInput = document.getElementById('menuSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.activeSearch = e.target.value;
        this.renderMenuGrid();
      });
    }

    // Header Global Search
    const globalSearch = document.getElementById('headerSearchInput');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        this.activeSearch = e.target.value;
        if (searchInput) searchInput.value = e.target.value;
        this.renderMenuGrid();
        
        // Scroll to menu section on typing
        const menuSection = document.getElementById('digitalMenuSection');
        if (menuSection && e.target.value.length > 0) {
          menuSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Diet Filter Switches (All, Veg, Non-Veg)
    const dietBtns = document.querySelectorAll('.diet-filter-btn');
    dietBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        dietBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeVegFilter = btn.dataset.diet;
        this.renderMenuGrid();
      });
    });

    // Hero Slider Arrows
    const nextBtn = document.getElementById('nextHeroSlideBtn');
    const prevBtn = document.getElementById('prevHeroSlideBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextHeroSlide());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevHeroSlide());

    // Close Modal Event Listeners
    const closeDishModalBtn = document.getElementById('closeDishModalBtn');
    if (closeDishModalBtn) closeDishModalBtn.addEventListener('click', () => this.closeDishDetailModal());

    const closeGalleryModalBtn = document.getElementById('closeGalleryModalBtn');
    if (closeGalleryModalBtn) closeGalleryModalBtn.addEventListener('click', () => this.closeGalleryModal());
  }
}

const uiController = new UIController();
document.addEventListener('DOMContentLoaded', () => {
  uiController.init();
});
