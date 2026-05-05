document.addEventListener('DOMContentLoaded', function () {
  // Success/Error Modal Functions
  function showSuccessModal(title, message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      ">
        <div style="font-size: 50px; color: #28a745; margin-bottom: 15px;">
          <i class="fas fa-check-circle"></i>
        </div>
        <h2 style="color: #333; margin-bottom: 10px; font-size: 24px;">${title}</h2>
        <p style="color: #666; margin-bottom: 0; font-size: 15px; line-height: 1.6;">${message}</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  function showErrorModal(title, message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      ">
        <div style="font-size: 50px; color: #dc3545; margin-bottom: 15px;">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h2 style="color: #333; margin-bottom: 10px; font-size: 24px;">${title}</h2>
        <p style="color: #666; margin-bottom: 0; font-size: 15px; line-height: 1.6;">${message}</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  const container = document.querySelector('.rental-container');
  const equipmentId = container.dataset.equipmentId;
  const dailyRate = parseFloat(container.dataset.dailyRate);
  const qtyAvailable = parseInt(container.dataset.qtyAvailable);
  const userId = container.dataset.userId;
  const equipmentName = container.dataset.equipmentName;
  const equipmentImage = container.dataset.equipmentImage;

  // Get dynamic service areas from data attribute
  const serviceAreasData = JSON.parse(container.dataset.serviceAreas || '[]');
  const allowedPostalCodes = serviceAreasData
    .map(area => area.postalCode.replace(/[^a-z0-9]/gi, '').toUpperCase());

  const rentalDaysInput = document.getElementById('rentalDays');
  const rentalQtyInput = document.getElementById('rentalQty');
  const startDateInput = document.getElementById('startDate');
  const postalCodeSelect = document.getElementById('postalCode');
  const postalCodeError = document.getElementById('postalCodeError');
  const decreaseBtn = document.getElementById('decreaseQty');
  const increaseBtn = document.getElementById('increaseQty');
  const completeBtn = document.getElementById('completeOrderBtn');

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  startDateInput.min = today;
  startDateInput.value = today;

  function validatePostalCode() {
    const val = postalCodeSelect.value.trim();
    if (!val) {
      postalCodeError.textContent = 'Please select a delivery area';
      postalCodeError.style.display = 'block';
      return false;
    }
    postalCodeError.textContent = '';
    postalCodeError.style.display = 'none';
    return true;
  }

  function updatePricing() {
    const days = parseInt(rentalDaysInput.value) || 1;
    const qty = parseInt(rentalQtyInput.value) || 1;
    const cost = (days * qty * dailyRate).toFixed(2);
    document.getElementById('summaryDays').textContent = days;
    document.getElementById('summaryQty').textContent = qty;
    document.getElementById('equipmentCost').textContent = cost;
    document.getElementById('totalPrice').textContent = cost;
  }

  postalCodeSelect.addEventListener('change', validatePostalCode);

  decreaseBtn.addEventListener('click', function () {
    const val = parseInt(rentalQtyInput.value);
    if (val > 1) { rentalQtyInput.value = val - 1; updatePricing(); }
  });

  increaseBtn.addEventListener('click', function () {
    const val = parseInt(rentalQtyInput.value);
    if (val < qtyAvailable) { rentalQtyInput.value = val + 1; updatePricing(); }
  });

  rentalDaysInput.addEventListener('input', updatePricing);
  rentalQtyInput.addEventListener('input', updatePricing);

  completeBtn.addEventListener('click', async function (e) {
    e.preventDefault();
    console.log('Complete Order button clicked');
    
    if (!validatePostalCode()) {
      console.log('Postal code validation failed');
      return;
    }
    if (!document.getElementById('rentalForm').checkValidity()) {
      alert('Please fill in all required fields');
      return;
    }

    const days = parseInt(rentalDaysInput.value);
    const quantity = parseInt(rentalQtyInput.value);
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    const totalAmount = days * quantity * dailyRate;

    console.log('Order data being prepared:', { days, quantity, startDate, totalAmount });

    const orderData = {
      equipmentId,
      equipmentName,
      quantity,
      dailyRate,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
      subtotal: totalAmount,
      totalAmount,
      postalCode: postalCodeSelect.value.toString().replace(/[^a-z0-9]/gi, '').toUpperCase(),
      equipmentImage
    };

    console.log('Final order data:', orderData);

    try {
      completeBtn.disabled = true;
      completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      // Save to localStorage if user is not logged in
      if (!userId) {
        console.log('User not logged in, saving to cart (localStorage)');
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart.push(orderData);
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Trigger cart update event for header
        window.dispatchEvent(new Event('cartUpdated'));
        
        showSuccessModal('Item Added!', 'Item saved to cart. Redirecting...');
        setTimeout(() => window.location.href = '/cart', 2000);
      } else {
        // If logged in, add to server
        console.log('User logged in, sending to server');
        const response = await fetch('/api/orders/add-to-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response result:', result);

        if (result.success) {
          // Trigger cart update event for header
          window.dispatchEvent(new Event('cartUpdated'));
          
          showSuccessModal('Success!', 'Item added to cart successfully. Redirecting to your cart...');
          setTimeout(() => window.location.href = '/cart', 2000);
        } else {
          console.error('Server error:', result.message);
          showErrorModal('Error', result.message || 'Error adding to cart');
          completeBtn.disabled = false;
          completeBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> COMPLETE ORDER';
        }
      }
    } catch (err) {
      console.error('Error:', err);
      console.error('Error message:', err.message);
      showErrorModal('Error', 'Failed to complete order. Please try again.');
      completeBtn.disabled = false;
      completeBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> COMPLETE ORDER';
    }
  });

  updatePricing();
});
