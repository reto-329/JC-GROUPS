const axios = require('axios');

// Moneris Hosted Checkout API endpoints (Preload)
const MONERIS_LIVE_URL = 'https://www3.moneris.com/chkt/rest';
const MONERIS_TEST_URL = 'https://esqa.moneris.com/chkt/rest';

const getMonerisBaseUrl = () => {
  const env = process.env.MONERIS_ENVIRONMENT;
  const url = env === 'live' ? MONERIS_LIVE_URL : MONERIS_TEST_URL;
  console.log('[MONERIS] Environment:', env || 'test');
  console.log('[MONERIS] Base URL:', url);
  return url;
};

const getCheckoutConfig = () => {
  const storeId = process.env.MONERIS_STORE_ID;
  const apiToken = process.env.MONERIS_API_TOKEN;
  const checkoutId = process.env.MONERIS_CHECKOUT_ID;

  if (!storeId || !apiToken || !checkoutId) {
    throw new Error('Missing Moneris configuration: STORE_ID, API_TOKEN, CHECKOUT_ID are required.');
  }

  return { storeId, apiToken, checkoutId };
};

const createCheckoutSession = async ({ amount, orderId, orderNumber, returnUrl, cancelUrl, billingAddress, shippingAddress, email, phone }) => {
  const baseUrl = getMonerisBaseUrl();
  const { storeId, apiToken, checkoutId } = getCheckoutConfig();

  // Prepare billing/shipping details (optional but recommended)
  const billingDetails = {
    name: billingAddress.fullName || '',
    email: email || '',
    phone: phone || '',
    address_line1: billingAddress.street || '',
    city: billingAddress.city || '',
    province: billingAddress.state || '',
    postal_code: billingAddress.zipCode || '',
    country: 'CA'
  };

  const shippingDetails = {
    name: shippingAddress.fullName || '',
    email: email || '',
    phone: phone || '',
    address_line1: shippingAddress.street || '',
    city: shippingAddress.city || '',
    province: shippingAddress.state || '',
    postal_code: shippingAddress.zipCode || '',
    country: 'CA'
  };

  const requestBody = {
    store_id: storeId,
    api_token: apiToken,
    checkout_id: checkoutId,
    txn_total: amount.toFixed(2),
    environment: process.env.MONERIS_ENVIRONMENT === 'live' ? 'prod' : 'qa',
    action: 'preload',
    order_no: orderNumber || orderId,
    language: 'en',
    billing_details: billingDetails,
    shipping_details: shippingDetails
  };

  // Remove empty fields to avoid validation errors
  Object.keys(requestBody).forEach(key => {
    if (requestBody[key] === '' || requestBody[key] === null || requestBody[key] === undefined) {
      delete requestBody[key];
    }
  });
  ['billing_details', 'shipping_details'].forEach(section => {
    if (requestBody[section]) {
      Object.keys(requestBody[section]).forEach(k => {
        if (requestBody[section][k] === '') delete requestBody[section][k];
      });
      if (Object.keys(requestBody[section]).length === 0) delete requestBody[section];
    }
  });

  const fullUrl = `${baseUrl}/preload`;
  console.log('[MONERIS] Preload URL:', fullUrl);
  console.log('[MONERIS] Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await axios.post(fullUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });

    console.log('[MONERIS] Preload response:', response.data);

    // Successful preload returns { ticket: "some_ticket_string" }
    const ticket = response.data?.ticket;
    if (!ticket) {
      throw new Error(`Moneris preload failed: ${JSON.stringify(response.data)}`);
    }

    // Build the hosted checkout page URL
    const checkoutUrl = `${baseUrl}/checkout/${ticket}`;

    return {
      checkoutUrl: checkoutUrl,
      ticket: ticket,        // store this if you need to reference later
      status: 'preloaded'
    };
  } catch (error) {
    console.error('[MONERIS] Preload error:', error.message);
    if (error.response) {
      console.error('[MONERIS] Response status:', error.response.status);
      console.error('[MONERIS] Response data:', error.response.data);
      throw new Error(`Moneris API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Moneris API Network Error: ${error.message}`);
    }
  }
};

// You may keep fetchCheckoutStatus if needed, but note that status polling
// might work differently with the new API. For now, we'll leave it as a placeholder.
const fetchCheckoutStatus = async (checkoutId) => {
  console.warn('[MONERIS] fetchCheckoutStatus is not implemented for preload API – using fallback');
  return { status: 'pending' };
};

module.exports = {
  createCheckoutSession,
  fetchCheckoutStatus
};
