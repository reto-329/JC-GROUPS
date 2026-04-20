# JC Rentals - MongoDB Setup Guide

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure MongoDB Connection

#### Option A: Local MongoDB
1. Install MongoDB Community Edition: https://docs.mongodb.com/manual/installation/
2. Start MongoDB service:
   - **Windows**: `mongod` (from MongoDB bin folder)
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `systemctl start mongod`

No additional configuration needed - the app defaults to `mongodb://localhost:27017/jcrentals`

#### Option B: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster and get your connection string
3. Create `.env` file in project root:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jcrentals
PORT=4000
```

### 3. Start the Server
```bash
npm start
```

Or with auto-reload:
```bash
npm run dev
```

### 4. Test Login
- **Email**: test@example.com
- **Password**: password123

## API Endpoints

### Authentication Routes
- `GET /login` - Login page
- `POST /login` - Submit login
- `GET /register` - Registration page
- `POST /register` - Submit registration
- `GET /logout` - Logout user

### Protected Routes (Require Login)
- `GET /profile` - User profile page
- `GET /orders` - Orders page

### Public Routes
- `GET /` - Home
- `GET /about` - About page
- `GET /equipment` - Equipment page
- `GET /contact` - Contact page

## User Model

The User collection in MongoDB includes:
- `email` - Unique email address
- `password` - BCrypt hashed password
- `firstName` - First name
- `lastName` - Last name
- `phone` - Phone number
- `address` - Street address
- `city` - City
- `state` - State
- `zipCode` - ZIP code
- `createdAt` - Account creation date
- `updatedAt` - Last update date

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running locally, or check your MongoDB Atlas connection string
- Verify the connection string in `.env` file
- Check network connection if using MongoDB Atlas

### Session/Login Issues
- Clear browser cookies/session data
- Update the session secret in `server.js` for production
- Sessions expire after 24 hours of inactivity

## Production Notes
- Change session secret in `server.js`
- Set `secure: true` in session cookie for HTTPS
- Use environment variables for all sensitive data
- Implement rate limiting for login attempts
- Add 2FA for enhanced security
