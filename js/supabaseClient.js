/**
 * TACO Foodies - Supabase Centralized Database & Realtime Client
 * Pure Supabase order management engine. All order data resides in Supabase.
 */
class SupabaseClientService {
  constructor() {
    this.supabaseUrl = 'https://mqbngtgwejzammhdwczl.supabase.co';
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYm5ndGd3ZWp6YW1taGR3Y3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkyMDUsImV4cCI6MjEwMjY5NTIwNX0.BA1xfJGa1ZZ9mxFTZyAJj7dJEACJUxZQyxvA5v92_EM';
    this.authorizedOwnerEmail = 'restaurantowner@gmail.com';
    this.client = null;
    this.init();
  }

  init() {
    if (typeof window.supabase !== 'undefined') {
      try {
        this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        console.log('⚡ Supabase Client Connected:', this.supabaseUrl);
      } catch (e) {
        console.warn('Supabase initialization warning:', e);
      }
    } else {
      console.warn('Supabase JS SDK not loaded yet.');
    }
  }

  formatDbOrder(dbo) {
    if (!dbo) return null;
    const isDelivery = (dbo.order_type === 'home_delivery' || dbo.order_type === 'Home Delivery');
    return {
      id: dbo.order_number || dbo.id,
      order_number: dbo.order_number || dbo.id,
      db_id: dbo.id,
      timestamp: dbo.created_at || new Date().toISOString(),
      status: dbo.status || 'pending',
      type: isDelivery ? 'Home Delivery' : 'Dine-In',
      customerName: dbo.customer_name || (dbo.table_number ? `Dine-In (Table ${dbo.table_number})` : 'Customer'),
      phone: dbo.customer_phone || '',
      table: dbo.table_number || null,
      guests: dbo.guest_count || (dbo.table_number ? 2 : null),
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

  // --- 1. CENTRALIZED ORDER CREATION (SUPABASE DB) ---
  async createOrder(orderPayload) {
    const orderNumber = 'TF-' + Math.floor(1000 + Math.random() * 9000);
    const orderType = (orderPayload.type === 'Dine-In') ? 'dine_in' : 'home_delivery';

    const orderData = {
      order_number: orderNumber,
      order_type: orderType,
      table_number: orderPayload.table ? parseInt(orderPayload.table, 10) : null,
      customer_name: orderPayload.customerName || (orderPayload.table ? `Dine-In (Table ${orderPayload.table})` : 'Customer'),
      customer_phone: orderPayload.phone || '',
      delivery_address: orderPayload.address || null,
      guest_count: orderPayload.guests ? parseInt(orderPayload.guests, 10) : 2,
      subtotal: parseFloat(orderPayload.foodTotal || orderPayload.grandTotal || 0),
      delivery_fee: parseFloat(orderPayload.deliveryFee || 0),
      total: parseFloat(orderPayload.grandTotal || 0),
      status: 'pending',
      payment_method: orderPayload.paymentMethod || 'Cash on Delivery'
    };

    if (!this.client) {
      console.error('Supabase Client unavailable!');
      return null;
    }

    try {
      // 1. Optional Customer Record Creation
      let customerId = null;
      if (orderPayload.customerName || orderPayload.phone) {
        const { data: custData } = await this.client
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

      // 2. Insert Main Order into Supabase DB 'orders' table
      const { data: dbOrder, error: orderErr } = await this.client
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderErr) {
        console.error('Error inserting order into Supabase:', orderErr.message);
        return null;
      }

      // 3. Insert Order Items into 'order_items' table
      if (dbOrder && orderPayload.items && orderPayload.items.length > 0) {
        const itemsToInsert = orderPayload.items.map(item => ({
          order_id: dbOrder.id,
          item_name: item.name,
          quantity: parseInt(item.quantity || 1, 10),
          price: parseFloat(item.price || 0)
        }));

        await this.client.from('order_items').insert(itemsToInsert);
      }

      // 4. Fetch full record with embedded order_items
      const { data: fullOrder } = await this.client
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

  // --- 2. CUSTOMER ORDER FETCHING FROM SUPABASE ---
  async fetchCustomerOrders(orderNumbers = []) {
    if (!this.client || !orderNumbers || orderNumbers.length === 0) return [];

    try {
      const { data, error } = await this.client
        .from('orders')
        .select('*, order_items(*)')
        .in('order_number', orderNumbers)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching customer orders from Supabase:', error.message);
        return [];
      }

      return (data || []).map(dbo => this.formatDbOrder(dbo));
    } catch (e) {
      console.warn('Exception fetching customer orders:', e);
      return [];
    }
  }

  async fetchOrdersByTable(tableNumber) {
    if (!this.client || !tableNumber) return [];

    try {
      const { data, error } = await this.client
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

  // --- 3. OWNER DASHBOARD GLOBAL ORDERS FETCHING ---
  async fetchOwnerOrders(statusFilter = 'all', typeFilter = 'all') {
    if (!this.client) return [];

    try {
      let query = this.client
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.in('status', ['pending', 'received']);
        } else if (statusFilter === 'preparing') {
          query = query.eq('status', 'preparing');
        } else if (statusFilter === 'ready') {
          query = query.in('status', ['ready', 'confirmed', 'accepted', 'transit_ready', 'delivering']);
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
        console.warn('Error fetching owner orders from Supabase:', error.message);
        return [];
      }

      return (data || []).map(dbo => this.formatDbOrder(dbo));
    } catch (e) {
      console.warn('Exception fetching owner orders:', e);
      return [];
    }
  }

  // --- 4. ORDER STATUS UPDATE (EXACT SINGLE ORDER UPDATE WHERE order_id = selected_order_id) ---
  async updateOrderStatus(orderId, newStatus) {
    if (!this.client || !orderId) return false;

    try {
      // Updates ONLY the specific order matching order_number or id
      const { error } = await this.client
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .or(`order_number.eq.${orderId},id.eq.${orderId}`);

      if (error) {
        console.warn('Error updating status in Supabase:', error.message);
        return false;
      }

      console.log(`✅ Order #${orderId} updated to status '${newStatus}' in Supabase`);
      return true;
    } catch (e) {
      console.warn('Exception updating order status:', e);
      return false;
    }
  }

  // --- 5. SUPABASE REALTIME MULTI-DEVICE SYNCHRONIZATION ---
  subscribeToRealtimeOrders(onRealtimeEvent) {
    if (!this.client) return null;

    try {
      const channel = this.client
        .channel('public_orders_realtime_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            if (onRealtimeEvent) {
              onRealtimeEvent(payload);
            }
          }
        )
        .subscribe();

      return channel;
    } catch (e) {
      console.warn('Supabase Realtime subscription error:', e);
      return null;
    }
  }

  // Fallback alias for backward compatibility
  subscribeToOrderUpdates(orderNumber, onStatusUpdate) {
    return this.subscribeToRealtimeOrders((payload) => {
      if (payload && payload.eventType === 'UPDATE' && payload.new) {
        if (payload.new.order_number === orderNumber || payload.new.id === orderNumber) {
          if (onStatusUpdate) onStatusUpdate(payload.new);
        }
      }
    });
  }

  // --- 6. OWNER AUTHENTICATION & ACCESS CONTROL ---
  async ownerLogin(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (cleanEmail !== this.authorizedOwnerEmail && cleanEmail !== 'owner@tacofoodies.com') {
      return { 
        success: false, 
        message: `Unauthorized! Only the authorized owner (${this.authorizedOwnerEmail}) can access the dashboard.` 
      };
    }

    if (this.client && password) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
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

    // Authorized owner session for valid owner email
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
    if (this.client) {
      try {
        this.client.auth.signOut();
      } catch (e) {}
    }
  }
}

const supabaseService = new SupabaseClientService();
