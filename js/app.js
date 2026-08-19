/**
 * TACO Foodies App Entry Point
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌮 TACO Foodies Web App Loaded');

  // Initialize QR Table System
  if (typeof tableQRSystem !== 'undefined') {
    tableQRSystem.init();
  }

  // Initialize Google Sheets Sync System
  if (typeof googleSheetsSync !== 'undefined') {
    googleSheetsSync.init();
  }

  // Initialize Cart System
  if (typeof cartSystem !== 'undefined') {
    cartSystem.init();
  }

  // Sticky Header Scroll Shadow
  const header = document.querySelector('.flipkart-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
});
