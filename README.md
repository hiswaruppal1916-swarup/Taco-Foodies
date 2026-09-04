# Taco-Foodies 🌮🍜

**Mexican & Chinese Fusion Restaurant Web Application**

## 🌟 Key Features
- 🌮 **Flipkart-Style E-Commerce Layout**: Interactive horizontal carousels, promotional hero slider, category pills, and full digital menu matrix.
- 🛒 **Add to Cart & Cart Drawer**: Seamless add to cart functionality across all food cards, hero slider promos, and lightbox modal dialogs with live total calculation & toast notifications.
- 💬 **WhatsApp Order Engine**: Instant table/delivery order formatting sent directly to WhatsApp (`08400310013`).
- 📍 **Interactive QR Table Selection Modal**: Dynamic table badge and table switcher (Tables 1–12 or custom table numbers).
- ⚙️ **Google Sheets Live Sync**: Restaurant owners can connect published Google Sheet CSV URLs to update dish names, prices, discounts, and images in real time without writing code.
- 📱 **Responsive & Mobile Floating Bar**: Optimized for mobile and desktop screens.

## 📁 Project Structure
```text
taco foodies/
├── css/
│   ├── animations.css
│   ├── components.css
│   └── main.css
├── images/
│   ├── hero_chinese.png
│   ├── hero_taco.png
│   ├── restaurant_interior.png
│   └── sizzling_starter.png
├── js/
│   ├── app.js
│   ├── cart.js
│   ├── googleSheetsSync.js
│   ├── menuData.js
│   ├── tableQR.js
│   └── UIController.js
├── index.html
└── README.md
```

## 🚀 How to Run Locally
Open `index.html` directly in any standard browser or serve using a local server:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080`.
