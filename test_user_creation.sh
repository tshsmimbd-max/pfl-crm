#!/bin/bash

echo "=== Testing User Creation with Welcome Email ==="
echo

echo "1. Creating a test user account..."
curl -s -X POST "http://localhost:5000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@paperfly.com.bd",
    "employeeName": "Test User",
    "employeeCode": "TEST001",
    "password": "testpass123",
    "role": "sales_agent",
    "managerId": "69e16f20-e742-4286-95d7-d4e5228603bc",
    "teamName": "Test Team"
  }' \
  -b cookies.txt | jq '.'

echo
echo "2. Checking recent notifications for confirmation..."
curl -s -X GET "http://localhost:5000/api/notifications" \
  -b cookies.txt | jq '.[:3]'

echo
echo "=== Test Complete ==="
echo "Check server logs for welcome email delivery status."