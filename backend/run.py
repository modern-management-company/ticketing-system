from app import app, db
from flask.cli import with_appcontext
import click

@click.command("init-db")
@with_appcontext
def init_db():
    db.create_all()
    print("Database initialized.")

# Register the command
app.cli.add_command(init_db)