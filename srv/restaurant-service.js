import cds from '@sap/cds';
import { getBtpUsersWithRoles, setBtpUserRole, removeBtpUserRoles } from './btp-security.js';

const LOG = cds.log('restaurant-service');

export default class RestaurantService extends cds.ApplicationService {
  async init() {
    const { Menu, Orders, Users } = this.entities;

    this.before('CREATE', Users, (req) => {
      req.data.ID ??= cds.utils.uuid();
      req.data.role = req.data.role ? req.data.role.toLowerCase().trim() : 'admin';
      if (req.data.email) req.data.email = req.data.email.toLowerCase().trim();
    });

    this.before('DELETE', Users, async (req) => {
      const target = await SELECT.one.from(Users).where(req.data);
      if (target && target.email && target.email.toLowerCase() === 'kirtandesai07@gmail.com') {
        req.reject(403, 'Root Administrator (kirtandesai07@gmail.com) is protected and cannot be removed.');
      }
    });

    this.on('login', async (req) => {
      const email = req.data.email ? req.data.email.toLowerCase().trim() : '';
      const password = req.data.password ? req.data.password.trim() : '';
      const targetRole = req.data.role || 'admin';

      if (!email || !password) {
        return { success: false, role: '', email: '', name: '', message: 'Email and password are required.' };
      }

      // Check DB users first
      let user = null;
      try {
        user = await SELECT.one.from(Users).where({ email });
      } catch (e) {
        LOG.warn('Users table query failed, evaluating seed credentials:', e.message);
      }

      if (user) {
        if (user.password !== password) {
          return { success: false, role: '', email: '', name: '', message: 'Incorrect password.' };
        }
        if (targetRole && user.role !== targetRole && user.role !== 'admin') {
          return { success: false, role: '', email: '', name: '', message: `Account does not have '${targetRole}' permissions.` };
        }
        return {
          success: true,
          role: user.role || targetRole,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          message: 'Login successful.'
        };
      }

      // Built-in Root Administrator Recovery
      if (email === 'kirtandesai07@gmail.com' && password === 'kd123') {
        return {
          success: true,
          role: 'admin',
          email: 'kirtandesai07@gmail.com',
          name: 'Kirtan Desai',
          message: 'Admin login successful.'
        };
      }

      return { success: false, role: '', email: '', name: '', message: 'Invalid credentials or access has been revoked.' };
    });

    this.on('userInfo', (req) => {
      const roles = [];
      if (req.user?.is('Admin')) roles.push('Admin');
      if (req.user?.is('Staff')) roles.push('Staff');
      const email = req.user?.attr?.email || req.user?.id || '';
      const name = req.user?.attr?.logonName || req.user?.attr?.givenName || (email ? email.split('@')[0] : 'User');
      return {
        id: req.user?.id || 'anonymous',
        email,
        name,
        roles,
        scopes: roles.map(r => `restaurant-062d3605trial-dev.${r}`)
      };
    });

    this.on('getBtpUsers', async (req) => {
      try {
        const btpUsers = await getBtpUsersWithRoles();
        let dbUsers = [];
        try {
          dbUsers = await SELECT.from(Users);
        } catch (e) {
          LOG.warn('Could not read Users table:', e.message);
        }

        const dbUserMap = new Map();
        for (const u of dbUsers) {
          if (u.email) dbUserMap.set(u.email.toLowerCase(), u);
        }

        return btpUsers.map(u => {
          const dbU = dbUserMap.get(u.email.toLowerCase());
          return {
            id: u.id,
            email: u.email,
            name: dbU?.name || u.name,
            role: u.role,
            isRoot: u.isRoot
          };
        });
      } catch (err) {
        LOG.error('Failed to get BTP users:', err);
        req.reject(500, `Failed to load BTP users: ${err.message}`);
      }
    });

    this.on('assignBtpRole', async (req) => {
      const email = req.data.email ? req.data.email.toLowerCase().trim() : '';
      const role = req.data.role ? req.data.role.trim() : 'Staff';
      const name = req.data.name ? req.data.name.trim() : '';

      if (!email) {
        req.reject(400, 'User email is required.');
      }

      if (email === 'kirtandesai07@gmail.com' && role.toLowerCase() !== 'admin') {
        req.reject(403, 'Root Administrator (kirtandesai07@gmail.com) is protected and cannot be changed.');
      }

      try {
        await setBtpUserRole(email, role, name);

        // Keep local DB Users table synchronized
        const existing = await SELECT.one.from(Users).where({ email });
        if (existing) {
          await UPDATE(Users).set({
            role: role.toLowerCase(),
            name: name || existing.name || email.split('@')[0]
          }).where({ email });
        } else {
          await INSERT.into(Users).entries({
            ID: cds.utils.uuid(),
            email,
            name: name || email.split('@')[0],
            role: role.toLowerCase(),
            password: 'BTP_SSO_MANAGED'
          });
        }

        return {
          success: true,
          message: `Role Collection in SAP BTP successfully updated to ${role} for ${email}.`,
          email,
          role
        };
      } catch (err) {
        LOG.error('Failed to assign BTP role:', err);
        req.reject(500, err.message);
      }
    });

    this.on('removeBtpUser', async (req) => {
      const email = req.data.email ? req.data.email.toLowerCase().trim() : '';
      if (!email) {
        req.reject(400, 'User email is required.');
      }

      if (email === 'kirtandesai07@gmail.com') {
        req.reject(403, 'Root Administrator (kirtandesai07@gmail.com) is protected and cannot be removed.');
      }

      try {
        await removeBtpUserRoles(email);
        await DELETE.from(Users).where({ email });

        return {
          success: true,
          message: `Access revoked and user removed from SAP BTP Role Collections for ${email}.`,
          email
        };
      } catch (err) {
        LOG.error('Failed to remove BTP user:', err);
        req.reject(500, err.message);
      }
    });

    this.before('CREATE', Menu, (req) => {
      req.data.ID ??= cds.utils.uuid();
    });

    this.before(['CREATE', 'SAVE'], Orders, async (req) => {
      const orders = Array.isArray(req.data) ? req.data : [req.data];

      for (const order of orders) {
        order.ID ??= cds.utils.uuid();
        if (order.items && !order.Items) {
          order.Items = order.items;
          delete order.items;
        }
        let orderItems = order.Items;

        // If items are not in req.data (e.g. draft activation), fetch from draft table
        if ((!orderItems || orderItems.length === 0) && order.ID) {
          const draftItemsEntity = this.entities.OrderItems.drafts || this.entities.OrderItems;
          orderItems = await SELECT.from(draftItemsEntity).where({ parent_ID: order.ID });
        }

        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
          order.totalPrice = 0;
          continue;
        }

        const itemIds = orderItems
          .map((item) => item.menuItem_ID || item.menuItem?.ID || item.menuItem)
          .filter(Boolean);

        const dishes = itemIds.length > 0
          ? await SELECT.from(Menu).where({ ID: { in: itemIds } })
          : [];

        const dishMap = new Map(dishes.map((dish) => [String(dish.ID).toLowerCase(), dish]));

        let calculatedTotal = 0;

        for (const item of orderItems) {
          item.ID ??= cds.utils.uuid();
          item.parent_ID ??= order.ID;
          const rawMenuItemId = item.menuItem_ID || item.menuItem?.ID || item.menuItem;
          const dish = dishMap.get(String(rawMenuItemId).toLowerCase());

          if (!dish) {
            req.reject(404, `Menu item with ID '${rawMenuItemId}' was not found.`);
            return;
          }

          const quantity = item.quantity ?? 1;
          const price = Number(dish.price) || 0;
          calculatedTotal += price * quantity;

          const available = (dish.availableOrders !== null && dish.availableOrders !== undefined && !isNaN(dish.availableOrders))
            ? Number(dish.availableOrders)
            : 999;

          if (quantity > available) {
            const alertMsg = `[KITCHEN ALERT] Ordered quantity (${quantity}) for "${dish.title}" exceeds available stock (${available})!`;
            LOG.warn(alertMsg);
            console.warn(alertMsg);
          }
        }

        const totalWithTax = Math.round(calculatedTotal * 1.10 * 100) / 100;
        // Keep 10% GST in order.totalPrice so bill calculation matches between client and server
        if (order.totalPrice && Math.abs(order.totalPrice - totalWithTax) < 0.05) {
          order.totalPrice = totalWithTax;
        } else if (!order.totalPrice || Math.abs(order.totalPrice - calculatedTotal) < 0.05) {
          order.totalPrice = totalWithTax;
        }
      }
    });

    this.after('READ', Orders, (each) => {
      if (!each) return;
      const records = Array.isArray(each) ? each : [each];
      for (const order of records) {
        switch (order.paymentStatus) {
          case 'Paid':
            order.paymentStatusCriticality = 3; // Positive (Green)
            break;
          case 'Refunded':
            order.paymentStatusCriticality = 2; // Critical (Yellow)
            break;
          case 'Unpaid':
            order.paymentStatusCriticality = 1; // Negative (Red)
            break;
          default:
            order.paymentStatusCriticality = 0; // Neutral
        }
      }
    });

    this.after('CREATE', Orders, async (order, req) => {
      const orderId = order?.ID || req.data?.ID;
      const items = req.data?.Items || req.data?.items;
      if (items && Array.isArray(items) && items.length > 0 && orderId) {
        const rows = items.map((it) => ({
          ID: it.ID || cds.utils.uuid(),
          parent_ID: orderId,
          menuItem_ID: it.menuItem_ID || it.menuItem?.ID || it.menuItem,
          quantity: it.quantity || 1
        }));
        await cds.db.run(UPSERT.into('sap.restaurant.OrderItems').entries(rows));
      }
    });

    this.on('pay', Orders, async (req) => {
      const orderId = req.params[0]?.ID ?? req.params[0] ?? req.data?.ID;
      const paymentMethod = req.data?.paymentMethod || 'Card';

      if (!paymentMethod || !['Cash', 'Card', 'UPI'].includes(paymentMethod)) {
        req.reject(400, "Payment method must be 'Cash', 'Card', or 'UPI'.");
        return;
      }

      await cds.db.run(
        UPDATE('sap.restaurant.Orders')
          .set({
            paymentStatus: 'Paid',
            paymentMethod: paymentMethod,
            status: 'Completed'
          })
          .where({ ID: orderId })
      );

      const updated = await SELECT.one.from(Orders).where({ ID: orderId });
      return updated || { ID: orderId, paymentStatus: 'Paid', paymentMethod, status: 'Completed' };
    });

    this.on('READ', 'TotalSales', async (req) => {
      const allOrders = await cds.db.run(
        SELECT.from('sap.restaurant.Orders')
          .columns('createdAt', 'totalPrice', 'paymentStatus', 'status')
      );

      const dayMap = new Map();

      for (const order of allOrders) {
        let dateStr;
        if (order.createdAt) {
          dateStr = typeof order.createdAt === 'string'
            ? order.createdAt.slice(0, 10)
            : new Date(order.createdAt).toISOString().slice(0, 10);
        } else {
          dateStr = new Date().toISOString().slice(0, 10);
        }

        if (!dayMap.has(dateStr)) {
          dayMap.set(dateStr, {
            date: dateStr,
            totalRevenue: 0,
            currency: 'INR',
            paidBillsCount: 0,
            totalOrdersCount: 0,
            unpaidRevenue: 0
          });
        }

        const stats = dayMap.get(dateStr);
        stats.totalOrdersCount += 1;

        const price = Number(order.totalPrice) || 0;
        if (order.paymentStatus === 'Paid') {
          stats.totalRevenue = Math.round((stats.totalRevenue + price) * 100) / 100;
          stats.paidBillsCount += 1;
        } else {
          stats.unpaidRevenue = Math.round((stats.unpaidRevenue + price) * 100) / 100;
        }
      }

      let results = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));

      const keyDate = req.data?.date || req.params?.[0]?.date || (typeof req.params?.[0] === 'string' ? req.params[0] : null);
      if (keyDate) {
        return results.find((r) => r.date === keyDate) || null;
      }

      if (results.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        results = [
          {
            date: today,
            totalRevenue: 0,
            currency: 'INR',
            paidBillsCount: 0,
            totalOrdersCount: 0,
            unpaidRevenue: 0
          }
        ];
      }

      return results;
    });

    this.on('READ', 'OrderStatuses', () => [
      { code: 'Open', name: 'Open' },
      { code: 'Received', name: 'Received' },
      { code: 'Completed', name: 'Completed' },
      { code: 'Cancelled', name: 'Cancelled' }
    ]);

    this.on('READ', 'PaymentStatuses', () => [
      { code: 'Unpaid', name: 'Unpaid' },
      { code: 'Paid', name: 'Paid' },
      { code: 'Refunded', name: 'Refunded' }
    ]);

    this.on('READ', 'PaymentMethods', () => [
      { code: 'Cash', name: 'Cash' },
      { code: 'Card', name: 'Card' },
      { code: 'UPI', name: 'UPI' },
      { code: 'None', name: 'None' }
    ]);

    return super.init();
  }
}
