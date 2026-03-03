# MyBank V2 API Documentation

## 🚀 Base URL
```
http://localhost:3000
```

## 🔐 Authentication

Все protected endpoints требуют Bearer authorization token в header:
```
Authorization: Bearer <your_jwt_token>
```

## 📋 API Endpoints

### 1. 🏠 Health Check
```http
GET /
```
**Response:** HTML страница приложения

---

### 2. 👤 User Registration  
```http
POST /register
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "country": "Poland",
  "password": "secure123"
}
```

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com", 
    "firstName": "John",
    "lastName": "Doe",
    "country": "Poland"
  }
}
```

**Error Response (400):**
```json
{
  "message": "All fields are required"
}
```

---

### 3. 🔑 User Login
```http
POST /login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "demo@mybank.com",
  "password": "demo123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "demo@mybank.com",
    "firstName": "Demo", 
    "lastName": "User",
    "country": "Poland"
  }
}
```

**Error Response (401):**
```json
{
  "message": "Invalid credentials"
}
```

---

### 4. 🏦 Get Account Info
```http
GET /account
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "account": {
    "accountNumber": "ACC-DEMO-1772546185198",
    "balance": 5613.69,
    "currency": "USD"
  },
  "owner": {
    "name": "Demo User",
    "email": "demo@mybank.com", 
    "country": "Poland"
  }
}
```

---

### 5. 📊 Get Transactions
```http
GET /transactions
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid-here",
      "type": "Salary",
      "amount": 5000.00,
      "direction": "in",
      "location": "Company Inc.",
      "description": "Monthly salary - February 2026",
      "date": "2026-02-26T13:56:25.202Z"
    },
    {
      "id": "uuid-here", 
      "type": "Biedronka",
      "amount": 150.75,
      "direction": "out",
      "location": "Biedronka Market Plaza",
      "description": "Weekly groceries shopping",
      "date": "2026-02-28T13:56:25.202Z"
    }
  ]
}
```

---

### 6. ➕ Create Transaction
```http
POST /transactions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "Grocery",
  "amount": 89.50,
  "direction": "out",
  "location": "Żabka ul. Krakowska", 
  "description": "Evening shopping"
}
```

**Success Response (201):**
```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "uuid-here",
    "type": "Grocery",
    "amount": 89.50,
    "direction": "out", 
    "location": "Żabka ul. Krakowska",
    "description": "Evening shopping",
    "date": "2026-03-03T15:30:00.000Z"
  },
  "newBalance": 5524.19
}
```

## 🎯 Quick Start Examples

### Step 1: Get Authentication Token
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@mybank.com",
    "password": "demo123"
  }'
```

### Step 2: Use Token for API Calls
```bash
curl -X GET http://localhost:3000/account \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🏪 Transaction Types Available
- **Income:** Salary, Freelance, Bonus, Transfer, Refund, Investment
- **Shopping:** Biedronka, Żabka, Tesco, Lidl, Grocery, Restaurant
- **Transport:** Orlen, Shell, MPK Wrocław, Uber, Parking  
- **Utilities:** Rent, Electricity, Water, Heating, Internet
- **Telecom:** Orange, Play, T-Mobile, Plus
- **Entertainment:** Cinema, Fitness, McDonald's, KFC, Starbucks
- **Banking:** PKO BP, mBank, ING
- **Other:** Custom type

## 🔧 Transaction Directions
- `"in"` - Income (adds to balance)
- `"out"` - Expense (subtracts from balance)

## ⚠️ Validation Rules

### Registration:
- All fields required
- Valid email format
- Password minimum 6 characters
- Password must contain letters and numbers

### Login:
- Email and password required
- Must match existing user

### Transactions:
- `type`, `amount`, `direction` required
- `amount` must be positive number
- `direction` must be "in" or "out"
- `location` and `description` optional