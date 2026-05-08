# Smart Dine-In Payment Module Documentation

## 🎯 Overview

The payment module provides a complete billing and checkout system with multiple payment methods integration for the Smart Dine-In application.

## 📁 Files Created/Modified

### New Files:
1. **frontend/payment.html** - Payment page UI with cart display and payment method selection
2. **frontend/payment.js** - Frontend logic for cart management and payment processing

### Modified Files:
1. **backend/server.js** - Added order API endpoints
2. **frontend/menu.js** - Enhanced with cart functionality
3. **frontend/menu.html** - Added cart icon to header

## ✨ Features

### 1. **Shopping Cart Management**
   - Add items to cart from menu
   - Increase/decrease item quantities
   - Remove items from cart
   - Cart persists in localStorage
   - Real-time cart badge in header

### 2. **Billing Interface**
   - Subtotal calculation
   - Automatic tax calculation (18% GST)
   - Delivery charges (₹40, FREE for orders > ₹500)
   - Promo code support (WELCOME50, DINE100, LUCKY20, FLAT30)
   - Discount display
   - Total amount calculation

### 3. **Payment Methods**

#### UPI
- Enter UPI ID (e.g., yourname@upi)
- Validation for proper UPI format
- Payment request notification

#### QR Code
- Visual QR code display
- Optional transaction reference entry
- Secure payment link

#### Credit/Debit Card
- 16-digit card number
- MM/YY expiry format
- 3-digit CVV
- Cardholder name
- Input validation

#### Net Banking
- Multiple bank options:
  - SBI, HDFC, ICICI, Axis, BoB, PNB, Kotak, YES Bank
- Bank selection dropdown
- Redirect to bank portal

#### Cash on Delivery (COD)
- Simple confirmation modal
- Payment on delivery
- Order tracking support

### 4. **Order Management**
   - Order creation with unique ID
   - Order status tracking (pending/completed)
   - Payment details storage
   - User order history
   - Order retrieval by ID

## 🚀 How to Use

### For Users:

1. **Browse Menu:**
   - Visit `/menu.html`
   - Browse available items
   - Search, sort, and filter items

2. **Add to Cart:**
   - Click "Add to Cart" button on any item
   - See cart badge update in header
   - Add multiple items

3. **Checkout:**
   - Click cart icon in header or "Add More Items" button on payment page
   - Review cart items and billing summary

4. **Select Payment Method:**
   - Choose preferred payment method
   - Enter required payment details
   - See payment method-specific form

5. **Complete Order:**
   - Click "Pay" button
   - Receive order confirmation with Order ID
   - Get estimated delivery time (20-30 mins)

### Quick Buy Option:
- Click "Buy Now" on any menu item
- Goes directly to payment with single item
- Can add more items before checkout

## 🔧 Backend API Endpoints

### 1. Create Order
```
POST /api/orders
Headers: Authorization: Bearer {token}
Body: {
  items: [ { id, name, price, quantity, image }, ... ],
  totalAmount: number,
  paymentMethod: "upi|qr|card|netbanking|cod",
  status: "completed|pending",
  paymentDetails: { /* method-specific details */ }
}
Response: { orderId, totalAmount, paymentMethod }
```

### 2. Get User Orders
```
GET /api/orders
Headers: Authorization: Bearer {token}
Response: [ { orderId, items, totalAmount, paymentMethod, status, timestamp }, ... ]
```

### 3. Get Order Details
```
GET /api/orders/:orderId
Headers: Authorization: Bearer {token}
Response: { orderId, items, totalAmount, paymentMethod, status, paymentDetails, timestamp }
```

### 4. Update Order Status
```
PATCH /api/orders/:orderId/status
Headers: Authorization: Bearer {token}
Body: { status: "pending|completed|processing|delivered" }
Response: { message, status }
```

## 💾 Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId VARCHAR(50) UNIQUE,
  userId INT,
  items JSON,
  totalAmount DECIMAL(10, 2),
  paymentMethod VARCHAR(50),
  paymentDetails JSON,
  status VARCHAR(50),
  timestamp DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## 🎨 UI Components

### Cart Display
- Item name, price, quantity
- Quantity adjustment buttons (+/-)
- Remove item button
- Item total calculation
- Empty cart message

### Payment Methods Visual
- Radio buttons for selection
- Icons for each method
- Selected method highlighting
- Method-specific input forms

### Billing Summary
- Fixed position sticky sidebar
- Real-time total updates
- Tax and delivery display
- Promo code section
- Payment button

### Modals
- **Success Modal:** Order confirmation with Order ID
- **Pending Modal:** COD order pending confirmation

## 🔐 Security Features

- JWT token verification on backend
- User authentication required for checkout
- Sensitive data (card details) masked in storage
- Order data tied to user ID
- Secure payment details in JSON format

## 📱 Responsive Design

- Mobile-friendly layout (stacks on < 768px)
- Touch-friendly buttons
- Scrollable cart on mobile
- Sticky summary on desktop
- Notification system for cart updates

## 🎯 Promo Codes

| Code | Discount |
|------|----------|
| WELCOME50 | ₹50 off |
| DINE100 | ₹100 off |
| LUCKY20 | 20% off |
| FLAT30 | ₹30 off |

## ⚙️ Configuration

### Modify Tax Rate:
In `payment.js`, line with tax calculation:
```javascript
const tax = subtotal * 0.18;  // Change 0.18 to desired rate
```

### Modify Delivery Charges:
In `payment.js`:
```javascript
const delivery = subtotal > 500 ? 0 : 40;  // Change 500 (free above) or 40 (charge)
```

### Add New Payment Method:
1. Add option in payment.html
2. Add form in payment-form section
3. Add validation in `validatePaymentDetails()`
4. Add details extraction in `getPaymentDetails()`

## 📝 Notes

- Orders are created with timestamp
- Cart clears after successful payment
- Promo codes cannot be combined
- Order status can be updated via API
- Payment details stored securely as JSON

## 🐛 Troubleshooting

**Issue: Cart not persisting**
- Clear browser localStorage and try again
- Check browser allows localStorage

**Issue: Payment button disabled**
- Select a payment method
- Fill all required fields
- Check error messages shown

**Issue: Cart not showing items**
- Ensure logged in
- Check sessionStorage for initial item
- Verify menu API is working

## 🚀 Future Enhancements

- Real payment gateway integration
- Order tracking with real-time updates
- Multiple address support
- Order history with filters
- Refund management
- Rating and review system
- Wishlist functionality
- Loyalty points system

## 📞 Support

For issues or questions about the payment module, check:
1. Browser console for errors
2. Network tab for API calls
3. Backend server logs
4. Database for order records
