/**
 * TACO Foodies Default Menu Data
 * Fallback dataset if Google Sheets CSV is not connected or offline
 */
const DEFAULT_MENU_DATA = [
  // 🔥 Trending & Mexican Favorites
  {
    id: "m1",
    name: "Supreme Loaded Beef Taco (Double Soft Shell)",
    category: "Mexican",
    price: 180,
    originalPrice: 220,
    discount: "18% OFF",
    rating: 4.9,
    ratingCount: 124,
    image: "images/hero_taco.png",
    description: "Double layered soft tortilla packed with slow-cooked seasoned beef, melted cheddar cheese, fresh pico de gallo, and smoky chipotle drizzle.",
    isVeg: false,
    spicyLevel: 2,
    isTrending: true,
    isTodayDeal: true,
    tag: "Bestseller"
  },
  {
    id: "m2",
    name: "Cheesy Crunchy Veg Crunch Taco",
    category: "Mexican",
    price: 120,
    originalPrice: 150,
    discount: "20% OFF",
    rating: 4.8,
    ratingCount: 98,
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
    description: "Crispy corn taco shell stuffed with spiced pinto beans, sweet corn, melted mozzarella, jalapeños, and tangy sour cream sauce.",
    isVeg: true,
    spicyLevel: 1,
    isTrending: true,
    isTodayDeal: false,
    tag: "Veg Special"
  },
  {
    id: "m3",
    name: "Fiery Chicken Quesadilla Sizzler",
    category: "Mexican",
    price: 190,
    originalPrice: 240,
    discount: "21% OFF",
    rating: 5.0,
    ratingCount: 150,
    image: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=600&q=80",
    description: "Grilled flour tortilla stuffed with spiced chicken, caramelized peppers, melted Monterey Jack cheese, served with guacamole & dip.",
    isVeg: false,
    spicyLevel: 2,
    isTrending: true,
    isTodayDeal: true,
    tag: "Chef Special"
  },
  {
    id: "m4",
    name: "Ultimate Nachos Supreme Platter",
    category: "Mexican",
    price: 160,
    originalPrice: 199,
    discount: "20% OFF",
    rating: 4.9,
    ratingCount: 86,
    image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80",
    description: "Crispy tortilla chips layered with warm cheese fountain sauce, jalapeño rings, olives, salsa, and homemade Mexican seasoning.",
    isVeg: true,
    spicyLevel: 1,
    isTrending: false,
    isTodayDeal: false,
    tag: "Must Try"
  },

  // 🍜 Chinese Specials
  {
    id: "c1",
    name: "Indo-Chinese Sizzling Chili Chicken",
    category: "Chinese",
    price: 170,
    originalPrice: 210,
    discount: "19% OFF",
    rating: 5.0,
    ratingCount: 210,
    image: "images/sizzling_starter.png",
    description: "Crispy tossed boneless chicken cubes sautéed with green chillies, bell peppers, dark soy sauce, and scallions on a sizzler plate.",
    isVeg: false,
    spicyLevel: 3,
    isTrending: true,
    isTodayDeal: true,
    tag: "🔥 Hot & Spicy"
  },
  {
    id: "c2",
    name: "Schezwan Hakka Noodles (Special Wok)",
    category: "Chinese",
    price: 130,
    originalPrice: 160,
    discount: "18% OFF",
    rating: 4.8,
    ratingCount: 175,
    image: "images/hero_chinese.png",
    description: "Smoky wok-tossed noodles with colorful crunch vegetables, garlic, red Schezwan sauce, and fresh coriander garnish.",
    isVeg: true,
    spicyLevel: 2,
    isTrending: true,
    isTodayDeal: false,
    tag: "Top Rated"
  },
  {
    id: "c3",
    name: "Steamed Chicken Dim Sum (8 Pcs)",
    category: "Chinese",
    price: 140,
    originalPrice: 175,
    discount: "20% OFF",
    rating: 4.9,
    ratingCount: 140,
    image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80",
    description: "Delicate handcrafted dumplings filled with juicy seasoned minced chicken & herbs, served with fiery sesame chilli dip.",
    isVeg: false,
    spicyLevel: 1,
    isTrending: true,
    isTodayDeal: true,
    tag: "Popular"
  },
  {
    id: "c4",
    name: "Crispy Dry Vegetable Manchurian",
    category: "Chinese",
    price: 120,
    originalPrice: 150,
    discount: "20% OFF",
    rating: 4.7,
    ratingCount: 92,
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",
    description: "Golden fried veggie balls tossed in ginger, garlic, chopped chilli, and tangy Manchurian soy glaze.",
    isVeg: true,
    spicyLevel: 2,
    isTrending: false,
    isTodayDeal: false,
    tag: "Veg Favorite"
  },

  // 👨‍🍳 Chef's Recommendations & Combos
  {
    id: "cb1",
    name: "TACO Foodies Master Dragon Box",
    category: "Combos",
    price: 199,
    originalPrice: 279,
    discount: "28% OFF",
    rating: 5.0,
    ratingCount: 310,
    image: "images/hero_chinese.png",
    description: "Ultimate Feast: 1 Crunch Chicken Taco, 1 Schezwan Chicken Noodle portion, 2 Steamed Momos, and 1 Chilled Beverage.",
    isVeg: false,
    spicyLevel: 2,
    isTrending: true,
    isTodayDeal: true,
    tag: "👑 Bestselling Combo"
  },
  {
    id: "cb2",
    name: "Fiesta Veg Mexican Combo Deal",
    category: "Combos",
    price: 169,
    originalPrice: 220,
    discount: "23% OFF",
    rating: 4.9,
    ratingCount: 115,
    image: "images/hero_taco.png",
    description: "2 Cheesy Veg Tacos + Mini Nachos Platter + Cold Lemon Mint Cooler.",
    isVeg: true,
    spicyLevel: 1,
    isTrending: false,
    isTodayDeal: true,
    tag: "Value Pack"
  },

  // 🥤 Beverages & Coolers
  {
    id: "b1",
    name: "Mexican Sunset Mango Mojito",
    category: "Beverages",
    price: 90,
    originalPrice: 120,
    discount: "25% OFF",
    rating: 4.9,
    ratingCount: 88,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    description: "Refreshing sparkling mango cooler infused with fresh mint leaves, lime juice, and crushed ice.",
    isVeg: true,
    spicyLevel: 0,
    isTrending: true,
    isTodayDeal: false,
    tag: "Refreshing"
  },
  {
    id: "b2",
    name: "Classic Blue Lagoon Chill",
    category: "Beverages",
    price: 85,
    originalPrice: 110,
    discount: "22% OFF",
    rating: 4.8,
    ratingCount: 64,
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    description: "Vibrant blue curaçao fizz with lemon juice, sprite, and fresh mint sprigs.",
    isVeg: true,
    spicyLevel: 0,
    isTrending: false,
    isTodayDeal: true,
    tag: "Cooler"
  },
  {
    id: "b3",
    name: "Cold Coffee with Chocolate Drizzle",
    category: "Beverages",
    price: 99,
    originalPrice: 130,
    discount: "24% OFF",
    rating: 5.0,
    ratingCount: 142,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
    description: "Thick creamy blended cold coffee topped with cocoa powder, whipped cream & chocolate syrup.",
    isVeg: true,
    spicyLevel: 0,
    isTrending: true,
    isTodayDeal: false,
    tag: "Favorite"
  }
];

const PROMO_SLIDES = [
  {
    id: 1,
    dishId: "m1",
    title: "Signature Flaming Mexican Tacos",
    subtitle: "AUTHENTIC SPICE & LOADED CHEESE",
    offer: "FLAT 20% OFF",
    code: "TACO20",
    badge: "🔥 Hot & Crispy",
    image: "images/hero_taco.png",
    cta: "Order Tacos Now",
    filterCategory: "Mexican"
  },
  {
    id: 2,
    dishId: "c1",
    title: "Indo-Chinese Sizzler Fest",
    subtitle: "SZZLING CHILI CHICKEN & HAKKA NOODLES",
    offer: "BUY 1 GET 1 STARTER",
    code: "CHINESE50",
    badge: "🍜 Chef Recommended",
    image: "images/hero_chinese.png",
    cta: "Explore Chinese Specials",
    filterCategory: "Chinese"
  },
  {
    id: 3,
    dishId: "cb1",
    title: "Master Dragon Combo Box",
    subtitle: "TACO + NOODLES + MOMOS + DRINK",
    offer: "SPECIAL @ JUST ₹199",
    code: "MASTERBOX",
    badge: "👑 Most Popular",
    image: "images/sizzling_starter.png",
    cta: "Claim Combo Offer",
    filterCategory: "Combos"
  }
];

const GALLERY_PHOTOS = [
  {
    id: "g1",
    title: "Vibrant Dining Ambiance",
    category: "Interior",
    image: "images/restaurant_interior.png",
    caption: "Modern yellow and teal floral stencil walls with sleek dining tables at Bhupati Nagar."
  },
  {
    id: "g2",
    title: "Signature Sizzler Platter",
    category: "Food",
    image: "images/sizzling_starter.png",
    caption: "Freshly tossed Indo-Chinese chili chicken served with raw onions & dips."
  },
  {
    id: "g3",
    title: "Flaming Beef Taco Trio",
    category: "Food",
    image: "images/hero_taco.png",
    caption: "Loaded Mexican taco feast topped with cilantro and melted cheese."
  },
  {
    id: "g4",
    title: "Wok & Steamer Station",
    category: "Kitchen",
    image: "images/hero_chinese.png",
    caption: "Chef preparing fresh steaming dim sum dumplings and high-fire wok noodles."
  },
  {
    id: "g5",
    title: "Customer Table Setup",
    category: "Dining",
    image: "images/restaurant_interior.png",
    caption: "Sleek dining setup ready for 24/7 food lovers."
  }
];

const CUSTOMER_REVIEWS = [
  {
    id: "r1",
    name: "Preetam Pal",
    rating: 5,
    date: "1 month ago",
    comment: "Awesome food quality and very cozy interior! The Mexican tacos and Schezwan noodles are a must-try in Bhupati Nagar.",
    avatar: "PP"
  },
  {
    id: "r2",
    name: "Ankan Mandal",
    rating: 5,
    date: "2 weeks ago",
    comment: "Top-class presentation and taste! Sizzler chicken platter was sizzling hot and super flavorful. 5 star rating well deserved!",
    avatar: "AM"
  },
  {
    id: "r3",
    name: "Ranjan Mitra",
    rating: 5,
    date: "3 weeks ago",
    comment: "Great spot for foodies! 24/7 service is super helpful. Friendly staff and awesome combo meals under ₹200.",
    avatar: "RM"
  }
];
