#!/bin/bash

echo "=== Testing Customer and Revenue Notification Systems ==="
echo

echo "1. Testing Single Customer Creation..."
curl -s -X POST "http://localhost:5000/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantCode": "TEST123",
    "merchantName": "Test Notification Company",
    "rateChart": "ISD",
    "contactPerson": "John Doe",
    "phoneNumber": "01234567890",
    "assignedAgent": "69e16f20-e742-4286-95d7-d4e5228603bc",
    "productType": "E-commerce",
    "notes": "Test customer for notification verification"
  }' \
  -b cookies.txt | jq '.'

echo
echo "2. Testing Single Revenue Entry Creation..."
curl -s -X POST "http://localhost:5000/api/daily-revenue" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantCode": "M137699",
    "assignedUser": "69e16f20-e742-4286-95d7-d4e5228603bc",
    "revenue": 25000,
    "orders": 3,
    "description": "Test revenue entry for notification",
    "date": "2025-01-18"
  }' \
  -b cookies.txt | jq '.'

echo
echo "3. Testing Bulk Customer Upload..."
curl -s -X POST "http://localhost:5000/api/customers/bulk-upload" \
  -F "customers=@test_bulk_customers.csv" \
  -b cookies.txt | jq '.'

echo
echo "4. Testing Bulk Revenue Upload..."
curl -s -X POST "http://localhost:5000/api/daily-revenue/bulk-upload" \
  -F "file=@test_revenue_upload.csv" \
  -b cookies.txt | jq '.'

echo
echo "5. Checking Recent Notifications..."
curl -s -X GET "http://localhost:5000/api/notifications" \
  -b cookies.txt | jq '.[:5]'

echo
echo "=== Test Complete ==="