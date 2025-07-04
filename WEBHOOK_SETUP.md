# Stripe Webhook Setup and Customer ID Management

## Overview

This document explains the enhanced webhook functionality and customer ID management system for handling Stripe subscriptions.

## Features Implemented

### 1. Enhanced Webhook Handler (`stripeWebhook`)

The webhook now handles the following events:

- **`customer.subscription.created`** - New subscription created
- **`customer.subscription.updated`** - Subscription updated
- **`customer.subscription.deleted`** - Subscription canceled
- **`invoice.payment_succeeded`** - Payment successful
- **`invoice.payment_failed`** - Payment failed
- **`customer.created`** - New customer created

### 2. Customer ID Management

- **Automatic Customer Creation**: When a user subscribes for the first time, a Stripe customer is automatically created
- **Customer ID Storage**: Customer IDs are stored in the `users` table for future use
- **Reuse Existing Customers**: Subsequent subscriptions use the stored customer ID

### 3. Subscription Data Management

- **Real-time Updates**: Subscription status, start date, and end date are updated via webhooks
- **Status Tracking**: Tracks active, canceled, past_due, and expired subscriptions
- **Metadata Storage**: Stores subscription ID, plan, and payment information

## Database Schema

### Users Table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

### Subscriptions Table

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stripe_subscription_id text not null,
  plan text,
  status text,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## API Endpoints

### 1. Create Payment Intent

```
POST /payment/intent
```

- Creates payment intent with customer ID
- Ensures user has a Stripe customer ID

### 2. Verify Payment

```
POST /payment/verify
```

- Verifies payment success
- Creates subscription record
- Associates customer ID

### 3. Subscribe (Recurring)

```
POST /payment/subscribe
```

- Creates recurring subscription
- Handles customer ID creation/retrieval
- Stores subscription data

### 4. Sync Customer Data

```
GET /payment/sync-customer
```

- Ensures user has a customer ID
- Creates customer if not exists

### 5. Webhook Endpoint

```
POST /payment/webhook
```

- Handles all Stripe webhook events
- Updates subscription status
- Manages customer data

## Webhook Setup Instructions

### 1. Configure Stripe Webhook

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/payment/webhook`
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.created`

### 2. Set Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Test Webhook

Run the test script:

```bash
node test-webhook.js
```

## Flow Diagrams

### First-Time Subscription Flow

```
1. User subscribes
2. Check if user has customer ID
3. If not, create Stripe customer
4. Save customer ID to database
5. Create subscription
6. Webhook updates subscription data
```

### Returning User Flow

```
1. User subscribes again
2. Retrieve existing customer ID
3. Create new subscription
4. Webhook updates subscription data
```

### Webhook Event Flow

```
1. Stripe sends webhook event
2. Verify webhook signature
3. Process event type
4. Update database accordingly
5. Log success/error
```

## Error Handling

- **Webhook Signature Verification**: Ensures webhook authenticity
- **Database Error Handling**: Logs and handles database operation failures
- **Customer ID Management**: Gracefully handles missing customer IDs
- **Subscription Status Updates**: Handles various subscription states

## Logging

The system includes comprehensive logging:

- Webhook event processing
- Customer creation/retrieval
- Subscription updates
- Error conditions

## Testing

Use the provided test script to verify:

- Customer creation
- Subscription creation
- Database connectivity
- Webhook functionality

## Security Considerations

- Webhook signature verification
- Customer ID validation
- User authentication for all endpoints
- Secure storage of customer IDs

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**

   - Check webhook endpoint URL
   - Verify webhook secret
   - Check server logs

2. **Customer ID not found**

   - Run sync customer endpoint
   - Check user authentication
   - Verify database connection

3. **Subscription not updating**
   - Check webhook event types
   - Verify database permissions
   - Check subscription status logic
