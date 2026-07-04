# Payment and payout setup for Borrow & Barter

## Overview

Borrow & Barter can support a marketplace commerce layer for:

- Apple Pay
- Google Pay
- PayPal
- Cash App
- Zelle
- standard card payments

The platform can be configured to take a 3% commission on completed transactions and send the remaining balance to the listing owner or borrower according to the transaction type.

## Recommended setup

Use a marketplace payments provider such as:

- Stripe Connect
- PayPal for Business
- Adyen for Platforms
- Square for Marketplaces

These tools provide:

- payment acceptance
- wallet support
- bank payout support
- dispute handling
- webhook-based settlement reporting

## How to connect the website owner’s bank account

1. Create a business account with your payment provider.
2. Complete identity verification and business onboarding.
3. Connect the owner’s bank account using ACH or the provider’s bank-link flow.
4. Confirm the routing number and account number carefully.
5. Verify the account with a small test deposit or micro-deposit process.
6. Enable payouts and set the transfer schedule (daily, weekly, or monthly).
7. Configure your marketplace fee policy so the platform receives 3% and the seller receives the rest.

## Suggested flow for this app

- Buyers pay through a checkout experience.
- The platform collects the payment.
- The system calculates the 3% commission.
- The remaining amount is released to the owner’s connected bank account.
- The platform keeps a ledger entry for reconciliation and reporting.

## Security checklist

- Use HTTPS only.
- Store no raw card numbers in your app database.
- Use provider webhooks for payment status updates.
- Enable 2FA for the business account.
- Keep audit logs for chargebacks, refunds, and payouts.

## Example payout policy

If a borrower buys an item for $100:

- marketplace commission = $3
- owner payout = $97

If a borrow transaction is priced at $60 for three days:

- marketplace commission = $1.80
- owner payout = $58.20

## Notes

This project currently includes the frontend UI and optional backend hooks for a commerce experience. To fully activate live payments, connect a real payment provider and add server-side webhook processing.
