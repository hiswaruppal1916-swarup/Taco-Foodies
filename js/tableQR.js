/**
 * TACO Foodies QR Table Management System
 * Automatically detects table number from URL query string ?table=N
 */
class TableQRSystem {
  constructor() {
    this.currentTable = this.detectTableFromURL() || localStorage.getItem('taco_foodies_table_number') || null;
  }

  init() {
    this.setupEventListeners();
    if (this.currentTable) {
      localStorage.setItem('taco_foodies_table_number', this.currentTable);
      this.displayTableWelcomeBanner(this.currentTable);
      this.updateHeaderTableBadge(this.currentTable);
    }
  }

  detectTableFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam && !isNaN(tableParam) && parseInt(tableParam, 10) > 0) {
      return parseInt(tableParam, 10);
    }
    return null;
  }

  displayTableWelcomeBanner(tableNumber) {
    const bannerContainer = document.getElementById('qrTableBanner');
    if (bannerContainer) {
      bannerContainer.innerHTML = `
        <div class="qr-welcome-alert">
          <div class="alert-content">
            <span class="table-icon">📍</span>
            <div class="text">
              <span class="welcome-heading">Welcome to <strong>TACO Foodies</strong>!</span>
              <p>You are sitting at <strong>Table ${tableNumber}</strong>. Browse menu & order directly to your table.</p>
            </div>
          </div>
          <button class="change-table-btn" onclick="tableQRSystem.openTablePicker()">Change Table</button>
        </div>
      `;
      bannerContainer.style.display = 'block';
    }
  }

  updateHeaderTableBadge(tableNumber) {
    const headerBadge = document.getElementById('headerTableBadge');
    if (headerBadge) {
      headerBadge.innerHTML = `📍 Table ${tableNumber}`;
      headerBadge.classList.add('active');
    }
  }

  openTablePicker() {
    const modal = document.getElementById('tablePickerModal');
    if (modal) {
      this.highlightActiveTableButton();
      modal.classList.add('active');
    }
  }

  closeTablePicker() {
    const modal = document.getElementById('tablePickerModal');
    if (modal) modal.classList.remove('active');
  }

  highlightActiveTableButton() {
    const btns = document.querySelectorAll('.table-num-btn');
    btns.forEach(btn => {
      const num = parseInt(btn.textContent.replace('T-', ''), 10);
      if (num === parseInt(this.currentTable, 10)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setTable(tableNum) {
    if (!tableNum || isNaN(tableNum) || parseInt(tableNum, 10) <= 0) return;
    const num = parseInt(tableNum, 10);
    this.currentTable = num;
    localStorage.setItem('taco_foodies_table_number', num);
    this.displayTableWelcomeBanner(num);
    this.updateHeaderTableBadge(num);
    this.closeTablePicker();
    
    // Update URL without refreshing page
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('table', num);
    window.history.pushState({ path: newUrl.href }, '', newUrl.href);

    // Notify cart system
    window.dispatchEvent(new CustomEvent('tableChanged', { detail: num }));
  }

  getTable() {
    return this.currentTable;
  }

  setupEventListeners() {
    const closeBtn = document.getElementById('closeTableModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeTablePicker());

    const saveCustomBtn = document.getElementById('saveCustomTableBtn');
    const customInput = document.getElementById('customTableInput');
    
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', () => {
        const val = customInput ? customInput.value.trim() : '';
        if (val && !isNaN(val)) {
          this.setTable(parseInt(val, 10));
        }
      });
    }

    const modal = document.getElementById('tablePickerModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeTablePicker();
      });
    }
  }
}

const tableQRSystem = new TableQRSystem();
