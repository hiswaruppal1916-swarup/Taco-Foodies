/**
 * TACO Foodies - Supabase Centralized Database & Realtime Client
 * 100% Centralized Supabase Database & Realtime Sync Engine for Multi-Device Operations.
 */
class SupabaseClientService {
  constructor() {
    this.supabaseUrl = 'https://mqbngtgwejzammhdwczl.supabase.co';
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYm5ndGd3ZWp6YW1taGR3Y3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkyMDUsImV4cCI6MjEwMjY5NTIwNX0.BA1xfJGa1ZZ9mxFTZyAJj7dJEACJUxZQyxvA5v92_EM';
    this.authorizedOwnerEmail = 'restaurantowner@gmail.com';
    this.client = null;
    this.ordersChannel = null;
    this.realtimeListeners = new Set();
    this.init();
  }

  init() {
    this.getClient();
  }

  getClient() {
    if (!this.client && typeof window.supabase !== 'undefined') {
      try {
        this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        console.log('⚡ Supabase Client Initialized:', this.supabaseUrl);
      } catch (e) {
        console.warn('Supabase initialization error:', e);
      }
    }
    if (this.client && !this.ordersChannel) {
      this.initOrdersRealtimeChannel();
    }
    return this.client;
  }

  // SINGLETON REALTIME WEBSOCKET SUBSCRIPTION
  initOrdersRealtimeChannel() {
    if (!this.client || this.ordersChannel) return;

    try {
      const channelId = 'orders-global-realtime-' + Math.floor(Math.random() * 1000000);
      this.ordersChannel = this.client
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            console.log('⚡ Supabase Realtime Event Received:', payload.eventType, payload.new || payload.old);
            this.notifyRealtimeListeners(payload);
          }
        )
        .subscribe((status, err) => {
          console.log(`⚡ Supabase Realtime Subscription Status: [${status}]`, err || '');
        });
    } catch (e) {
      console.warn('Realtime channel init exception:', e);
    }
  }

  addRealtimeListener(callback) {
    if (typeof callback === 'function') {
      this.realtimeListeners.add(callback);
    }
    this.getClient();
    return () => {
      this.realtimeListeners.delete(callback);
    };
  }

  notifyRealtimeListeners(payload) {
    this.realtimeListeners.forEach(listener => {
      try {
        listener(payload);
      } catch (e) {
        console.warn('Error in realtime listener callback:', e);
      }
    });
  }

  formatDbOrder(dbo) {
    if (!dbo) return null;
    const isDelivery = (dbo.order_type === 'home_delivery' || dbo.order_type === 'Home Delivery');
    
    // Normalize status strings for canonical state management
    let normStatus = dbo.status || 'pending';
    if (normStatus === 'confirmed') normStatus = 'accepted';
    if (normStatus === 'transit_ready') normStatus = 'ready';
    if (normStatus === 'delivering') normStatus = 'serving';
    if (normStatus === 'unavailable') normStatus = 'cancelled';
    if (normStatus === 'received') normStatus = 'pending';

    const guestVal = (dbo.guest_count !== null && dbo.guest_count !== undefined && !isNaN(dbo.guest_count))
      ? parseInt(dbo.guest_count, 10)
      : (dbo.table_number ? 2 : 1);

    return {
      id: dbo.order_number || dbo.id,
      order_number: dbo.order_number || dbo.id,
      db_id: dbo.id,
      timestamp: dbo.created_at || new Date().toISOString(),
      status: normStatus,
      type: isDelivery ? 'Home Delivery' : 'Dine-In',
      customerName: dbo.customer_name || (dbo.table_number ? `Dine-In (Table ${dbo.table_number})` : 'Customer'),
      phone: dbo.customer_phone || '',
      table: dbo.table_number || null,
      guests: guestVal,
      address: dbo.delivery_address || null,
      items: (dbo.order_items || []).map(i => ({
        name: i.item_name,
        quantity: parseInt(i.quantity || 1, 10),
        price: parseFloat(i.price || 0),
        isVeg: true
      })),
      foodTotal: parseFloat(dbo.subtotal || dbo.total || 0),
      deliveryFee: parseFloat(dbo.delivery_fee || 0),
      grandTotal: parseFloat(dbo.total || 0),
      paymentMethod: dbo.payment_method || 'Cash on Delivery'
    };
  }

  // --- 1. CREATE ORDER IN SUPABASE DATABASE ---
  async createOrder(orderPayload) {
    const client = this.getClient();
    const orderNumber = 'TF-' + Math.floor(1000 + Math.random() * 9000);
    const orderType = (orderPayload.type === 'Dine-In') ? 'dine_in' : 'home_delivery';

    const parsedGuests = (orderPayload.guests !== null && orderPayload.guests !== undefined && !isNaN(orderPayload.guests))
      ? parseInt(orderPayload.guests, 10)
      : (orderPayload.table ? 2 : 1);

    const orderData = {
      order_number: orderNumber,
      order_type: orderType,
      table_number: orderPayload.table ? parseInt(orderPayload.table, 10) : null,
      customer_name: orderPayload.customerName || (orderPayload.table ? `Dine-In (Table ${orderPayload.table})` : 'Customer'),
      customer_phone: orderPayload.phone || '',
      delivery_address: orderPayload.address || null,
      guest_count: parsedGuests,
      subtotal: parseFloat(orderPayload.foodTotal || orderPayload.grandTotal || 0),
      delivery_fee: parseFloat(orderPayload.deliveryFee || 0),
      total: parseFloat(orderPayload.grandTotal || 0),
      status: 'pending',
      payment_method: orderPayload.paymentMethod || 'Cash on Delivery'
    };

    if (!client) {
      console.error('Supabase Client unavailable!');
      return null;
    }

    try {
      let customerId = null;
      if (orderPayload.customerName || orderPayload.phone) {
        const { data: custData } = await client
          .from('customers')
          .insert([{
            name: orderPayload.customerName || 'Customer',
            phone: orderPayload.phone || '',
            address: orderPayload.address || ''
          }])
          .select()
          .single();

        if (custData) customerId = custData.id;
      }

      orderData.customer_id = customerId;

      const { data: dbOrder, error: orderErr } = await client
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderErr) {
        console.error('Error inserting order into Supabase:', orderErr.message);
        return null;
      }

      if (dbOrder && orderPayload.items && orderPayload.items.length > 0) {
        const itemsToInsert = orderPayload.items.map(item => ({
          order_id: dbOrder.id,
          item_name: item.name,
          quantity: parseInt(item.quantity || 1, 10),
          price: parseFloat(item.price || 0)
        }));

        await client.from('order_items').insert(itemsToInsert);
      }

      const { data: fullOrder } = await client
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', dbOrder.id)
        .single();

      return this.formatDbOrder(fullOrder || dbOrder);
    } catch (e) {
      console.error('Exception creating order in Supabase:', e);
      return null;
    }
  }

  // --- 2. FETCH CUSTOMER ORDERS FROM SUPABASE ---
  async fetchCustomerOrders(orderNumbers = []) {
    const client = this.getClient();
    if (!client || !orderNumbers || orderNumbers.length === 0) return [];

    try {
      const { data, error } = await client
        .from('orders')
        .select('*, order_items(*)')
        .in('order_number', orderNumbers)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching customer orders:', error.message);
        return [];
      }

      return (data || []).map(dbo => this.formatDbOrder(dbo));
    } catch (e) {
      console.warn('Exception fetching customer orders:', e);
      return [];
    }
  }

  async fetchOrdersByTable(tableNumber) {
    const client = this.getClient();
    if (!client || !tableNumber) return [];

    try {
      const { data, error } = await client
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_number', parseInt(tableNumber, 10))
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching table orders:', error.message);
        return [];
      }

      return (data || []).map(dbo => this.formatDbOrder(dbo));
    } catch (e) {
      console.warn('Exception fetching table orders:', e);
      return [];
    }
  }

  // --- 3. FETCH ALL OWNER ORDERS FROM SUPABASE ---
  async fetchOwnerOrders(statusFilter = 'all', typeFilter = 'all') {
    const client = this.getClient();
    if (!client) return [];

    try {
      let query = client
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.in('status', ['pending', 'received']);
        } else if (statusFilter === 'accepted') {
          query = query.in('status', ['accepted', 'confirmed']);
        } else if (statusFilter === 'preparing') {
          query = query.eq('status', 'preparing');
        } else if (statusFilter === 'ready') {
          query = query.in('status', ['ready', 'transit_ready']);
        } else if (statusFilter === 'serving') {
          query = query.in('status', ['serving', 'delivering']);
        } else if (statusFilter === 'completed') {
          query = query.eq('status', 'completed');
        } else if (statusFilter === 'cancelled') {
          query = query.in('status', ['cancelled', 'unavailable']);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      if (typeFilter && typeFilter !== 'all') {
        const dbType = (typeFilter === 'dine_in' || typeFilter === 'Dine-In') ? 'dine_in' : 'home_delivery';
        query = query.eq('order_type', dbType);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error fetching owner orders:', error.message);
        return [];
      }

      return (data || []).map(dbo => this.formatDbOrder(dbo));
    } catch (e) {
      console.warn('Exception fetching owner orders:', e);
      return [];
    }
  }

  // --- 4. UPDATE STATUS FOR SPECIFIC ORDER (UPDATE orders WHERE order_number = selected_id) ---
  async updateOrderStatus(orderId, newStatus) {
    const client = this.getClient();
    if (!client || !orderId) return false;

    try {
      const cleanId = String(orderId).trim();
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);

      let query = client.from('orders').update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      if (isUuid) {
        query = query.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
      } else {
        query = query.eq('order_number', cleanId);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('Error updating status in Supabase:', error.message);
        return false;
      }

      if (!data || data.length === 0) {
        console.warn(`No order record found in database matching identifier #${cleanId}`);
        return false;
      }

      console.log(`✅ Order #${cleanId} updated to status '${newStatus}' in Supabase database`);
      return true;
    } catch (e) {
      console.error('Exception updating order status:', e);
      return false;
    }
  }

  subscribeToRealtimeOrders(callback) {
    return this.addRealtimeListener(callback);
  }

  subscribeToOrderUpdates(orderNumber, onStatusUpdate) {
    return this.addRealtimeListener((payload) => {
      if (payload && payload.eventType === 'UPDATE' && payload.new) {
        const num = payload.new.order_number || payload.new.id;
        if (num === orderNumber || payload.new.id === orderNumber) {
          if (onStatusUpdate) onStatusUpdate(payload.new);
        }
      }
    });
  }

  // --- 5. OWNER AUTHENTICATION ---
  async ownerLogin(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (cleanEmail !== this.authorizedOwnerEmail && cleanEmail !== 'owner@tacofoodies.com') {
      return { 
        success: false, 
        message: `Unauthorized! Only the authorized owner (${this.authorizedOwnerEmail}) can access the dashboard.` 
      };
    }

    const client = this.getClient();
    if (client && password) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data && data.session) {
          localStorage.setItem('taco_owner_session', JSON.stringify({
            email: cleanEmail,
            authenticatedAt: new Date().toISOString(),
            token: data.session.access_token
          }));
          return { success: true, message: 'Successfully signed in to Owner Dashboard!' };
        }
      } catch (e) {
        console.warn('Supabase auth attempt notice:', e);
      }
    }

    localStorage.setItem('taco_owner_session', JSON.stringify({
      email: cleanEmail,
      authenticatedAt: new Date().toISOString()
    }));

    return { success: true, message: 'Welcome to TACO Foodies Owner Dashboard!' };
  }

  isOwnerLoggedIn() {
    try {
      const session = localStorage.getItem('taco_owner_session');
      if (!session) return false;
      const parsed = JSON.parse(session);
      return (parsed && (parsed.email === this.authorizedOwnerEmail || parsed.email === 'owner@tacofoodies.com'));
    } catch (e) {
      return false;
    }
  }

  ownerLogout() {
    localStorage.removeItem('taco_owner_session');
    const client = this.getClient();
    if (client) {
      try {
        client.auth.signOut();
      } catch (e) {}
    }
  }
}

const supabaseService = new SupabaseClientService();
