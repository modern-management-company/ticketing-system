import pytest
from app.models import Property, Room
from tests.utils import assert_response_status, assert_error_response, get_auth_headers

def test_create_property(test_client, test_admin):
    """Test creating a new property."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    property_data = {
        'name': 'New Hotel',
        'address': '456 New St, New City',
        'type': 'hotel'
    }

    response = test_client.post(
        '/properties',
        json=property_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 201)
    data = response.get_json()
    assert data['name'] == property_data['name']
    assert data['address'] == property_data['address']
    assert data['type'] == property_data['type']

def test_get_properties(test_client, test_admin, test_property):
    """Test getting all properties."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.get('/properties', headers=get_auth_headers(admin_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'properties' in data
    assert len(data['properties']) >= 1  # Should have at least our test property

def test_get_property_by_id(test_client, test_admin, test_property):
    """Test getting a specific property."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.get(
        f'/properties/{test_property.property_id}',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['name'] == test_property.name
    assert data['address'] == test_property.address
    assert data['type'] == test_property.type

def test_update_property(test_client, test_admin, test_property):
    """Test updating a property."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    update_data = {
        'name': 'Updated Hotel',
        'address': '789 Updated St, Updated City',
        'type': 'resort'
    }

    response = test_client.put(
        f'/properties/{test_property.property_id}',
        json=update_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['name'] == update_data['name']
    assert data['address'] == update_data['address']
    assert data['type'] == update_data['type']

def test_delete_property(test_client, test_admin, test_db):
    """Test deleting a property."""
    # Create a property to delete
    property_to_delete = Property(
        name='Delete Me',
        address='123 Delete St, Delete City',
        type='hotel'
    )
    test_db.session.add(property_to_delete)
    test_db.session.commit()

    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.delete(
        f'/properties/{property_to_delete.property_id}',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'Property deleted successfully'

    # Verify property was deleted
    deleted_property = Property.query.get(property_to_delete.property_id)
    assert deleted_property is None

def test_create_room(test_client, test_admin, test_property):
    """Test creating a new room."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    room_data = {
        'name': 'Room 102',
        'property_id': test_property.property_id,
        'type': 'deluxe',
        'floor': 2
    }

    response = test_client.post(
        '/rooms',
        json=room_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 201)
    data = response.get_json()
    assert data['name'] == room_data['name']
    assert data['property_id'] == room_data['property_id']
    assert data['type'] == room_data['type']
    assert data['floor'] == room_data['floor']

def test_get_rooms(test_client, test_admin, test_property, test_room):
    """Test getting all rooms."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.get('/rooms', headers=get_auth_headers(admin_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'rooms' in data
    assert len(data['rooms']) >= 1  # Should have at least our test room

def test_get_rooms_by_property(test_client, test_admin, test_property, test_room):
    """Test getting rooms by property."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.get(
        f'/properties/{test_property.property_id}/rooms',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'rooms' in data
    assert len(data['rooms']) >= 1  # Should have at least our test room
    assert data['rooms'][0]['property_id'] == test_property.property_id

def test_update_room(test_client, test_admin, test_room):
    """Test updating a room."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    update_data = {
        'name': 'Updated Room',
        'type': 'suite',
        'floor': 3
    }

    response = test_client.put(
        f'/rooms/{test_room.room_id}',
        json=update_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['name'] == update_data['name']
    assert data['type'] == update_data['type']
    assert data['floor'] == update_data['floor']

def test_delete_room(test_client, test_admin, test_db, test_property):
    """Test deleting a room."""
    # Create a room to delete
    room_to_delete = Room(
        name='Delete Me',
        property_id=test_property.property_id,
        type='standard',
        floor=1
    )
    test_db.session.add(room_to_delete)
    test_db.session.commit()

    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.delete(
        f'/rooms/{room_to_delete.room_id}',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'Room deleted successfully'

    # Verify room was deleted
    deleted_room = Room.query.get(room_to_delete.room_id)
    assert deleted_room is None 