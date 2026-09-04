/**
 * TACO Foodies — PWA Install & Service Worker Lifecycle Manager
 * Handles real browser PWA installation prompts (WebAPK / Chrome / Edge),
 * standalone detection, iOS Safari Add-to-Home-Screen guides, and SW registration.
 */

class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isStandalone = false;
    this.isIOS = false;
    this.init();
  }

  init() {
    // 1. Detect Standalone Mode
    this.detectStandalone();

    // 2. Detect iOS Device
    this.detectIOS();

    // 3. Register Service Worker
    this.registerServiceWorker();

    // 4. Bind PWA Event Listeners
    this.bindEvents();

    // 5. Initial UI Sync
    document.addEventListener('DOMContentLoaded', () => {
      this.syncUI();
    });
  }

  detectStandalone() {
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true ||
                       document.referrer.includes('android-app://');
    
    if (this.isStandalone) {
      console.log('📱 TACO Foodies running in PWA Standalone Mode');
      localStorage.setItem('taco_pwa_installed', 'true');
    }
  }

  detectIOS() {
    const ua = window.navigator.userAgent;
    this.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('⚡ TACO Foodies Service Worker Registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration error (non-fatal):', err);
          });
      });
    }
  }

  bindEvents() {
    // Capture real browser installation event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('💡 PWA beforeinstallprompt event captured');

      // Update UI elements to show install option
      this.syncUI();

      // Automatically offer install banner if user hasn't dismissed recently
      this.checkAndShowAutoBanner();
    });

    // Capture successful installation event
    window.addEventListener('appinstalled', () => {
      console.log('🎉 TACO Foodies PWA installed successfully!');
      this.deferredPrompt = null;
      localStorage.setItem('taco_pwa_installed', 'true');
      this.hideInstallBanner();
      this.syncUI();
    });
  }

  syncUI() {
    const headerBtn = document.getElementById('headerPwaInstallBtn');
    const mobileActionBtn = document.getElementById('mobilePwaInstallBtn');
    const installBanner = document.getElementById('pwaInstallBanner');

    if (this.isStandalone || localStorage.getItem('taco_pwa_installed') === 'true') {
      if (headerBtn) headerBtn.style.display = 'none';
      if (mobileActionBtn) mobileActionBtn.style.display = 'none';
      if (installBanner) installBanner.style.display = 'none';
      return;
    }

    // If browser supports install prompt or is iOS, display install buttons
    if (this.deferredPrompt || this.isIOS) {
      if (headerBtn) headerBtn.style.display = 'inline-flex';
      if (mobileActionBtn) mobileActionBtn.style.display = 'flex';
    }
  }

  checkAndShowAutoBanner() {
    if (this.isStandalone || localStorage.getItem('taco_pwa_installed') === 'true') {
      return;
    }

    const lastDismiss = localStorage.getItem('taco_pwa_dismiss_time');
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (lastDismiss && (Date.now() - parseInt(lastDismiss, 10) < sevenDaysInMs)) {
      // User dismissed within last 7 days, don't show auto banner (manual button click still works)
      return;
    }

    // Show banner after 2.5 seconds
    setTimeout(() => {
      if (this.deferredPrompt && !this.isStandalone) {
        this.showInstallBanner();
      }
    }, 2500);
  }

  async triggerInstallPrompt() {
    if (this.deferredPrompt) {
      // Trigger real browser PWA install prompt
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted TACO Foodies PWA install prompt');
        localStorage.setItem('taco_pwa_installed', 'true');
        this.hideInstallBanner();
      } else {
        console.log('User dismissed TACO Foodies PWA install prompt');
        localStorage.setItem('taco_pwa_dismiss_time', Date.now().toString());
        this.hideInstallBanner();
      }
      this.deferredPrompt = null;
      this.syncUI();
    } else if (this.isIOS) {
      // Display iOS Safari Add-to-Home-Screen Modal
      this.showIOSInstallModal();
    } else if (this.isStandalone) {
      alert('🌮 TACO Foodies is already installed and running as an app!');
    } else {
      alert('To install TACO Foodies:\n1. Open browser menu (⋮ or ⋯)\n2. Select "Add to Home screen" or "Install app"');
    }
  }

  showInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner && !this.isStandalone && localStorage.getItem('taco_pwa_installed') !== 'true') {
      banner.classList.add('visible');
    }
  }

  hideInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.classList.remove('visible');
    }
  }

  dismissInstallBanner() {
    this.hideInstallBanner();
    localStorage.setItem('taco_pwa_dismiss_time', Date.now().toString());
  }

  showIOSInstallModal() {
    const modal = document.getElementById('iosPwaModal');
    if (modal) {
      modal.classList.add('active');
    } else {
      alert('To install TACO Foodies on iOS:\n1. Tap the Share icon (⎋) below\n2. Scroll down and tap "Add to Home Screen (➕)"');
    }
  }

  closeIOSInstallModal() {
    const modal = document.getElementById('iosPwaModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }
}

// Global Singleton Instance
window.pwaInstallManager = new PWAInstallManager();
