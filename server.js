const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // For handling cross-origin requests from your frontend
const crypto = require('crypto');
const Paystack = require('paystack-api')('process.env.PAYSTACK_SECRET_KEY'); // Replace with your actual secret key
require('dotenv').config(); // Make sure to load environment variables


const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Your API routes (like /verify-payment and /webhook) will go here
// Middleware
app.use(cors());
app.use(bodyParser.json()); // To parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// New route to display "hi"
app.get('/', (req, res) => {
  res.send('<p>hi ebube i am here for you</p>');
})
//verify  payment
app.post('/verify-payment', async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ message: 'Transaction reference is required' });
  }

  try {
    const verificationResponse = await Paystack.transaction.verify({ reference });

    if (verificationResponse.status && verificationResponse.data.status === 'success') {
      console.log('Payment verified successfully:', verificationResponse.data);
      res.status(200).json({ message: 'Payment successful', data: verificationResponse.data });
      // Here you would typically update your database, fulfill the order, etc.
    } else {
      console.log('Payment verification failed:', verificationResponse.data);
      res.status(400).json({ message: 'Payment verification failed', data: verificationResponse.data });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});
// Webhook endpoint
app.post('/webhook', (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY; // Your Paystack Secret Key (from .env)

  // Ensure the signature is present in the headers
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  const signature = req.headers['x-paystack-signature'];
   if (hash === signature) {
    // Webhook signature is valid
    const event = req.body.event;
    const data = req.body.data;

    console.log('Webhook received:', event);
    console.log('Webhook data:', data);

    if (event === 'charge.success') {
      // Handle successful charge
      handleSuccessfulCharge(data);
    } else if (event === 'charge.failed') {
      // Handle failed charge
      handleFailedCharge(data);
    } else if (event === 'transfer.success') {
      // Handle successful transfer (if you use Paystack Transfers)
      handleSuccessfulTransfer(data);
    }
    // Add more event listeners as needed

    res.sendStatus(200); // Acknowledge receipt of the webhook
  } else {
    // Invalid signature - reject the request
    console.log('Webhook signature mismatch!');
    res.sendStatus(401); // Unauthorized
  }
});

// Example functions to handle different events
function handleSuccessfulCharge(data) {
  // Extract relevant information from data (e.g., transaction reference, amount, customer details)
  const { reference, amount, customer } = data;
  console.log(`Payment successful for reference: ${reference}, amount: ${amount / 100}`);
  // Update your database, fulfill order, send confirmation email, etc.
  // **Crucially, you might want to verify the transaction with Paystack's API here as an extra layer of security.**
}

function handleFailedCharge(data) {
  const { reference, reason, customer } = data;
  console.log(`Payment failed for reference: ${reference}, reason: ${reason}`);
  // Update order status, notify user of failure, etc.
}

function handleSuccessfulTransfer(data) {
  const { reference, amount, recipient } = data;
  console.log(`Transfer successful for reference: ${reference}, amount: ${amount / 100}, recipient: ${recipient.name}`);
  // Update transfer status in your system
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

});