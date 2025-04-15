import factory
from faker import Faker
from app.models import User, Property, Room, Ticket, Task
from datetime import datetime, timedelta

fake = Faker()

class UserFactory(factory.Factory):
    class Meta:
        model = User

    username = factory.Faker('user_name')
    email = factory.Faker('email')
    password = factory.Faker('password')
    role = factory.Faker('random_element', elements=['user', 'manager', 'super_admin'])
    group = factory.Faker('random_element', elements=['Engineering', 'Maintenance', 'Housekeeping', 'IT'])

class PropertyFactory(factory.Factory):
    class Meta:
        model = Property

    name = factory.Faker('company')
    address = factory.Faker('address')
    type = factory.Faker('random_element', elements=['hotel', 'resort', 'apartment'])

class RoomFactory(factory.Factory):
    class Meta:
        model = Room

    name = factory.LazyAttribute(lambda x: f'Room {fake.random_int(min=100, max=999)}')
    type = factory.Faker('random_element', elements=['standard', 'deluxe', 'suite'])
    floor = factory.Faker('random_int', min=1, max=10)

class TicketFactory(factory.Factory):
    class Meta:
        model = Ticket

    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('paragraph')
    priority = factory.Faker('random_element', elements=['low', 'medium', 'high'])
    category = factory.Faker('random_element', elements=['maintenance', 'housekeeping', 'it', 'facilities'])
    subcategory = factory.Faker('random_element', elements=['plumbing', 'electrical', 'cleaning', 'network'])
    status = factory.Faker('random_element', elements=['open', 'in_progress', 'resolved', 'closed'])

class TaskFactory(factory.Factory):
    class Meta:
        model = Task

    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('paragraph')
    due_date = factory.LazyAttribute(lambda x: datetime.utcnow() + timedelta(days=fake.random_int(min=1, max=7)))
    status = factory.Faker('random_element', elements=['pending', 'in_progress', 'completed']) 