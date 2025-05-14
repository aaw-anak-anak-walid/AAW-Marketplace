import { db, pool } from './index';
import { order } from '@db/schema/order';
import { cart } from '@db/schema/cart';
import { orderDetail } from '@db/schema/orderDetail';
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';

// Define the tenant ID that will be used for all records
const TENANT_ID = process.env.TENANT_ID || '47dd6b24-0b23-46b0-a662-776158d089ba';

// Constants for seeding
const TEST_USER_ID = 'b39f1ab6-0489-407e-b0a6-ae90088321a6';
const ORDER_COUNT = 256;
const CART_COUNT = 32;


const PRODUCT_API_BASE_URL = process.env.PRODUCT_API_BASE_URL || 'http://52.91.74.61:32303/api/product';


async function fetchAvailableProducts() {
  const fetchUrl = `${PRODUCT_API_BASE_URL}/?limit=100`;
  console.log(`🔍 Fetching product data from ${fetchUrl}...`);
  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }
    const responseData = await response.json();

    const productsArray = responseData.products || responseData;

    if (!Array.isArray(productsArray) || productsArray.length === 0) {
      console.warn('⚠️ No products fetched or products array is empty. Seeding will use random product IDs.');
      return [];
    }

    const availableProducts = productsArray.map(p => ({
      id: p.id,
      price: p.price !== undefined ? parseInt(p.price, 10) : undefined
    }));

    console.log(`✅ Fetched ${availableProducts.length} products.`);
    return availableProducts;
  } catch (error) {
    console.error('❌ Error fetching product data:', error);
    console.warn('⚠️ Seeding will proceed with random product IDs due to fetch error.');
    return []; 
  }
}

async function seedOrders(availableProducts: string | any[]) {
  console.log(`🌱 Seeding ${ORDER_COUNT} orders for test user...`);
  try {
    await db.delete(orderDetail);
    await db.delete(order).where(eq(order.user_id, TEST_USER_ID));
  } catch (error) {
    console.error('Error clearing existing orders:', error);
  }

  let insertedOrderCount = 0;
  let insertedDetailCount = 0;

  const orderStatuses = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];
  const shippingProviders = ['JNE', 'TIKI', 'SICEPAT', 'GOSEND', 'GRAB_EXPRESS'];
  const shippingStatuses = ['PENDING', 'SHIPPED', 'DELIVERED', 'RETURNED'];

  for (let i = 0; i < ORDER_COUNT; i++) {
    try {
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const details = [];
      let totalAmount = 0;

      for (let j = 0; j < itemCount; j++) {
        let productId;
        let unitPrice;

        if (availableProducts && availableProducts.length > 0) {
          const randomFetchedProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
          productId = randomFetchedProduct.id;
          unitPrice = randomFetchedProduct.price !== undefined ? randomFetchedProduct.price : faker.number.int({ min: 10000, max: 1000000 });
        } else {
          productId = faker.string.uuid();
          unitPrice = faker.number.int({ min: 10000, max: 1000000 });
        }

        const quantity = faker.number.int({ min: 1, max: 10 });
        totalAmount += quantity * unitPrice;

        details.push({
          product_id: productId,
          quantity,
          unit_price: unitPrice
        });
      }

      const orderDate = faker.date.past({ years: 1 });
      const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const shippingProvider = shippingProviders[Math.floor(Math.random() * shippingProviders.length)];

      let shippingCode = null;
      let shippingStatus = null;
      if (orderStatus !== 'PENDING') {
        shippingCode = faker.string.alphanumeric(12).toUpperCase();
        shippingStatus = shippingStatuses[Math.floor(Math.random() * shippingStatuses.length)];
      }

      const newOrder:any = {
        tenant_id: TENANT_ID,
        user_id: TEST_USER_ID,
        order_date: orderDate,
        total_amount: totalAmount,
        order_status: orderStatus,
        shipping_provider: shippingProvider,
        shipping_code: shippingCode,
        shipping_status: shippingStatus,
      };

      const insertedOrder = await db.insert(order).values(newOrder).returning({ id: order.id });

      if (insertedOrder && insertedOrder.length > 0) {
        const orderId = insertedOrder[0].id;
        const orderDetailsToInsert = details.map(detail => ({
          tenant_id: TENANT_ID,
          order_id: orderId,
          product_id: detail.product_id,
          quantity: detail.quantity,
          unit_price: detail.unit_price
        }));

        await db.insert(orderDetail).values(orderDetailsToInsert);
        insertedDetailCount += orderDetailsToInsert.length;
        insertedOrderCount++;
      }

      if ((i + 1) % 10 === 0) {
        console.log(`Generated ${i + 1}/${ORDER_COUNT} orders with ${insertedDetailCount} details so far...`);
      }

    } catch (error) {
      console.error(`Error creating order ${i + 1}:`, error);
    }
  }

  console.log(`✅ Inserted ${insertedOrderCount} orders with ${insertedDetailCount} order details`);
}

async function seedCart(availableProducts: string | any[]) {
  console.log(`🌱 Seeding ${CART_COUNT} cart items for test user...`);

  try {
    await db.delete(cart).where(eq(cart.user_id, TEST_USER_ID));
    console.log('Cleared existing cart items for the test user');
  } catch (error) {
    console.error('Error clearing existing cart items:', error);
  }

  const cartItems = [];

  for (let i = 0; i < CART_COUNT; i++) {
    let randomProductId;
    if (availableProducts && availableProducts.length > 0) {
      const randomFetchedProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
      randomProductId = randomFetchedProduct.id;
    } else {
      randomProductId = faker.string.uuid();
    }

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
    const availableProducts = await fetchAvailableProducts();

    await seedOrders(availableProducts);

    await seedCart(availableProducts);

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed script failed with error:', err);
  process.exit(1);
});