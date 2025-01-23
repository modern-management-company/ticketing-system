import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash
from app import app, db
from app.models import User

@app.cli.command("create-admin")
@with_appcontext
def create_admin():
    """Create a super admin user"""
    username = click.prompt('Enter admin username', type=str)
    password = click.prompt('Enter admin password', type=str, hide_input=True)
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        click.echo('User already exists!')
        return

    user = User(
        username=username,
        password=generate_password_hash(password),
        role='super_admin'
    )
    
    db.session.add(user)
    db.session.commit()
    click.echo('Super admin created successfully!') 