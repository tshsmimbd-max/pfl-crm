#!/bin/bash

echo "Testing interaction system..."

# Login as agent
echo "=== Logging in as agent ==="
curl -s -X POST "http://localhost:5000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "agent.fixed@paperfly.com", "password": "agent123"}' \
  -c agent_session.txt

echo -e "\n=== Getting leads ==="
LEADS=$(curl -s -X GET "http://localhost:5000/api/leads" -b agent_session.txt)
echo "$LEADS"

# Extract lead ID from response
LEAD_ID=$(echo "$LEADS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Lead ID: $LEAD_ID"

if [ ! -z "$LEAD_ID" ]; then
    echo -e "\n=== Creating interactions ==="
    
    # Create call interaction
    echo "Creating call interaction..."
    curl -s -X POST "http://localhost:5000/api/interactions" \
      -H "Content-Type: application/json" \
      -d "{\"leadId\": $LEAD_ID, \"type\": \"call\", \"subject\": \"Initial contact call\", \"description\": \"Discussed requirements and budget\", \"completedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
      -b agent_session.txt
    
    echo -e "\n"
    
    # Create email interaction
    echo "Creating email interaction..."
    curl -s -X POST "http://localhost:5000/api/interactions" \
      -H "Content-Type: application/json" \
      -d "{\"leadId\": $LEAD_ID, \"type\": \"email\", \"subject\": \"Follow-up proposal\", \"description\": \"Sent detailed proposal with pricing\"}" \
      -b agent_session.txt
    
    echo -e "\n"
    
    # Create scheduled meeting
    FUTURE_DATE=$(date -u -d "+3 days" +%Y-%m-%dT%H:%M:%SZ)
    echo "Creating scheduled meeting..."
    curl -s -X POST "http://localhost:5000/api/interactions" \
      -H "Content-Type: application/json" \
      -d "{\"leadId\": $LEAD_ID, \"type\": \"meeting\", \"subject\": \"Product demo\", \"description\": \"Live product demonstration\", \"scheduledAt\": \"$FUTURE_DATE\"}" \
      -b agent_session.txt
    
    echo -e "\n=== Getting all interactions ==="
    curl -s -X GET "http://localhost:5000/api/interactions/all" -b agent_session.txt
    
    echo -e "\n=== Getting lead-specific interactions ==="
    curl -s -X GET "http://localhost:5000/api/interactions?leadId=$LEAD_ID" -b agent_session.txt
    
else
    echo "No leads found, creating a test lead first..."
    curl -s -X POST "http://localhost:5000/api/leads" \
      -H "Content-Type: application/json" \
      -d '{"contactName": "Test User", "email": "test@example.com", "phone": "123-456-7890", "company": "Test Company", "value": 10000, "stage": "prospect"}' \
      -b agent_session.txt
    echo -e "\nLead created. Please run the script again."
fi

echo -e "\n=== Test completed ==="