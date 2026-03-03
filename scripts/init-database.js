import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// ===== Database Configuration =====
let connectionString;
if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
} else {
  const dbUser = process.env.DB_USER || 'mybank_user';
  const dbPassword = process.env.DB_PASSWORD || 'mybank_password';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'mybank_db';
  connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
}

console.log('🔄 Initializing database connection...');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔄 Initializing database...');

    // Create extensions if needed
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        country VARCHAR(100) DEFAULT 'Unknown',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0.00,
        currency VARCHAR(3) DEFAULT 'USD',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        direction VARCHAR(3) NOT NULL CHECK (direction IN ('in', 'out')),
        location VARCHAR(255) DEFAULT '',
        description TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)');

    // Create trigger for updating account updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_account_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
      CREATE TRIGGER update_accounts_updated_at
        BEFORE UPDATE ON accounts
        FOR EACH ROW
        EXECUTE FUNCTION update_account_timestamp();
    `);

    console.log('✅ Database initialized successfully!');
    console.log('📊 Created tables: users, accounts, transactions');
    console.log('📈 Created indexes for better performance');
    console.log('⚡ Created triggers for automatic timestamps');

    // Display table information
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('\n🌱 Seeding database with sample data...');

    // Check if demo user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['demo@mybank.com']
    );

    if (existingUser.rows.length === 0) {
      // Import bcrypt for password hashing
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash('demo123', 12);

      // Create demo user
      const userResult = await client.query(`
        INSERT INTO users (email, password, first_name, last_name, country) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id
      `, ['demo@mybank.com', hashedPassword, 'Demo', 'User', 'Poland']);

      const userId = userResult.rows[0].id;

      // Create demo account
      const accountResult = await client.query(`
        INSERT INTO accounts (user_id, account_number, balance) 
        VALUES ($1, $2, $3) 
        RETURNING id
      `, [userId, `ACC-DEMO-${Date.now()}`, 1000.00]);

      const accountId = accountResult.rows[0].id;

      // Create sample transactions
      const transactions = [
        { type: 'Salary', amount: 5000.00, direction: 'in', location: 'Company Inc.', description: 'Monthly salary payment' },
        { type: 'Grocery', amount: 150.75, direction: 'out', location: 'Supermarket XYZ', description: 'Weekly grocery shopping' },
        { type: 'Transfer', amount: 2000.00, direction: 'in', location: 'Bank Transfer', description: 'Transfer from savings account' },
        { type: 'Rent', amount: 1200.00, direction: 'out', location: 'Property Management', description: 'Monthly rent payment' },
        { type: 'Utilities', amount: 85.30, direction: 'out', location: 'Electric Company', description: 'Monthly electricity bill' }
      ];

      for (const transaction of transactions) {
        await client.query(`
          INSERT INTO transactions (account_id, type, amount, direction, location, description)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [accountId, transaction.type, transaction.amount, transaction.direction, transaction.location, transaction.description]);
      }

      // Update account balance based on transactions
      const balanceResult = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) as calculated_balance
        FROM transactions 
        WHERE account_id = $1
      `, [accountId]);

      const calculatedBalance = parseFloat(balanceResult.rows[0].calculated_balance);
      
      await client.query(
        'UPDATE accounts SET balance = $1 WHERE id = $2',
        [calculatedBalance, accountId]
      );

      console.log('✅ Demo data created successfully!');
      console.log('👤 Demo user: demo@mybank.com / demo123');
      console.log(`💰 Account balance: $${calculatedBalance.toFixed(2)}`);
      console.log(`📊 Transactions created: ${transactions.length}`);
    } else {
      console.log('ℹ️  Demo data already exists, skipping...');
    }

  } catch (error) {
    console.error('❌ Database seeding error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    console.log('🔄 Starting database initialization...');
    await initializeDatabase();
    await seedDatabase();
    console.log('\n🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  In production mode, continuing without database initialization...');
      process.exit(0); // Don't fail the deployment
    } else {
      process.exit(1);
    }
  }
}

main();