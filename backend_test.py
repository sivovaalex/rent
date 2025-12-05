#!/usr/bin/env python3
"""
Backend API Testing for Аренда PRO Platform
Tests all backend endpoints according to the technical specification
"""

import requests
import json
import time
import os
from datetime import datetime, timedelta

# Load environment variables
def load_env():
    env_vars = {}
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value
    except FileNotFoundError:
        print("❌ .env file not found")
    return env_vars

env = load_env()
# Use localhost for internal testing since external URL doesn't route API calls properly
BASE_URL = 'http://localhost:3000'
API_BASE = f"{BASE_URL}/api"

print(f"🔗 Testing API at: {API_BASE}")

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def success(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def failure(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n📊 Test Summary: {self.passed}/{total} passed")
        if self.errors:
            print("\n🚨 Failures:")
            for error in self.errors:
                print(f"  - {error}")

results = TestResults()

# Test data
test_phone = "+7900123456"
test_name = "Алексей Тестов"
test_user_id = None
test_item_id = None
test_booking_id = None
admin_user_id = None

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with error handling"""
    url = f"{API_BASE}{endpoint}"
    try:
        # Add default headers
        if headers is None:
            headers = {}
        headers['Content-Type'] = 'application/json'
        
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == 'PATCH':
            response = requests.patch(url, json=data, headers=headers, timeout=10)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        
        print(f"DEBUG: {method} {url} -> {response.status_code} (response object: {type(response)})")
        return response
    except requests.exceptions.Timeout:
        print(f"Timeout for {method} {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request error for {method} {url}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error for {method} {url}: {e}")
        return None

def test_auth_flow():
    """Test authentication flow: send SMS -> verify SMS -> upload document"""
    global test_user_id
    
    print("\n🔐 Testing Authentication Flow")
    
    # 1. Send SMS
    response = make_request('POST', '/auth/send-sms', {'phone': test_phone})
    if response and response.status_code == 200:
        results.success("SMS send request")
    else:
        results.failure("SMS send request", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # 2. Get SMS code from logs (mock)
    print("📱 Mock SMS code should appear in supervisor logs")
    # Get the actual SMS code from logs
    import subprocess
    try:
        result = subprocess.run(['tail', '-10', '/var/log/supervisor/nextjs.out.log'], 
                              capture_output=True, text=True)
        log_lines = result.stdout.split('\n')
        sms_code = None
        for line in reversed(log_lines):
            if f'SMS код для {test_phone}:' in line:
                sms_code = line.split(':')[-1].strip()
                break
        if not sms_code:
            sms_code = "123456"  # Fallback
    except:
        sms_code = "123456"  # Fallback
    
    # 3. Verify SMS
    response = make_request('POST', '/auth/verify-sms', {
        'phone': test_phone,
        'code': sms_code,
        'name': test_name
    })
    
    if response and response.status_code == 200:
        data = response.json()
        if 'user' in data:
            test_user_id = data['user']['_id']
            results.success("SMS verification and user creation")
        else:
            results.failure("SMS verification", "No user data in response")
            return False
    else:
        results.failure("SMS verification", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # 4. Upload document
    headers = {'x-user-id': test_user_id}
    document_data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"
    
    response = make_request('POST', '/auth/upload-document', {
        'documentData': document_data,
        'documentType': 'passport'
    }, headers)
    
    if response and response.status_code == 200:
        results.success("Document upload")
    else:
        results.failure("Document upload", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_items_management():
    """Test items CRUD operations"""
    global test_item_id
    
    print("\n📦 Testing Items Management")
    
    if not test_user_id:
        results.failure("Items test", "No authenticated user")
        return False
    
    headers = {'x-user-id': test_user_id}
    
    # 1. Create item (should fail - user not verified)
    item_data = {
        'title': 'Sony A7R IV Camera',
        'description': 'Professional mirrorless camera for content creation',
        'category': 'stream_equipment',
        'price_per_day': 2500,
        'price_per_month': 50000,
        'deposit': 150000,
        'location': 'Москва',
        'attributes': {
            'type': 'camera',
            'brand': 'Sony',
            'condition': 'excellent'
        }
    }
    
    response = make_request('POST', '/items', item_data, headers)
    if response is not None:
        if response.status_code == 403:
            results.success("Item creation blocked for unverified user")
        else:
            results.failure("Item creation verification check", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Item creation verification check", "No response")
    
    # 2. Get items list (should work)
    response = make_request('GET', '/items')
    if response and response.status_code == 200:
        data = response.json()
        if 'items' in data:
            results.success("Items list retrieval")
        else:
            results.failure("Items list", "No items array in response")
    else:
        results.failure("Items list retrieval", f"Status: {response.status_code if response else 'No response'}")
    
    # 3. Test filtering
    response = make_request('GET', '/items?category=stream_equipment&search=camera')
    if response and response.status_code == 200:
        results.success("Items filtering")
    else:
        results.failure("Items filtering", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_booking_flow():
    """Test booking creation and management"""
    global test_booking_id
    
    print("\n📅 Testing Booking Flow")
    
    if not test_user_id:
        results.failure("Booking test", "No authenticated user")
        return False
    
    headers = {'x-user-id': test_user_id}
    
    # 1. Try to book item (should fail - user not verified)
    booking_data = {
        'start_date': (datetime.now() + timedelta(days=1)).isoformat(),
        'end_date': (datetime.now() + timedelta(days=3)).isoformat(),
        'rental_type': 'day',
        'is_insured': True
    }
    
    # Use a mock item ID for testing
    mock_item_id = "test-item-123"
    response = make_request('POST', f'/items/{mock_item_id}/book', booking_data, headers)
    
    if response:
        if response.status_code == 403:
            results.success("Booking blocked for unverified user")
        else:
            results.failure("Booking verification check", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Booking verification check", "No response")
    
    # 2. Get user bookings
    response = make_request('GET', '/bookings', headers=headers)
    if response and response.status_code == 200:
        data = response.json()
        if 'bookings' in data:
            results.success("Bookings list retrieval")
        else:
            results.failure("Bookings list", "No bookings array in response")
    else:
        results.failure("Bookings list retrieval", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_reviews_system():
    """Test review creation"""
    print("\n⭐ Testing Reviews System")
    
    if not test_user_id:
        results.failure("Reviews test", "No authenticated user")
        return False
    
    headers = {'x-user-id': test_user_id}
    
    # Try to create review (should fail - no completed booking)
    review_data = {
        'booking_id': 'test-booking-123',
        'item_id': 'test-item-123',
        'rating': 5,
        'text': 'Отличное оборудование, всё работает идеально!'
    }
    
    response = make_request('POST', '/reviews', review_data, headers)
    if response:
        if response.status_code == 400:
            results.success("Review creation blocked for non-completed booking")
        else:
            results.failure("Review validation", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Review validation", "No response")
    
    return True

def test_admin_endpoints():
    """Test admin/moderator endpoints"""
    global admin_user_id
    
    print("\n👑 Testing Admin Endpoints")
    
    # Create admin user for testing
    admin_phone = "+7900654321"
    
    # 1. Send SMS for admin
    response = make_request('POST', '/auth/send-sms', {'phone': admin_phone})
    if response and response.status_code == 200:
        results.success("Admin SMS send")
    else:
        results.failure("Admin SMS send", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # 2. Verify admin SMS
    # Get the actual SMS code from logs for admin
    try:
        result = subprocess.run(['tail', '-10', '/var/log/supervisor/nextjs.out.log'], 
                              capture_output=True, text=True)
        log_lines = result.stdout.split('\n')
        admin_sms_code = None
        for line in reversed(log_lines):
            if f'SMS код для {admin_phone}:' in line:
                admin_sms_code = line.split(':')[-1].strip()
                break
        if not admin_sms_code:
            admin_sms_code = "123456"  # Fallback
    except:
        admin_sms_code = "123456"  # Fallback
    
    response = make_request('POST', '/auth/verify-sms', {
        'phone': admin_phone,
        'code': admin_sms_code,
        'name': 'Админ Тестов'
    })
    
    if response:
        if response.status_code == 200:
            data = response.json()
            admin_user_id = data['user']['_id']
            results.success("Admin user creation")
        else:
            results.failure("Admin user creation", f"Unexpected status: {response.status_code}")
            return False
    else:
        results.failure("Admin user creation", "No response")
        return False
    
    # Test admin endpoints without proper role (should fail)
    headers = {'x-user-id': admin_user_id}
    
    # 3. Get pending users (should fail - not admin/moderator)
    response = make_request('GET', '/admin/users?status=pending', headers=headers)
    if response:
        if response.status_code == 403:
            results.success("Admin access control for users")
        else:
            results.failure("Admin access control", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Admin access control", "No response")
    
    # 4. Get pending items (should fail - not admin/moderator)
    response = make_request('GET', '/admin/items?status=pending', headers=headers)
    if response:
        if response.status_code == 403:
            results.success("Admin access control for items")
        else:
            results.failure("Admin access control for items", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Admin access control for items", "No response")
    
    # 5. Get stats (should fail - not admin)
    response = make_request('GET', '/admin/stats', headers=headers)
    if response:
        if response.status_code == 403:
            results.success("Admin stats access control")
        else:
            results.failure("Admin stats access control", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Admin stats access control", "No response")
    
    return True

def test_profile_management():
    """Test profile update endpoints"""
    print("\n👤 Testing Profile Management")
    
    if not test_user_id:
        results.failure("Profile test", "No authenticated user")
        return False
    
    headers = {'x-user-id': test_user_id}
    
    # Update profile
    profile_data = {
        'name': 'Алексей Обновленный',
        'role': 'owner'
    }
    
    response = make_request('PATCH', '/profile', profile_data, headers)
    if response and response.status_code == 200:
        results.success("Profile update")
    else:
        results.failure("Profile update", f"Status: {response.status_code if response else 'No response'}")
    
    # Get current user
    response = make_request('GET', '/auth/me', headers=headers)
    if response and response.status_code == 200:
        data = response.json()
        if 'user' in data:
            results.success("Get current user")
        else:
            results.failure("Get current user", "No user data in response")
    else:
        results.failure("Get current user", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_error_handling():
    """Test error handling and edge cases"""
    print("\n🚨 Testing Error Handling")
    
    # 1. Invalid endpoint
    response = make_request('GET', '/invalid-endpoint')
    if response:
        if response.status_code == 404:
            results.success("404 for invalid endpoint")
        else:
            results.failure("404 handling", f"Unexpected status: {response.status_code}")
    else:
        results.failure("404 handling", "No response")
    
    # 2. Missing authentication
    response = make_request('GET', '/bookings')
    if response:
        if response.status_code == 401:
            results.success("401 for missing auth")
        else:
            results.failure("Auth validation", f"Unexpected status: {response.status_code}")
    else:
        results.failure("Auth validation", "No response")
    
    # 3. Invalid SMS code
    response = make_request('POST', '/auth/verify-sms', {
        'phone': '+7900999999',  # Different phone to avoid conflicts
        'code': '000000'
    })
    if response:
        if response.status_code == 400:
            results.success("Invalid SMS code handling")
        else:
            results.failure("SMS code validation", f"Unexpected status: {response.status_code}")
    else:
        results.failure("SMS code validation", "No response")
    
    return True

def main():
    """Run all tests"""
    print("🚀 Starting Backend API Tests for Аренда PRO Platform")
    print("=" * 60)
    
    try:
        # Run test suites
        test_auth_flow()
        test_items_management()
        test_booking_flow()
        test_reviews_system()
        test_admin_endpoints()
        test_profile_management()
        test_error_handling()
        
    except Exception as e:
        results.failure("Test execution", str(e))
    
    # Print summary
    results.summary()
    
    # Return exit code
    return 0 if results.failed == 0 else 1

if __name__ == "__main__":
    exit(main())