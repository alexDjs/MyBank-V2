import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

const { Pool } = pkg;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'secret';

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

console.log('🔗 Database connection string configured');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ===== Database Initialization =====
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

    console.log('✅ Database tables initialized successfully!');

    // Seed demo data if it doesn't exist
    await seedDemoData(client);
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Continuing in production mode despite DB init error...');
      return false;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function seedDemoData(client) {
  try {
    // Check if demo user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['demo@mybank.com']
    );

    if (existingUser.rows.length === 0) {
      console.log('🌱 Creating demo user and data...');
      
      // Create demo user
      const hashedPassword = await bcrypt.hash('demo123', 12);
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
      `, [userId, `ACC-DEMO-${Date.now()}`, 2649.95]);

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

      console.log('✅ Demo data created: demo@mybank.com / demo123');
    }
  } catch (error) {
    console.error('⚠️  Demo data seeding failed:', error.message);
    // Don't fail the startup if demo data fails
  }
}

// ===== Database Connection Test =====
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ===== Input Validation Helpers =====
const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  // At least 6 characters, contains at least one letter and one number
  return password && password.length >= 6 && /^(?=.*[A-Za-z])(?=.*\d)/.test(password);
};

// ===== Enhanced User Registration =====
app.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, country } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'All fields are required: email, password, firstName, lastName' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long and contain at least one letter and one number' 
      });
    }

    // Check if user already exists
    const userExistsResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExistsResult.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Create user
    const result = await pool.query(
      `INSERT INTO users (id, email, password, first_name, last_name, country, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, email, first_name, last_name, country, created_at`,
      [userId, email.toLowerCase(), hashedPassword, firstName, lastName, country || 'Unknown']
    );

    // Create account for the user
    const accountId = uuidv4();
    await pool.query(
      `INSERT INTO accounts (id, user_id, account_number, balance, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [accountId, userId, `ACC-${Date.now()}`, 0.00]
    );

    const newUser = result.rows[0];
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        country: newUser.country,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// ===== Enhanced User Login =====
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password, first_name, last_name, country FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }, 
      SECRET_KEY, 
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        country: user.country
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// ===== Enhanced Token Verification Middleware =====
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Verify user still exists
    const result = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'User not found' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// ===== Get User Account Information =====
app.get('/account', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.account_number, a.balance, a.created_at,
              u.first_name, u.last_name, u.email, u.country
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = result.rows[0];
    res.json({
      account: {
        id: account.id,
        accountNumber: account.account_number,
        balance: parseFloat(account.balance),
        createdAt: account.created_at
      },
      owner: {
        name: `${account.first_name} ${account.last_name}`,
        email: account.email,
        country: account.country
      },
      bank: 'MyBank V2'
    });

  } catch (error) {
    console.error('Account fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== Enhanced Transactions Management =====
app.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT t.id, t.type, t.amount, t.direction, t.location, t.description, t.created_at
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1`,
      [req.user.userId]
    );

    const transactions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      direction: row.direction,
      location: row.location,
      description: row.description,
      date: row.created_at
    }));

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== Create Transaction =====
app.post('/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, amount, direction, location, description } = req.body;

    // Validation
    if (!type || !amount || !direction) {
      return res.status(400).json({ message: 'Type, amount, and direction are required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    if (!['in', 'out'].includes(direction)) {
      return res.status(400).json({ message: 'Direction must be "in" or "out"' });
    }

    // Get user's account
    const accountResult = await pool.query(
      'SELECT id, balance FROM accounts WHERE user_id = $1',
      [req.user.userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountResult.rows[0];
    const currentBalance = parseFloat(account.balance);
    
    // Check for sufficient funds for outgoing transactions
    if (direction === 'out' && currentBalance < numAmount) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Calculate new balance
    const newBalance = direction === 'in' 
      ? currentBalance + numAmount 
      : currentBalance - numAmount;

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create transaction
      const transactionId = uuidv4();
      const transactionResult = await client.query(
        `INSERT INTO transactions (id, account_id, type, amount, direction, location, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, type, amount, direction, location, description, created_at`,
        [transactionId, account.id, type, numAmount, direction, location || '', description || '']
      );

      // Update account balance
      await client.query(
        'UPDATE accounts SET balance = $1 WHERE id = $2',
        [newBalance, account.id]
      );

      await client.query('COMMIT');

      const transaction = transactionResult.rows[0];
      res.status(201).json({
        id: transaction.id,
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        direction: transaction.direction,
        location: transaction.location,
        description: transaction.description,
        date: transaction.created_at,
        newBalance: newBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== Health Check =====
app.get('/', (req, res) => {
  res.json({ 
    message: 'MyBank V2 Server is running!', 
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ===== Start Server =====
const server = app.listen(PORT, async () => {
  console.log(`🚀 MyBank V2 Server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database after server starts
  const dbConnected = await testDatabaseConnection();
  if (dbConnected) {
    await initializeDatabase();
    console.log('🎉 MyBank V2 fully initialized and ready!');
  } else {
    console.log('⚠️  Server started but database initialization failed');
  }
});

// ===== Graceful Shutdown =====
const gracefulShutdown = (signal) => {
  console.log(`\n📋 Received ${signal}. Graceful shutdown starting...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    pool.end(() => {
      console.log('✅ Database pool closed');
      console.log('✅ Server shutdown completed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;