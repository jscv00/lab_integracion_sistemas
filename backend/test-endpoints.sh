#!/bin/bash

# Test script for Backend Mi Huerta endpoints
# This script tests the new /api/users and /api/plants endpoints

echo "=== Testing Backend Mi Huerta Endpoints ==="
echo ""

echo "1. Testing GET /api/users/:userId with valid user (should return 200)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/users/1
echo ""

echo "2. Testing GET /api/users/:userId with non-existent user (should return 404)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/users/999
echo ""

echo "3. Testing GET /api/users/:userId with invalid userId (should return 400)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/users/abc
echo ""

echo "4. Testing GET /api/users/:userId with user having null phone_number (should return 200)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/users/3
echo ""

echo "5. Testing GET /api/plants without userId parameter (should return 400)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/plants
echo ""

echo "6. Testing GET /api/plants with valid userId (should return 200)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/plants?userId=1
echo ""

echo "7. Testing GET /api/plants with user having no plants (should return 200 with empty array)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/plants?userId=3
echo ""

echo "8. Testing GET /api/plants with invalid userId (should return 400)"
curl -s -w "\nHTTP_CODE:%{http_code}\n" http://localhost:3001/api/plants?userId=abc
echo ""

echo "=== All tests completed ==="
