import pytest
import time
import threading
import queue
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from backend.tests.utils import get_auth_headers

def test_api_response_time(client, init_database):
    """Test API endpoint response times under normal conditions."""
    endpoints = [
        ('GET', '/api/tickets'),
        ('GET', '/api/tasks'),
        ('GET', '/api/properties'),
        ('GET', '/api/users'),
        ('GET', '/api/reports')
    ]
    
    headers = get_auth_headers('admin@test.com')
    results = {}
    
    for method, endpoint in endpoints:
        response_times = []
        for _ in range(10):  # Make 10 requests to each endpoint
            start_time = time.time()
            response = client.open(endpoint, method=method, headers=headers)
            end_time = time.time()
            assert response.status_code == 200
            response_times.append(end_time - start_time)
        
        avg_time = statistics.mean(response_times)
        p95_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
        results[endpoint] = {
            'average': avg_time,
            'p95': p95_time
        }
        
        # Assert reasonable response times
        assert avg_time < 0.5, f"Average response time for {endpoint} too high: {avg_time}s"
        assert p95_time < 1.0, f"P95 response time for {endpoint} too high: {p95_time}s"

def test_concurrent_requests(client, init_database):
    """Test system behavior under concurrent requests."""
    headers = get_auth_headers('admin@test.com')
    num_concurrent = 50
    results_queue = queue.Queue()
    
    def make_request():
        start_time = time.time()
        response = client.get('/api/tickets', headers=headers)
        end_time = time.time()
        results_queue.put({
            'status_code': response.status_code,
            'response_time': end_time - start_time
        })
    
    # Create thread pool and execute concurrent requests
    with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
        futures = [executor.submit(make_request) for _ in range(num_concurrent)]
        for future in as_completed(futures):
            future.result()
    
    # Analyze results
    response_times = []
    status_codes = []
    while not results_queue.empty():
        result = results_queue.get()
        response_times.append(result['response_time'])
        status_codes.append(result['status_code'])
    
    # Assert all requests were successful
    assert all(code == 200 for code in status_codes)
    
    # Assert performance metrics
    avg_time = statistics.mean(response_times)
    p95_time = statistics.quantiles(response_times, n=20)[18]
    assert avg_time < 1.0, f"Average response time under load too high: {avg_time}s"
    assert p95_time < 2.0, f"P95 response time under load too high: {p95_time}s"

def test_database_performance(client, init_database):
    """Test database query performance."""
    headers = get_auth_headers('admin@test.com')
    
    # Test bulk ticket creation
    start_time = time.time()
    tickets = []
    for i in range(100):
        response = client.post('/api/tickets', 
                             json={
                                 'title': f'Performance Test Ticket {i}',
                                 'description': 'Testing database performance',
                                 'priority': 'medium',
                                 'category': 'maintenance',
                                 'property_id': 1,
                                 'room_id': 1
                             },
                             headers=headers)
        assert response.status_code == 201
        tickets.append(response.json['id'])
    end_time = time.time()
    
    bulk_creation_time = end_time - start_time
    assert bulk_creation_time < 10.0, f"Bulk ticket creation too slow: {bulk_creation_time}s"
    
    # Test bulk ticket retrieval
    start_time = time.time()
    response = client.get('/api/tickets', headers=headers)
    end_time = time.time()
    
    bulk_retrieval_time = end_time - start_time
    assert bulk_retrieval_time < 1.0, f"Bulk ticket retrieval too slow: {bulk_retrieval_time}s"
    assert response.status_code == 200
    assert len(response.json) >= 100

def test_file_upload_performance(client, init_database):
    """Test file upload performance with various file sizes."""
    from io import BytesIO
    headers = get_auth_headers('manager@test.com')
    
    file_sizes = [
        (1024, '1KB'),
        (1024 * 1024, '1MB'),
        (5 * 1024 * 1024, '5MB')
    ]
    
    for size, size_label in file_sizes:
        # Create test file of specified size
        file_content = b'0' * size
        file = (BytesIO(file_content), f'test_{size_label}.txt')
        
        start_time = time.time()
        response = client.post('/api/tickets/1/files',
                             data={'file': file},
                             headers=headers,
                             content_type='multipart/form-data')
        end_time = time.time()
        
        upload_time = end_time - start_time
        assert response.status_code == 201
        assert upload_time < size / (1024 * 1024) * 2, f"File upload for {size_label} too slow: {upload_time}s" 