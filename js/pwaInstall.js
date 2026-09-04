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
    // 1. Clear any legacy permanent installed flag to support re-installation after uninstallation
    try {
      localStorage.removeItem('taco_pwa_installed');
      localStorage.removeItem('taco_pwa_dismiss_time');
    } catch (e) {}

    // 2. Detect Standalone Mode (Runtime State)
    this.detectStandalone();

    // 3. Detect iOS Device
    this.detectIOS();

    // 4. Register Service Worker
    this.registerServiceWorker();

    // 5. Bind PWA Event Listeners
    this.bindEvents();

    // 6. Initial UI Sync
    document.addEventListener('DOMContentLoaded', () => {
      this.syncUI();
      this.attachButtonListeners();
    });
  }

  detectStandalone() {
    // Determine runtime standalone display mode
    this.isStandalone = (
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );

    // Dynamic listener for display-mode changes
    try {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
        this.isStandalone = evt.matches;
        this.syncUI();
      });
    } catch (e) {}

    if (this.isStandalone) {
      console.log('📱 TACO Foodies running in PWA Standalone Mode');
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
            console.log('⚡ TACO Foodies Service Worker Registered:', reg.scope);
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
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('💡 PWA beforeinstallprompt event captured');

      // Update UI elements to show install option
      this.syncUI();

      // Automatically offer install banner if user hasn't dismissed in current session
      this.checkAndShowAutoBanner();
    });

    // Capture successful installation event
    window.addEventListener('appinstalled', () => {
      console.log('🎉 TACO Foodies PWA installed successfully!');
      this.deferredPrompt = null;
      this.hideInstallBanner();
      this.syncUI();
    });
  }

  attachButtonListeners() {
    const dismissBtn = document.getElementById('pwaDismissBtn');
    if (dismissBtn) {
      dismissBtn.onclick = (e) => this.dismissInstallBanner(e);
    }
  }

  syncUI() {
    const headerBtn = document.getElementById('headerPwaInstallBtn');
    const mobileActionBtn = document.getElementById('mobilePwaInstallBtn');
    const installBanner = document.getElementById('pwaInstallBanner');

    // CASE 1: Currently running in standalone/installed app mode
    if (this.isStandalone) {
      if (headerBtn) headerBtn.style.display = 'none';
      if (mobileActionBtn) mobileActionBtn.style.display = 'none';
      if (installBanner) {
        installBanner.classList.remove('visible');
        installBanner.style.display = 'none';
      }
      return;
    }

    // CASE 2: Visiting in standard browser and app is NOT currently standalone
    // If browser supports install prompt or is iOS Safari, show install buttons
    if (this.deferredPrompt || this.isIOS) {
      if (headerBtn) headerBtn.style.display = 'inline-flex';
      if (mobileActionBtn) mobileActionBtn.style.display = 'flex';
    } else {
      if (headerBtn) headerBtn.style.display = 'none';
      if (mobileActionBtn) mobileActionBtn.style.display = 'none';
      if (installBanner) {
        installBanner.classList.remove('visible');
        installBanner.style.display = 'none';
      }
    }
  }

  checkAndShowAutoBanner() {
    if (this.isStandalone || !this.deferredPrompt) {
      return;
    }

    // Check if banner was dismissed in this session
    if (sessionStorage.getItem('taco_pwa_banner_dismissed') === 'true') {
      return;
    }

    // Show banner after 2 seconds if browser prompt is ready
    setTimeout(() => {
      if (this.deferredPrompt && !this.isStandalone && sessionStorage.getItem('taco_pwa_banner_dismissed') !== 'true') {
        this.showInstallBanner();
      }
    }, 2000);
  }

  async triggerInstallPrompt() {
    if (this.deferredPrompt) {
      // Direct Native PWA Install Prompt (No custom instruction alert first)
      try {
        this.deferredPrompt.prompt();
        const choiceResult = await this.deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted TACO Foodies PWA install prompt');
          this.hideInstallBanner();
        } else {
          console.log('User dismissed TACO Foodies PWA install prompt');
          this.dismissInstallBanner();
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
      this.deferredPrompt = null;
      this.syncUI();
    } else if (this.isIOS) {
      // Platform-specific iOS Safari Add-to-Home-Screen instructions fallback
      this.showIOSInstallModal();
    }
    // No alert() instruction popup on unsupported or non-iOS browsers!
  }

  showInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner && !this.isStandalone && this.deferredPrompt && sessionStorage.getItem('taco_pwa_banner_dismissed') !== 'true') {
      banner.style.display = 'flex';
      banner.removeAttribute('aria-hidden');
      void banner.offsetWidth; // Force reflow
      banner.classList.add('visible');
    }
  }

  hideInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => {
        if (!banner.classList.contains('visible')) {
          banner.style.display = 'none';
          banner.setAttribute('aria-hidden', 'true');
        }
      }, 400);
    }
  }

  dismissInstallBanner(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    this.hideInstallBanner();
    sessionStorage.setItem('taco_pwa_banner_dismissed', 'true');
  }

  showIOSInstallModal() {
    const modal = document.getElementById('iosPwaModal');
    if (modal) {
      modal.classList.add('active');
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
