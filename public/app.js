// ===== Application State =====
let currentUser = null;
let authToken = null;
let transactions = [];

// ===== API Configuration =====
const API_BASE = window.location.origin;

// ===== DOM Elements =====
const authOverlay = document.getElementById('auth-overlay');
const loginBox = document.getElementById('login-box');
const registerBox = document.getElementById('register-box');
const appContainer = document.getElementById('app-container');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const transactionForm = document.getElementById('transaction-form');

const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');

const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const transactionError = document.getElementById('transaction-error');

const userWelcome = document.getElementById('user-welcome');
const accountTitle = document.getElementById('account-title');
const accountNumber = document.getElementById('account-number');
const balanceAmount = document.getElementById('balance-amount');
const accountHolder = document.getElementById('account-holder');
const accountCountry = document.getElementById('account-country');

const transactionsBody = document.getElementById('transactions-body');
const transactionsEmpty = document.getElementById('transactions-empty');
const transactionsLoading = document.getElementById('transactions-loading');
const refreshTransactionsBtn = document.getElementById('refresh-transactions');

// ===== Utility Functions =====
const showError = (element, message) => {
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 5000);
};

const hideError = (element) => {
  element.classList.remove('show');
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

// ===== Transaction Type Display Mapping =====
const getTypeDisplay = (type) => {
  const typeDisplayMap = {
    // Income
    'Salary': '💰 Salary',
    'Freelance': '💻 Freelance',
    'Bonus': '🎁 Bonus',
    'Transfer': '💸 Transfer', 
    'Refund': '↩️ Refund',
    'Investment': '📈 Investment',
    
    // Shopping & Food
    'Biedronka': '🐞 Biedronka',
    'Żabka': '🐸 Żabka',
    'Tesco': '🛒 Tesco',
    'Lidl': '🛒 Lidl', 
    'Grocery': '🛒 Grocery',
    'Restaurant': '🍽️ Restaurant',
    'McDonald\'s': '🍔 McDonald\'s',
    'KFC': '🍗 KFC',
    'Starbucks': '☕ Starbucks',
    
    // Transport & Fuel
    'Orlen': '⛽ Orlen',
    'Shell': '🐚 Shell',
    'MPK Wrocław': '🚌 MPK Wrocław',
    'Uber': '🚗 Uber',
    'Parking': '🅿️ Parking',
    
    // Home & Utilities  
    'Rent': '🏠 Rent',
    'Electricity': '⚡ Electricity',
    'Water': '💧 Water',
    'Heating': '🔥 Heating',
    'Internet': '🌐 Internet',
    'Utilities': '⚡ Utilities',
    
    // Telecom
    'Orange': '📶 Orange',
    'Play': '📱 Play', 
    'T-Mobile': '📞 T-Mobile',
    'Plus': '📡 Plus',
    
    // Health & Beauty
    'Apteka DOZ': '💊 Apteka DOZ',
    'Fryzjer': '💇 Fryzjer',
    'Salon Urody': '💅 Salon Urody',
    'Fitness': '💪 Fitness',
    
    // Entertainment
    'Cinema': '🎬 Cinema',
    'Entertainment': '🎮 Entertainment',
    
    // Financial
    'PKO BP': '🏦 PKO BP',
    'mBank': '💳 mBank',
    'ING': '🏦 ING Bank',
    
    // Other
    'Other': '📋 Other'
  };
  
  return typeDisplayMap[type] || `📋 ${type}`;
};

// ===== Wrocław Business Logos & Categories =====
const getBusinessLogo = (type, location) => {
  const locationLower = (location || '').toLowerCase();
  const typeLower = (type || '').toLowerCase();
  
  // Wrocław specific businesses
  const businessLogos = {
    // Supermarkets & Stores
    'biedronka': '🐞', 'żabka': '🐸', 'tesco': '🛒', 'carrefour': '🛍️',
    'lidl': '🛒', 'kaufland': '🏪', 'auchan': '🛍️', 'real': '🏬',
    'media markt': '📱', 'rtv euro agd': '💻', 'decathlon': '⚽',
    'ikea': '🏠', 'leroy merlin': '🔨', 'castorama': '🔧',
    
    // Gas Stations
    'orlen': '⛽', 'shell': '🐚', 'bp': '⛽', 'circle k': '⛽',
    'lotos': '⛽', 'statoil': '⛽', 'total': '⛽',
    
    // Internet & Telecom
    'orange': '📶', 'play': '📱', 't-mobile': '📞', 'plus': '📡',
    'upc': '📺', 'netia': '🌐', 'vectra': '📡',
    
    // Restaurants & Food
    'mcdonald': '🍔', 'kfc': '🍗', 'pizza hut': '🍕', 'burger king': '🍔',
    'subway': '🥪', 'kebab': '🥙', 'bar mleczny': '🥛',
    'starbucks': '☕', 'costa coffee': '☕',
    
    // Hotels & Accommodation
    'ibis': '🏨', 'novotel': '🏨', 'mercure': '🏨', 'best western': '🏨',
    'hilton': '🏨', 'radisson': '🏨', 'hotel': '🏨',
    
    // Beauty & Health
    'fryzjer': '💇', 'salon urody': '💅', 'barber': '✂️',
    'apteka': '💊', 'doz': '🏥', 'gemini': '💊',
    
    // Banks & Finance
    'pko bp': '🏦', 'mbank': '💳', 'ing': '🏦', 'santander': '💰',
    'millennium': '🏦', 'bzwbk': '💳', 'getin': '🏦',
    
    // Transport
    'mpk': '🚌', 'uber': '🚗', 'bolt': '🚕', 'taxi': '🚖',
    'pkp': '🚄', 'intercity': '🚆',
    
    // Entertainment & Culture
    'cinema': '🎬', 'kino': '🍿', 'teatr': '🎭', 'opera': '🎼',
    'fitness': '💪', 'siłownia': '🏋️',
  };
  
  // Check location first for specific business match
  for (const [business, logo] of Object.entries(businessLogos)) {
    if (locationLower.includes(business)) {
      return logo;
    }
  }
  
  // Fallback to category-based logos
  const categoryLogos = {
    'salary': '💰', 'pension': '👴', 'bonus': '🎁', 'freelance': '💻',
    'transfer': '💸', 'refund': '↩️', 'dividend': '📈',
    
    'grocery': '🛒', 'shopping': '🛍️', 'market': '🏪',
    'restaurant': '🍽️', 'food': '🍕', 'cafe': '☕', 'bar': '🍺',
    'fuel': '⛽', 'gas': '⛽', 'petrol': '⛽',
    'rent': '🏠', 'mortgage': '🏘️', 'insurance': '🛡️',
    'utilities': '⚡', 'electricity': '💡', 'water': '💧', 'heating': '🔥',
    'internet': '🌐', 'phone': '📱', 'mobile': '📞',
    'transport': '🚌', 'bus': '🚌', 'train': '🚆', 'parking': '🅿️',
    'healthcare': '🏥', 'pharmacy': '💊', 'doctor': '👨‍⚕️',
    'education': '🎓', 'books': '📚', 'course': '📖',
    'entertainment': '🎬', 'movie': '🍿', 'music': '🎵', 'game': '🎮',
    'fitness': '💪', 'gym': '🏋️', 'sport': '⚽',
    'beauty': '💅', 'haircut': '✂️', 'cosmetics': '💄',
    'clothing': '👕', 'shoes': '👟', 'fashion': '👗',
    'electronics': '📱', 'computer': '💻', 'gadget': '📟',
    'investment': '📊', 'savings': '🐷', 'loan': '💳',
    'other': '📋'
  };
  
  // Check type for category match
  for (const [category, logo] of Object.entries(categoryLogos)) {
    if (typeLower.includes(category)) {
      return logo;
    }
  }
  
  // Default based on transaction direction
  return '📋';
};

const apiRequest = async (endpoint, options = {}) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// ===== Password Strength Validator =====
const checkPasswordStrength = (password) => {
  const strengthIndicator = document.getElementById('password-strength');
  if (!strengthIndicator) return;

  if (!password) {
    strengthIndicator.textContent = '';
    strengthIndicator.className = 'password-strength';
    return;
  }

  let score = 0;
  let feedback = [];

  // Length check
  if (password.length >= 6) score++;
  else feedback.push('at least 6 characters');

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  else feedback.push('lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('uppercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('numbers');

  if (/[!@#$%^&*(),.?\":{}|<>]/.test(password)) score++;

  let strength, className;
  if (score < 2) {
    strength = 'Weak';
    className = 'weak';
  } else if (score < 4) {
    strength = 'Medium';
    className = 'medium';
  } else {
    strength = 'Strong';
    className = 'strong';
  }

  const message = feedback.length > 0 
    ? `${strength} - Add: ${feedback.join(', ')}`
    : `${strength} password!`;

  strengthIndicator.textContent = message;
  strengthIndicator.className = `password-strength ${className}`;
};

// ===== Authentication Functions =====
const register = async (userData) => {
  try {
    const data = await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    return data;
  } catch (error) {
    throw error;
  }
};

const login = async (credentials) => {
  try {
    const data = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    authToken = data.token;
    currentUser = data.user;
    
    // Store in localStorage for persistence
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    return data;
  } catch (error) {
    throw error;
  }
};

const logout = () => {
  authToken = null;
  currentUser = null;
  
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  
  showAuthOverlay();
};

const checkAuthState = () => {
  const storedToken = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('currentUser');

  if (storedToken && storedUser) {
    authToken = storedToken;
    currentUser = JSON.parse(storedUser);
    showApp();
  } else {
    showAuthOverlay();
  }
};

// ===== UI Functions =====
const showAuthOverlay = () => {
  authOverlay.style.display = 'flex';
  appContainer.style.display = 'none';
  showLoginForm();
};

const showApp = () => {
  authOverlay.style.display = 'none';
  appContainer.style.display = 'block';
  
  if (currentUser) {
    userWelcome.textContent = `Welcome, ${currentUser.firstName}!`;
  }
  
  loadAccountData();
  loadTransactions();
};

const showLoginForm = () => {
  loginBox.style.display = 'block';
  registerBox.style.display = 'none';
  hideError(loginError);
  hideError(registerError);
};

const showRegisterForm = () => {
  loginBox.style.display = 'none';
  registerBox.style.display = 'block';
  hideError(loginError);
  hideError(registerError);
};

// ===== Data Loading Functions =====
const loadAccountData = async () => {
  try {
    const data = await apiRequest('/account');
    
    accountTitle.textContent = 'My Account';
    accountNumber.textContent = `Account: ${data.account.accountNumber}`;
    balanceAmount.textContent = formatCurrency(data.account.balance);
    accountHolder.textContent = data.owner.name;
    accountCountry.textContent = data.owner.country;

    // Update balance color
    balanceAmount.className = `balance-amount ${data.account.balance >= 0 ? 'positive' : 'negative'}`;
    
  } catch (error) {
    console.error('Error loading account data:', error);
    showError(transactionError, 'Failed to load account information');
  }
};

const loadTransactions = async () => {
  try {
    transactionsLoading.style.display = 'block';
    transactionsEmpty.style.display = 'none';
    
    const data = await apiRequest('/transactions');
    transactions = data.transactions;
    
    renderTransactions();
    
  } catch (error) {
    console.error('Error loading transactions:', error);
    showError(transactionError, 'Failed to load transactions');
  } finally {
    transactionsLoading.style.display = 'none';
  }
};

const renderTransactions = () => {
  if (transactions.length === 0) {
    transactionsBody.innerHTML = '';
    transactionsEmpty.style.display = 'block';
    return;
  }

  transactionsEmpty.style.display = 'none';
  
  // Sort transactions by date (oldest first) to assign consistent IDs
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Create a map of transaction IDs based on chronological order
  const transactionIdMap = new Map();
  sortedTransactions.forEach((transaction, index) => {
    transactionIdMap.set(transaction.id || transaction.date, index + 1);
  });
  
  transactionsBody.innerHTML = transactions.map(transaction => `
    <tr>
      <td>
        <span class="transaction-id">${transactionIdMap.get(transaction.id || transaction.date)}</span>
      </td>
      <td>
        <div class="transaction-type-cell">
          <div class="type-info">
            <strong class="type-name">${getTypeDisplay(transaction.type)}</strong>
            <small class="location-name">${transaction.location || 'Unknown location'}</small>
          </div>
        </div>
      </td>
      <td>
        <span class="transaction-direction ${transaction.direction === 'in' ? 'income' : 'expense'}">
          ${transaction.direction === 'in' ? 'Income' : 'Expense'}
        </span>
      </td>
      <td>
        <span class="transaction-amount ${transaction.direction === 'in' ? 'income' : 'expense'}">
          ${transaction.direction === 'in' ? '+' : '-'}${formatCurrency(transaction.amount)}
        </span>
      </td>
      <td class="location-cell">${transaction.location || 'N/A'}</td>
      <td class="description-cell" title="${transaction.description || 'No details available'}">🔲</td>
      <td>${formatDate(transaction.date)}</td>
    </tr>
  `).join('');
};

const createTransaction = async (transactionData) => {
  try {
    const data = await apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData)
    });
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Auto-fill description based on transaction type
document.getElementById('transaction-type').addEventListener('change', (e) => {
  const type = e.target.value;
  const descriptionInput = document.getElementById('transaction-description');
  
  const typeDescriptions = {
    'Salary': 'NET-7834 Base salary + performance bonus',
    'Biedronka': 'Receipt #BDR-4821 | ul. Świdnicka 58, Wrocław', 
    'Żabka': 'Terminal #ZAB-0156 | pl. Solny 14, Wrocław',
    'Tesco': 'Receipt #TSC-9302 | Galeria Dominikańska',
    'Lidl': 'LIDL Plus card | ul. Krakowska 181',
    'Orlen': 'Pump #07 VitayMax | A4 MOP Wrocław Wschód',
    'Shell': 'V-Power fuel | ul. Osobowicka 46',
    'Orange': 'Plan Funky 35GB auto-renewal',
    'Play': '5G bez limitu monthly plan',
    'T-Mobile': 'M subscription voice+data package',
    'Plus': 'Top-up 50zł via BLIK payment',
    'McDonald\'s': 'Order #MC4782 | Rynek 18-19, Wrocław',
    'KFC': 'Order #KF2394 | Galeria Magnolia delivery',
    'Starbucks': 'Venti Latte + Muffin | Sky Tower',
    'Rent': 'Lease agreement #LA-2026-03 monthly',
    'Electricity': 'Account #EL456789 | 2,847 kWh reading', 
    'Water': 'Account #WS123654 | Q1 consumption',
    'Heating': 'PGE District heating | Winter rate',
    'Internet': 'UPC 300Mbps fiber monthly',
    'Transfer': 'From savings ACC-789456 internal',
    'Fitness': 'CityFit gym membership full access',
    'Cinema': 'Helios VIP seats | Evening screening',
    'PKO BP': 'Foreign ATM withdrawal fee EUR',
    'mBank': 'Express transfer commission fee',
    'ING': 'Currency PLN→USD exchange margin',
    'Other': 'Miscellaneous operation not categorized'
  };
  
  if (typeDescriptions[type] && !descriptionInput.value) {
    descriptionInput.value = typeDescriptions[type];
  }
});

// ===== Event Listeners =====

// Login form
loginForm && loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(loginError);

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError(loginError, 'Please fill in all fields');
    return;
  }

  try {
    await login({ email, password });
    showApp();
    loginForm.reset();
  } catch (error) {
    showError(loginError, error.message);
  }
});

// Register form
registerForm && registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(registerError);

  const firstName = document.getElementById('register-firstName').value.trim();
  const lastName = document.getElementById('register-lastName').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const country = document.getElementById('register-country').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirmPassword').value;

  // Validation
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    showError(registerError, 'Please fill in all fields');
    return;
  }

  if (password !== confirmPassword) {
    showError(registerError, 'Passwords do not match');
    return;
  }

  if (password.length < 6) {
    showError(registerError, 'Password must be at least 6 characters long');
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
    showError(registerError, 'Password must contain at least one letter and one number');
    return;
  }

  try {
    await register({ firstName, lastName, email, country, password });
    showError(registerError, 'Registration successful! Please login.');
    setTimeout(() => {
      showLoginForm();
      // Pre-fill login email
      document.getElementById('login-email').value = email;
    }, 2000);
    registerForm.reset();
  } catch (error) {
    showError(registerError, error.message);
  }
});

// Password strength checker
const registerPasswordInput = document.getElementById('register-password');
registerPasswordInput && registerPasswordInput.addEventListener('input', (e) => {
  checkPasswordStrength(e.target.value);
});

// Transaction form
transactionForm && transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(transactionError);

  const type = document.getElementById('transaction-type').value;
  const direction = document.getElementById('transaction-direction').value;
  const amount = parseFloat(document.getElementById('transaction-amount').value);
  const location = document.getElementById('transaction-location').value.trim();
  const description = document.getElementById('transaction-description').value.trim();

  // Validation
  if (!type || !direction || !amount || amount <= 0) {
    showError(transactionError, 'Please fill in all required fields with valid values');
    return;
  }

  try {
    const newTransaction = await createTransaction({
      type,
      direction,
      amount,
      location,
      description
    });

    // Update UI
    transactions.unshift(newTransaction);
    renderTransactions();
    loadAccountData(); // Refresh balance
    
    transactionForm.reset();
    showError(transactionError, `Transaction added successfully! New balance: ${formatCurrency(newTransaction.newBalance)}`);
    
    // Change error styling to success
    transactionError.style.backgroundColor = '#f0f9f4';
    transactionError.style.color = '#166534';
    transactionError.style.borderLeftColor = '#10b981';

    setTimeout(() => {
      hideError(transactionError);
      // Reset error styling
      transactionError.style.backgroundColor = '';
      transactionError.style.color = '';
      transactionError.style.borderLeftColor = '';
    }, 3000);
    
  } catch (error) {
    showError(transactionError, error.message);
  }
});

// Logout
logoutBtn && logoutBtn.addEventListener('click', logout);

// Refresh transactions
refreshTransactionsBtn && refreshTransactionsBtn.addEventListener('click', loadTransactions);

// Auto-hide errors
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('auth-error') || e.target.classList.contains('form-error')) {
    return;
  }
  
  hideError(loginError);
  hideError(registerError);
  hideError(transactionError);
});

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('MyBank V2 - Initializing...');
  
  // Debug: Check if elements exist
  console.log('Show register link:', showRegisterLink);
  console.log('Show login link:', showLoginLink);
  console.log('Login box:', loginBox);
  console.log('Register box:', registerBox);
  
  // Check authentication state
  checkAuthState();
  
  // Setup form switching event listeners
  // Check if all elements exist before adding event listeners
  if (!showRegisterLink || !showLoginLink || !loginBox || !registerBox) {
    console.error('Missing required DOM elements:', {
      showRegisterLink,
      showLoginLink,
      loginBox,
      registerBox
    });
  } else {
    console.log('All form elements found, adding event listeners');
    
    // Auth form switching
    showRegisterLink.addEventListener('click', (e) => {
      console.log('Sign up here clicked!');
      e.preventDefault();
      showRegisterForm();
    });

    showLoginLink.addEventListener('click', (e) => {
      console.log('Sign in here clicked!');
      e.preventDefault();
      showLoginForm();
    });
  }
  
  // Add number formatting to amount inputs
  const amountInputs = document.querySelectorAll('input[type="number"]');
  amountInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      if (e.target.value) {
        e.target.value = parseFloat(e.target.value).toFixed(2);
      }
    });
  });
  
  console.log('MyBank V2 - Ready!');
});

// ===== Service Worker Registration (Optional) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// ===== Export for testing =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatDate,
    checkPasswordStrength,
    apiRequest
  };
}

// Global test functions for debugging
window.testRegisterForm = () => {
  console.log('Testing register form...');
  showRegisterForm();
};

window.testLoginForm = () => {
  console.log('Testing login form...');
  showLoginForm();
};

window.debugForms = () => {
  console.log('Debug info:', {
    loginBox: loginBox,
    registerBox: registerBox,
    showRegisterLink: showRegisterLink,
    showLoginLink: showLoginLink,
    loginBoxDisplay: loginBox ? loginBox.style.display : 'element not found',
    registerBoxDisplay: registerBox ? registerBox.style.display : 'element not found'
  });
};