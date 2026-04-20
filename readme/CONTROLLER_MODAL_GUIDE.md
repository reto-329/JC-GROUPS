# Controller & Modal Implementation Guide

## Project Structure

```
controllers/
├── authController.js      # Authentication logic
└── pagesController.js     # Page rendering logic

public/
├── css/
│   └── modal.css         # Modal styling
├── js/
│   ├── modal.js          # Modal manager
│   └── dropdown.js       # Dropdown logic (existing)

routes/
└── index.js              # Route definitions using controllers

views/
├── login.ejs             # Login page
├── register.ejs          # Registration page
└── profile.ejs           # Profile page (protected)
```

## Controller Architecture

### AuthController
Handles all authentication-related operations:

**Methods:**
- `getLogin` - Render login page (GET /login)
- `postLogin` - Handle login submission (POST /login)
- `getRegister` - Render registration page (GET /register)
- `postRegister` - Handle registration submission (POST /register)
- `logout` - Handle user logout (GET /logout)
- `checkEmail` - API endpoint to validate email availability (GET /api/check-email)

**Usage in Routes:**
```javascript
router.get('/login', AuthController.getLogin);
router.post('/login', AuthController.postLogin);
```

### PagesController
Handles page rendering and user data operations:

**Methods:**
- `getHome` - Home page (GET /)
- `getAbout` - About page (GET /about)
- `getEquipment` - Equipment page (GET /equipment)
- `getContact` - Contact page (GET /contact)
- `getProfile` - Profile page (GET /profile) - Protected
- `postUpdateProfile` - Update profile data (POST /profile/update) - Protected
- `getOrders` - Orders page (GET /orders) - Protected
- `getBilling` - Billing page (GET /billing) - Protected

**Usage in Routes:**
```javascript
router.get('/profile', requireLogin, PagesController.getProfile);
router.post('/profile/update', requireLogin, PagesController.postUpdateProfile);
```

## Creating New Controllers

### Step 1: Create Controller File
```javascript
// controllers/productController.js
const ProductController = {
  getProducts: (req, res) => {
    // Business logic here
    res.render('products', { title: 'Products' });
  },

  getProductDetail: (req, res) => {
    const { id } = req.params;
    // Get product by ID
    res.render('product-detail', { title: 'Product Detail' });
  }
};

module.exports = ProductController;
```

### Step 2: Add Routes
```javascript
// In routes/index.js
const ProductController = require('../controllers/productController');

router.get('/products', ProductController.getProducts);
router.get('/products/:id', ProductController.getProductDetail);
```

## Modal System

### Features
- **Non-intrusive**: Modals are progressive enhancement
- **Accessible**: Keyboard navigation, ARIA attributes
- **Responsive**: Works on all screen sizes
- **Customizable**: Easy to style and extend

### HTML Structure

```html
<div class="modal-wrapper" data-modal="modalId">
  <div class="modal-backdrop"></div>
  
  <div class="modal-container">
    <div class="modal-header">
      <h2>Modal Title</h2>
      <button class="modal-close" data-modal-close="modalId">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="modal-body">
      <!-- Content here -->
      <form data-modal-form action="/submit">
        <div class="form-group">
          <label for="field">Field Label</label>
          <input type="text" id="field" name="field" required>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" data-modal-close="modalId">Cancel</button>
      <button type="submit" class="btn-primary" form="formId">Submit</button>
    </div>
  </div>
</div>
```

### JavaScript API

```javascript
// Open modal
window.modalManager.open('modalId');

// Close modal
window.modalManager.close('modalId');

// Toggle modal
window.modalManager.toggle('modalId');

// Check if open
if (window.modalManager.isOpen('modalId')) {
  // Do something
}

// Clear form
window.modalManager.clearForm('modalId');

// Show error message
window.modalManager.showError('modalId', 'Error message here');
```

### Trigger Buttons

```html
<!-- Open modal -->
<button data-modal-open="modalId">Open Modal</button>

<!-- Close modal -->
<button data-modal-close="modalId">Close Modal</button>

<!-- Also closes on Escape key and backdrop click -->
```

## Session Management

User session data is stored server-side via express-session:

```javascript
req.session.userId     // MongoDB ObjectId
req.session.userEmail  // User email
req.session.userName   // First and Last Name
```

These are automatically passed to all templates as template locals:

```ejs
<%= userName=%>        <!-- Displays logged-in user name -->
<% if (isLoggedIn) %>  <!-- Check login status -->
```

## Middleware

### requireLogin
Protects routes by requiring authentication:

```javascript
router.get('/profile', requireLogin, PagesController.getProfile);
// Redirects to /login if not authenticated
```

### User Data Middleware
Automatically adds user info to template locals:

```javascript
res.locals.isLoggedIn     // Boolean
res.locals.userId         // ObjectId or undefined
res.locals.userName       // String or empty
```

## API Endpoints

### Public
- `GET /` - Home
- `GET /about` - About
- `GET /equipment` - Equipment
- `GET /contact` - Contact
- `GET /login` - Login page
- `POST /login` - Submit login
- `GET /register` - Register page
- `POST /register` - Submit registration

### Protected
- `GET /profile` - User profile
- `POST /profile/update` - Update profile
- `GET /orders` - Orders list
- `GET /logout` - Logout

### Utilities
- `GET /api/check-email?email=user@example.com` - Check if email exists (returns JSON)

## Best Practices

### Controllers
1. Keep controllers focused on single responsibility
2. Use descriptive method names following REST conventions
3. Handle errors gracefully with appropriate status codes
4. Validate input before processing
5. Use middleware for cross-cutting concerns

### Modals
1. Use semantic HTML
2. Include ARIA labels for accessibility
3. Provide keyboard shortcuts (Escape to close)
4. Show loading states during submission
5. Clear errors when modal reopens
6. Keep forms simple and focused

### Routes
1. Organize controllers by feature/domain
2. Use middleware for authentication/authorization
3. Keep route definitions clean and readable
4. Use RESTful conventions for naming

## Security Considerations

1. **Password Hashing**: Passwords hashed with bcryptjs before storage
2. **Input Validation**: All inputs validated in controllers
3. **Session Security**: 
   - Secure session secret required
   - Set `secure: true` for HTTPS in production
   - Configurable session timeout
4. **Authentication**: Protected routes redirect to login
5. **Email Validation**: Email uniqueness enforced at database level

## Extending

### Add New Controller
1. Create file in `controllers/` folder
2. Export object with action methods
3. Import in `routes/index.js`
4. Define routes using controller methods

### Add Protected Route
```javascript
router.get('/new-page', requireLogin, PagesController.getNewPage);
```

### Add Modal to View
1. Add modal HTML structure to EJS file
2. Include modal CSS and JS in head
3. Add trigger buttons with `data-modal-open` attribute
4. Use `window.modalManager` API to control from JavaScript
