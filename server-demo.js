import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'secret';

// ===== In-Memory Database for Demo =====
const db = {
  users: [
    {
      id: uuidv4(),
      email: 'demo@mybank.com',
      password: '$2b$12$rQZ1vJ8Yt8Yt8Yt8Yt8Yt8O', // demo123
      first_name: 'Demo',
      last_name: 'User',
      country: 'Poland',
      created_at: new Date().toISOString(),
      last_login: null,
      is_active: true
    }
  ],
  accounts: [],
  transactions: []
};

// Initialize demo account
const demoUser = db.users[0];
const demoAccount = {
  id: uuidv4(),
  user_id: demoUser.id,
  account_number: `ACC-DEMO-${Date.now()}`,
  balance: 1000.00,
  currency: 'USD',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
db.accounts.push(demoAccount);

// Demo transactions
const demoTransactions = [
  {
    id: uuidv4(),
    account_id: demoAccount.id,
    type: 'Salary',
    amount: 5000.00,
    direction: 'in',
    location: 'Company Inc.',
    description: 'Monthly salary - February 2026, Tax ID: 1234567890',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
  },
  {
    id: uuidv4(),
    account_id: demoAccount.id,
    type: 'Biedronka',
    amount: 150.75,
    direction: 'out',
    location: 'Biedronka Market Plaza',
    description: 'Weekly groceries - Receipt #BDK789012, Card ending 4567',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
  },
  {
    id: uuidv4(),
    account_id: demoAccount.id,
    type: 'Orlen',
    amount: 245.30,
    direction: 'out',
    location: 'Orlen Station ul. Krakowska',
    description: '45L Pb95 fuel - Pump #3, Receipt 890123456789',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
  },
  {
    id: uuidv4(),
    account_id: demoAccount.id,
    type: 'Orange',
    amount: 89.99,
    direction: 'out',
    location: 'Orange Polska',
    description: 'Mobile plan - March 2026, Phone: +48 xxx xxx 789',
    created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    id: uuidv4(),
    account_id: demoAccount.id,
    type: 'Transfer',
    amount: 500.00,
    direction: 'in',
    location: 'Online Transfer',
    description: 'From savings account - Transfer ID: TR20260303001',
    created_at: new Date(Date.now() - 86400000 * 0.5).toISOString() // 12 hours ago
  }
];
db.transactions = demoTransactions;

console.log('🎯 Demo mode initialized');
console.log('👤 Demo user:', demoUser.email);
console.log('🏦 Demo account:', demoAccount.account_number);
console.log('📊 Demo transactions:', demoTransactions.length);

// ===== Helper Functions =====
const findUserByEmail = (email) => {
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

const findUserById = (id) => {
  return db.users.find(u => u.id === id);
};

const findAccountByUserId = (userId) => {
  return db.accounts.find(a => a.user_id === userId);
};

const findTransactionsByAccountId = (accountId) => {
  return db.transactions.filter(t => t.account_id === accountId);
};

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ===== Input Validation Helpers =====
const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
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
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Create user
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      country: country || 'Unknown',
      created_at: new Date().toISOString(),
      last_login: null,
      is_active: true
    };
    db.users.push(newUser);

    // Create account for the user
    const accountId = uuidv4();
    const newAccount = {
      id: accountId,
      user_id: userId,
      account_number: `ACC-${Date.now()}`,
      balance: 0.00,
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.accounts.push(newAccount);

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
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password (for demo user, allow both hashed and plain password)
    let isValidPassword = false;
    if (user.email === 'demo@mybank.com' && password === 'demo123') {
      isValidPassword = true;
    } else {
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.last_login = new Date().toISOString();

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
    const user = findUserById(decoded.userId);
    if (!user) {
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
    const user = findUserById(req.user.userId);
    const account = findAccountByUserId(req.user.userId);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({
      account: {
        id: account.id,
        accountNumber: account.account_number,
        balance: parseFloat(account.balance),
        createdAt: account.created_at
      },
      owner: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        country: user.country
      },
      bank: 'MyBank V2 (Demo Mode)'
    });

  } catch (error) {
    console.error('Account fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== Enhanced Transactions Management =====
app.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const account = findAccountByUserId(req.user.userId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const transactions = findTransactionsByAccountId(account.id);
    
    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      direction: t.direction,
      location: t.location,
      description: t.description,
      date: t.created_at
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: 1,
        limit: 50,
        total: formattedTransactions.length
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
    const account = findAccountByUserId(req.user.userId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance);
    
    // Check for sufficient funds for outgoing transactions
    if (direction === 'out' && currentBalance < numAmount) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Calculate new balance
    const newBalance = direction === 'in' 
      ? currentBalance + numAmount 
      : currentBalance - numAmount;

    // Create transaction
    const transaction = {
      id: uuidv4(),
      account_id: account.id,
      type: type,
      amount: numAmount,
      direction: direction,
      location: location || '',
      description: description || '',
      created_at: new Date().toISOString()
    };

    db.transactions.push(transaction);

    // Update account balance
    account.balance = newBalance;
    account.updated_at = new Date().toISOString();

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
    console.error('Transaction creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== Health Check =====
app.get('/', (req, res) => {
  res.json({ 
    message: 'MyBank V2 Demo Server is running!', 
    version: '2.0.0-demo',
    timestamp: new Date().toISOString(),
    mode: 'Demo (In-Memory Database)',
    demoCredentials: {
      email: 'demo@mybank.com',
      password: 'demo123'
    }
  });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 MyBank V2 Demo Server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`👤 Demo login: demo@mybank.com / demo123`);
  console.log('📝 Note: This is a demo version using in-memory storage');
});

export default app;