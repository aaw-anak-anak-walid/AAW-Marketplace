import { db, pool } from './index';
import { order } from '@db/schema/order';
import { cart } from '@db/schema/cart';
import { orderDetail } from '@db/schema/orderDetail';
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';

// Define the tenant ID that will be used for all records
const TENANT_ID = process.env.TENANT_ID || '47dd6b24-0b23-46b0-a662-776158d089ba';

// Constants for seeding
const TEST_USER_ID = process.env.TEST_USER_ID || '12345678-1234-1234-1234-123456789abc';
const ORDER_COUNT = 256;
const CART_COUNT = 32;

async function seedOrders() {
  console.log(`🌱 Seeding ${ORDER_COUNT} orders for test user...`);
  try {
    await db.delete(orderDetail);
    await db.delete(order).where(eq(order.user_id, TEST_USER_ID));
  } catch (error) {
    console.error('Error clearing existing orders:', error);
  }

  let insertedOrderCount = 0;
  let insertedDetailCount = 0;
  
  const orderStatuses = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'] as const;
  const shippingProviders = ['JNE', 'TIKI', 'SICEPAT', 'GOSEND', 'GRAB_EXPRESS'] as const;
  const shippingStatuses = ['PENDING', 'SHIPPED', 'DELIVERED', 'RETURNED'] as const;
  
  // Generate and insert orders one by one to create order details
  for (let i = 0; i < ORDER_COUNT; i++) {
    try {
      // Generate order details first (but don't insert yet)
      const itemCount = faker.number.int({ min: 1, max: 5 }); // Each order has 1-5 items
      const details = [];
      let totalAmount = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const productId = faker.string.uuid(); // In a real scenario, use actual product IDs
        const quantity = faker.number.int({ min: 1, max: 10 });
        const unitPrice = faker.number.int({ min: 10000, max: 1000000 });
        
        // Add to the total order amount
        totalAmount += quantity * unitPrice;
        
        details.push({
          product_id: productId,
          quantity,
          unit_price: unitPrice
        });
      }
      
      // Generate an order
      const orderDate = faker.date.past({ years: 1 });
      const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const shippingProvider = shippingProviders[Math.floor(Math.random() * shippingProviders.length)];
      
      let shippingCode = null;
      let shippingStatus = null;
      if (orderStatus !== 'PENDING') {
        shippingCode = faker.string.alphanumeric(12).toUpperCase();
        shippingStatus = shippingStatuses[Math.floor(Math.random() * shippingStatuses.length)];
      }
      
      const newOrder = {
        tenant_id: TENANT_ID,
        user_id: TEST_USER_ID,
        order_date: orderDate,
        total_amount: totalAmount,
        order_status: orderStatus,
        shipping_provider: shippingProvider,
        shipping_code: shippingCode,
        shipping_status: shippingStatus,
      };
      
      // Insert the order and get back the ID
      const insertedOrder = await db.insert(order).values(newOrder).returning({ id: order.id });
      
      if (insertedOrder && insertedOrder.length > 0) {
        const orderId = insertedOrder[0].id;
        
        // Now insert the order details with the order ID
        const orderDetailsToInsert = details.map(detail => ({
          tenant_id: TENANT_ID,
          order_id: orderId,
          product_id: detail.product_id,
          quantity: detail.quantity,
          unit_price: detail.unit_price
        }));
        
        // Insert order details without capturing an unused result
        await db.insert(orderDetail).values(orderDetailsToInsert);
        insertedDetailCount += orderDetailsToInsert.length;
        insertedOrderCount++;
      }
      
      // Show progress
      if ((i + 1) % 10 === 0) {
        console.log(`Generated ${i + 1}/${ORDER_COUNT} orders with ${insertedDetailCount} details so far...`);
      }
      
    } catch (error) {
      console.error(`Error creating order ${i}:`, error);
    }
  }
  
  console.log(`✅ Inserted ${insertedOrderCount} orders with ${insertedDetailCount} order details`);
}

async function seedCart() {
  console.log(`🌱 Seeding ${CART_COUNT} cart items for test user...`);
  
  // First, let's clean up any existing cart items for this user to avoid duplicates
  try {
    await db.delete(cart).where(eq(cart.user_id, TEST_USER_ID));
    console.log('Cleared existing cart items for the test user');
  } catch (error) {
    console.error('Error clearing existing cart items:', error);
  }
  
  // Generate cart items
  const cartItems = [];
  
  for (let i = 0; i < CART_COUNT; i++) {
    // In a real scenario, you'd use actual product IDs from your products database
    const randomProductId = faker.string.uuid();
    
    cartItems.push({
      tenant_id: TENANT_ID,
      user_id: TEST_USER_ID,
      product_id: randomProductId,
      quantity: faker.number.int({ min: 1, max: 10 }),
    });
  }
  
  try {
    const result = await db.insert(cart).values(cartItems).onConflictDoNothing();
    console.log(`✅ Inserted ${result.rowCount || cartItems.length} cart items`);
  } catch (error) {
    console.error('Error inserting cart items:', error);
  }
}

async function seed() {
  console.log('🚀 Starting database seeding process...');
  
  try {
    // Seed orders with order details
    await seedOrders();
    
    // Seed cart items
    await seedCart();
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    // Close the pool to end the script
    await pool.end();
  }
}

// Run the seed function
seed().catch(err => {
  console.error('Seed script failed with error:', err);
  process.exit(1);
});
