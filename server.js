const express = require('express');
const products = require('./top.js');
const product = require('./product.js');
const details = require('./details.js');
const url = require('url');
//const db = require('./database');
const querystring = require('querystring');
//const userss = require('./users.js');
const session = require('express-session');
const ejs = require('ejs');
const QRCode = require('qrcode');
const http = require('http');
const Busboy = require('busboy');
const sha1 = require('sha1');
const path = require('path');
const paypal = require('@paypal/checkout-server-sdk');
const fs = require('fs');
const crypto = require('crypto');
const { Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, TextureLoader, Mesh } = require('three');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const app = express();
// Set EJS as view engine
app.set('view engine', 'ejs');



const PORT = process.env.PORT || 3000;

app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(bodyParser.json());


// Middleware for session management
app.use(session({
  secret: 'aQjK!#n3rP5v&mB^9H@LwDyUz$EXe8Gs', // Change this to a secure random key
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    upload(req, (err, result) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});



 // Simulate a cart for demonstration
    const cart = [];

// PayPal client configuration
const clientId = 'AbX7BIpyZUUeELY_y0ldeq-cQYjTzItKcsb8PmRZzNwW4tkFbKhZ_kkeyINwDMND7vFpM9Wsfzufh2Va';

const clientSecret = 'EK8eYc4LLVWuEChMiniQh-Kqz1kDBQIHQOUbckWoN1-WDxHl7zAw9kS_oO6-cesqN0kCaYsj9FQL4xOT';

// Set up PayPal environment
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// Middleware for creating an order
async function createOrderMiddleware(req, res, next) {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: '100.00' // Adjust this value as needed
      }
    }]
  });

  try {
    const response = await client.execute(request);
    console.log('Order created:', response.result);
    req.orderId = response.result.id; // Store the order ID in the request object
    next();
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send('Error creating order');
  }
}

// Middleware for capturing an order
async function captureOrderMiddleware(req, res, next) {
  const orderId = req.orderId; // Retrieve the order ID from the request object

  if (!orderId) {
    return res.status(400).send('Order ID not found');
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await client.execute(request);
    console.log('Order captured:', response.result);
    req.paymentStatus = response.result.status === 'COMPLETED'; // Store the payment status in the request object
    next();
  } catch (error) {
    console.error('Error capturing order:', error);
    res.status(500).send('Error capturing order');
  }
}

// Example usage: Route handler
app.post('/checkout', createOrderMiddleware, captureOrderMiddleware, (req, res) => {
  const paymentStatus = req.paymentStatus; // Retrieve the payment status from the request object

  if (paymentStatus) {
    res.send('Payment successful');
  } else {
    res.send('Payment failed');
  }
}); 


const users = [
  {
    id: 1,
    username: '',
    password: '',
    profilePic: '',
    wallet: {
      balance: 0,
      transactions: []
    },
    userId: '',
    resetToken: null,
    tokenExpiry: null
  },
  // Add more users as needed
];




// Configure Passport.js
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Implement your authentication logic here
    // Example: Check if username and password are valid
    if (username === username && password === password) {
      return done(null, { id: 1, username: username });
    } else {
      return done(null, false, { message: 'Incorrect username or password' });
    }
  }
));  

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Fetch user from database based on id
  // Example: User.findById(id, (err, user) => done(err, user));
  done(null, { id: 1, username, phone, orderId, userId, country: 'admin' });
});




// Example Express.js route
app.get('/account', (req, res) => {
const isAuthenticated = req.session.isAuthenticated || false;
  const user = req.session.user || null;

  res.render('account', {
    user: user,
    isAuthenticated: isAuthenticated
  });
});



// Route for user login
// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Check if the provided username and password match any user
  const user = users.find(user => user.username === username && user.password === password);
  if (user) {
    // Set session variables to mark the user as authenticated and store user data
    req.session.isAuthenticated = true;
    req.session.user = user;
    res.redirect('/account');
  } else {
    res.status(401).render('error.ejs');
  }
});


app.get('/', (req, res) => {
  res.render('signup.ejs');
});

// Route for user sign-up
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  // Check if the provided username already exists
  const userExists = users.some(user => user.username === username);
  if (userExists) {
    res.status(400).send('<h2>Username already exists. Please choose another one.</h2>');
  } else {
    // Create a new user and add it to the users array
    const newUser = { id: users.length + 1, username, password };
    users.push(newUser);
    // Set session variables to mark the user as authenticated and store user data
    req.session.isAuthenticated = true;
    req.session.user = newUser;
      res.redirect('/account');
  }
});


app.get('/home', (req, res) => {  
  const user = req.session.user || null; 
  res.sendFile(path.join(__dirname,  'index.html'));
});





// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});  	