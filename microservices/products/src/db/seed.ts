import { db, pool } from './index';
import { products } from '@db/schema/products';
import { categories } from '@db/schema/categories';
import { faker } from '@faker-js/faker';

// Define the tenant ID that will be used for all records
const TENANT_ID = process.env.TENANT_ID || '47dd6b24-0b23-46b0-a662-776158d089ba';;

// Number of products to generate
const PRODUCT_COUNT = 8192;
// Batch size for inserting products
const BATCH_SIZE = 500;

async function seedCategories() {
  console.log('🌱 Seeding categories...');
  
  const categoryData = [
    { name: 'Electronics', tenant_id: TENANT_ID },
    { name: 'Clothing', tenant_id: TENANT_ID },
    { name: 'Books', tenant_id: TENANT_ID },
    { name: 'Home & Kitchen', tenant_id: TENANT_ID },
    { name: 'Sports & Outdoors', tenant_id: TENANT_ID },
    { name: 'Toys & Games', tenant_id: TENANT_ID },
    { name: 'Beauty & Personal Care', tenant_id: TENANT_ID },
    { name: 'Health & Household', tenant_id: TENANT_ID },
    { name: 'Automotive', tenant_id: TENANT_ID },
    { name: 'Pet Supplies', tenant_id: TENANT_ID },
  ];

  const result = await db.insert(categories).values(categoryData).onConflictDoNothing();
  console.log(`✅ Inserted ${result.rowCount} categories`);

  // Get the inserted categories to use their IDs for products
  const allCategories = await db.select().from(categories);
  return allCategories;
}

async function seedProducts(categoryList: string | any[]) {
  console.log(`🌱 Seeding ${PRODUCT_COUNT} products in batches of ${BATCH_SIZE}...`);
  
  let insertedCount = 0;
  let currentBatch = [];
  
  // Generate and insert products in batches
  for (let i = 0; i < PRODUCT_COUNT; i++) {
    // Get a random category from our list
    const randomCategory = categoryList[Math.floor(Math.random() * categoryList.length)];
    
    // Generate a product
    const product = {
      tenant_id: TENANT_ID,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseInt(faker.commerce.price({ min: 5, max: 5000 })),
      quantity_available: faker.number.int({ min: 0, max: 1000 }),
      category_id: randomCategory.id,
    };
    
    currentBatch.push(product);
    
    // If we've filled a batch, insert it
    if (currentBatch.length >= BATCH_SIZE || i === PRODUCT_COUNT - 1) {
      try {
        const result = await db.insert(products).values(currentBatch).onConflictDoNothing();
        insertedCount += result.rowCount || currentBatch.length;
        console.log(`Batch inserted: ${currentBatch.length} products`);
        currentBatch = [];
      } catch (error) {
        console.error('Error inserting batch:', error);
      }
    }
    
    // Show progress every 1000 products
    if ((i + 1) % 1000 === 0) {
      console.log(`Generated ${i + 1} products so far...`);
    }
  }
  
  console.log(`✅ Inserted approximately ${insertedCount} products`);
}

export async function seed() {
  console.log('🚀 Starting database seeding process...');
  
  try {
    await db.delete(categories);
    await db.delete(products);
    const categoryList = await seedCategories();
    await seedProducts(categoryList);
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error; // Rethrow to signal failure to the caller
  } finally {
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed with error:', err);
  process.exit(1);
});
