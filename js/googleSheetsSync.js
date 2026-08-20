/**
 * Google Sheets Menu Sync Engine for TACO Foodies
 * Allows restaurant owner to connect a published Google Sheet CSV to update menu dynamically
 */
class GoogleSheetsSync {
  constructor() {
    this.sheetUrlKey = 'taco_foodies_google_sheet_url';
    this.customMenuKey = 'taco_foodies_custom_menu_data';
    this.currentSheetUrl = localStorage.getItem(this.sheetUrlKey) || '';
  }

  init() {
    this.setupAdminModal();
    if (this.currentSheetUrl) {
      this.fetchSheetData(this.currentSheetUrl);
    }
  }

  parseCSVLine(line) {
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cell.trim().replace(/^"|"$/g, ''));
        cell = '';
      } else {
        cell += c;
      }
    }
    result.push(cell.trim().replace(/^"|"$/g, ''));
    return result;
  }

  // Parse CSV string into array of menu objects
  parseCSV(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    if (lines.length < 2) return null;

    const items = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cleanValues = this.parseCSVLine(lines[i]);
      if (cleanValues.length < 3) continue;

      const item = {
        id: cleanValues[0] || `gs_${i}`,
        name: cleanValues[1] || 'Unnamed Dish',
        category: cleanValues[2] || 'Mexican',
        price: parseFloat(cleanValues[3]) || 100,
        originalPrice: parseFloat(cleanValues[4]) || Math.round((parseFloat(cleanValues[3]) || 100) * 1.25),
        discount: cleanValues[5] || '15% OFF',
        image: cleanValues[6] || 'images/hero_taco.png',
        description: cleanValues[7] || 'Delicious specialty dish.',
        isVeg: (cleanValues[8] || '').toLowerCase() === 'true' || cleanValues[8] === '1' || (cleanValues[8] || '').toLowerCase() === 'veg',
        spicyLevel: parseInt(cleanValues[9]) || 1,
        isTrending: (cleanValues[10] || '').toLowerCase() === 'true' || cleanValues[10] === '1',
        isTodayDeal: (cleanValues[11] || '').toLowerCase() === 'true' || cleanValues[11] === '1',
        rating: 4.9,
        ratingCount: 50
      };

      items.push(item);
    }

    return items.length > 0 ? items : null;
  }

  async fetchSheetData(url) {
    const statusEl = document.getElementById('sheetSyncStatus');
    if (statusEl) {
      statusEl.innerHTML = `<span class="badge syncing">🔄 Syncing with Google Sheet...</span>`;
    }

    try {
      // Ensure URL is outputting CSV format
      let csvUrl = url;
      if (url.includes('docs.google.com/spreadsheets') && !url.includes('output=csv') && !url.includes('/pub?')) {
        const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (docIdMatch) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${docIdMatch[1]}/export?format=csv`;
        }
      }

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const csvText = await response.text();
      const parsedItems = this.parseCSV(csvText);

      if (parsedItems && parsedItems.length > 0) {
        localStorage.setItem(this.sheetUrlKey, url);
        localStorage.setItem(this.customMenuKey, JSON.stringify(parsedItems));
        
        if (statusEl) {
          statusEl.innerHTML = `<span class="badge success">🟢 Live Google Sheet Connected (${parsedItems.length} items)</span>`;
        }

        // Trigger UI update event
        window.dispatchEvent(new CustomEvent('menuDataUpdated', { detail: parsedItems }));
        return true;
      } else {
        throw new Error('CSV file was empty or improperly formatted.');
      }
    } catch (error) {
      console.warn('Google Sheet Sync warning, using fallback dataset:', error.message);
      if (statusEl) {
        statusEl.innerHTML = `<span class="badge warning">⚠️ Google Sheet Offline (Using Default Data)</span>`;
      }
      return false;
    }
  }

  getActiveMenuData() {
    if (this.currentSheetUrl) {
      const customData = localStorage.getItem(this.customMenuKey);
      if (customData) {
        try {
          return JSON.parse(customData);
        } catch (e) {
          console.error('Error reading cached custom menu', e);
        }
      }
    } else {
      // Automatically clear stale cache when no live Google Sheet is connected
      localStorage.removeItem(this.customMenuKey);
    }
    return DEFAULT_MENU_DATA;
  }

  setupAdminModal() {
    const modalBtn = document.getElementById('openOwnerSyncModalBtn');
    const modal = document.getElementById('ownerSyncModal');
    const closeBtn = document.getElementById('closeSyncModalBtn');
    const saveBtn = document.getElementById('saveSheetUrlBtn');
    const resetBtn = document.getElementById('resetSheetUrlBtn');
    const sheetInput = document.getElementById('googleSheetUrlInput');

    if (!modal) return;

    if (modalBtn) {
      modalBtn.addEventListener('click', () => {
        if (sheetInput) sheetInput.value = localStorage.getItem(this.sheetUrlKey) || '';
        modal.classList.add('active');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const url = sheetInput ? sheetInput.value.trim() : '';
        if (url) {
          const success = await this.fetchSheetData(url);
          if (success) {
            alert('Google Sheet successfully connected & menu updated!');
            modal.classList.remove('active');
          } else {
            alert('Failed to connect to Google Sheet. Check published CSV permissions.');
          }
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        localStorage.removeItem(this.sheetUrlKey);
        localStorage.removeItem(this.customMenuKey);
        const statusEl = document.getElementById('sheetSyncStatus');
        if (statusEl) statusEl.innerHTML = `<span class="badge info">ℹ️ Using Default Menu</span>`;
        window.dispatchEvent(new CustomEvent('menuDataUpdated', { detail: DEFAULT_MENU_DATA }));
        alert('Reset to default TACO Foodies menu!');
        modal.classList.remove('active');
      });
    }
  }
}

const googleSheetsSync = new GoogleSheetsSync();
