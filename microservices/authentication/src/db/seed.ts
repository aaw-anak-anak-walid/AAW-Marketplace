import { db, pool } from './index'; // Make sure this path is correct to your db connection
import * as bcrypt from 'bcrypt';
import { users } from '@db/schema/users';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting database seeding...');

  const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000000';
  
  try {
    console.log('🚀 Deleting existing users...');
    await db.delete(users).where(eq(users.tenant_id, TENANT_ID));

    // Hash passwords for security
    const saltRounds = 10;
    const password1 = await bcrypt.hash('password123', saltRounds);
    const password2 = await bcrypt.hash('securepass', saltRounds);
    const password3 = await bcrypt.hash('user1234', saltRounds);
    const password4 = await bcrypt.hash('test5678', saltRounds);
    const password5 = await bcrypt.hash('strongpassword', saltRounds);
    
    // Insert 5 users
    const result = await db.insert(users).values([
      {
        id: '12345678-1234-1234-1234-123456789abc',
        tenant_id: TENANT_ID,
        username: 'user1',
        email: 'john.doe@example.com',
        password: password1,
        full_name: 'John Doe',
        address: '123 Main Street, Anytown',
        phone_number: '+1234567890',
      },
      {
        tenant_id: TENANT_ID,
        username: 'jane_smith',
        email: 'jane.smith@example.com',
        password: password2,
        full_name: 'Jane Smith',
        address: '456 Oak Avenue, Somewhere City',
        phone_number: '+0987654321',
      },
      {
        tenant_id: TENANT_ID,
        username: 'alex_wilson',
        email: 'alex.wilson@example.com',
        password: password3,
        full_name: 'Alex Wilson',
        address: '789 Pine Road, Another Place',
        phone_number: '+1122334455',
      },
      {
        tenant_id: TENANT_ID,
        username: 'sarah_brown',
        email: 'sarah.brown@example.com',
        password: password4,
        full_name: 'Sarah Brown',
        address: '101 Cedar Lane, Newtown',
        phone_number: '+5566778899',
      },
      {
        tenant_id: TENANT_ID,
        username: 'michael_lee',
        email: 'michael.lee@example.com',
        password: password5,
        full_name: 'Michael Lee',
        address: '202 Maple Drive, Old City',
        phone_number: '+1231231234',
      }
    ]).onConflictDoNothing();
    
    console.log('✅ User seeding completed successfully!');
    console.log(`Inserted ${result.rowCount} users`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    // Close the pool to end the script
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed with error:', err);
  process.exit(1);
});
