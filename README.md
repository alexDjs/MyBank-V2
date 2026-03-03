# MyBank V2 🏦

Enhanced banking application built with Node.js, Express.js, PostgreSQL, and Docker. This is an upgraded version of the original MyBank with SQL database support, improved user registration, and containerization.

## ✨ Features

- 🔐 **Enhanced User Authentication**: Registration and login with JWT tokens
- 👤 **User Management**: Complete user profiles with personal information
- 💰 **Account Management**: Real-time balance tracking and account details
- 📊 **Transaction History**: Full CRUD operations for transactions
- 🐘 **PostgreSQL Database**: Production-ready SQL database instead of JSON files
- 🐳 **Docker Support**: Fully containerized application
- 📱 **Responsive Design**: Modern, mobile-friendly user interface
- 🚀 **Production Ready**: Optimized for deployment on cloud platforms like Render

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Containerization**: Docker & Docker Compose
- **Deployment**: Ready for Render.com

## 📋 Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (recommended)
- PostgreSQL (if running without Docker)

## 🚀 Quick Start with Docker (Recommended)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd MyBank-V2
```

### 2. Environment Configuration
Copy the `.env` file and adjust settings if needed:
```bash
# The .env file is already configured for Docker
# You can modify passwords and secrets as needed
```

### 3. Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# Initialize the database (first time only)
docker-compose up db-init

# Check logs
docker-compose logs -f mybank-app
```

### 4. Access the Application
- **Web Application**: http://localhost:3000
- **Database**: localhost:5432
- **Demo Account**: email: `demo@mybank.com`, password: `demo123`

## 💻 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup PostgreSQL Database
```bash
# Create database and user (adjust credentials as needed)
createdb mybank_db
createuser -P mybank_user  # You'll be prompted for password

# Or use Docker for just the database
docker run -d \\
  --name mybank-postgres \\
  -e POSTGRES_DB=mybank_db \\
  -e POSTGRES_USER=mybank_user \\
  -e POSTGRES_PASSWORD=mybank_password \\
  -p 5432:5432 \\
  postgres:15-alpine
```

### 3. Configure Environment
Update `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mybank_db
DB_USER=mybank_user
DB_PASSWORD=mybank_password
SECRET_KEY=your_super_secret_jwt_key_change_this_in_production
```

### 4. Initialize Database
```bash
npm run init-db
```

### 5. Start Development Server
```bash
npm run dev
# or
npm start
```

## 🚀 Deployment to Render.com

### 1. Prepare for Deployment

**Create a `render.yaml` file** (optional, for Infrastructure as Code):
```yaml
services:
  - type: web
    name: mybank-v2
    env: node
    repo: https://github.com/yourusername/mybank-v2.git
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: mybank-postgres
          property: connectionString

databases:
  - name: mybank-postgres
    databaseName: mybank_db
    user: mybank_user
```

### 2. Manual Deployment Steps

1. **Create a new Web Service** on Render.com
2. **Connect your GitHub repository**
3. **Configure the service**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     NODE_ENV=production
     SECRET_KEY=your_super_secret_jwt_key_change_this_in_production
     DATABASE_URL=postgresql://username:password@host:port/database
     ```

4. **Create PostgreSQL Database**:
   - Create a new PostgreSQL database on Render
   - Copy the connection string to `DATABASE_URL` environment variable

5. **Deploy**:
   - Render will automatically build and deploy your application
   - The database will be initialized automatically on first run

### 3. Post-Deployment

1. **Initialize Database** (if needed):
   ```bash
   # SSH into your Render instance or run via Render's console
   npm run init-db
   ```

2. **Test the Application**:
   - Visit your Render URL
   - Register a new account or use demo credentials
   - Test all functionality

## 📊 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'Unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  account_number VARCHAR(50) UNIQUE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('in', 'out')),
  location VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 API Endpoints

### Authentication
- `POST /register` - Register a new user
- `POST /login` - Authenticate user

### Account Management
- `GET /account` - Get user account information

### Transactions
- `GET /transactions` - Get user transactions (with pagination)
- `POST /transactions` - Create new transaction

### Utility
- `GET /` - Health check

## 🧪 Testing

```bash
# Run the application in development mode
npm run dev

# Test with demo account
# Email: demo@mybank.com
# Password: demo123
```

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v

# Rebuild specific service
docker-compose build mybank-app
docker-compose up -d mybank-app
```

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT token authentication with expiration
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- CORS configuration
- Environment variable protection

## 📈 Performance Optimizations

- Database indexing for queries
- Connection pooling with pg
- Multi-stage Docker builds
- Static file serving optimization
- CSS/JS minification ready

## 🛠 Development Tools

```bash
# Install nodemon for development
npm install -g nodemon

# Run in development mode with auto-restart
npm run dev

# Database management
npm run init-db  # Initialize database with sample data
```

## 📁 Project Structure

```
MyBank-V2/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── app.js             # Frontend JavaScript
│   └── style.css          # CSS styles
├── scripts/               # Database scripts
│   └── init-database.js   # Database initialization
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker build instructions
├── server.js             # Main server file
├── package.json          # Node.js dependencies
└── .env                  # Environment variables
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

**Port Already in Use**:
```bash
# Change port in .env file or stop conflicting services
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

**Authentication Issues**:
- Clear browser localStorage
- Check JWT secret in .env
- Verify database user permissions

## 🎯 Roadmap

- [ ] Email verification for registration
- [ ] Password reset functionality  
- [ ] Transaction categories and filtering
- [ ] Export transactions to CSV/PDF
- [ ] Real-time notifications
- [ ] Admin dashboard
- [ ] API rate limiting
- [ ] Automated testing suite

## 👨‍💻 Author

Created with ❤️ by Alex

## 🚀 Repository & Deployment

- **GitHub:** [https://github.com/alexDjs/MyBank-V2.git](https://github.com/alexDjs/MyBank-V2.git)
- **Deploy to Render:** See [RENDER_DEPLOY.md](RENDER_DEPLOY.md) for complete instructions
- **API Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Postman Collection:** [MyBank-V2.postman_collection.json](MyBank-V2.postman_collection.json)

### Quick Deploy to Render:
1. **Fork/Clone:** `https://github.com/alexDjs/MyBank-V2.git`
2. **New Web Service** on Render.com
3. **Connect GitHub** → Select `alexDjs/MyBank-V2`  
4. **Auto-deploy** via render.yaml 🎉

---

## 🌟 Improvements over Original MyBank

- ✅ **SQL Database**: Replaced JSON files with PostgreSQL
- ✅ **Enhanced Registration**: Complete user profiles with validation
- ✅ **Docker Support**: Full containerization for easy deployment
- ✅ **Modern UI**: Responsive design with improved UX
- ✅ **Production Ready**: Optimized for cloud deployment
- ✅ **Security Enhanced**: Better authentication and validation
- ✅ **Scalability**: Database design supports multiple users#   M y B a n k - V 2  
 