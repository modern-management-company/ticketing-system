#!/usr/bin/env python3
"""
Fix Migration Environment Script

This script fixes common issues with the Alembic migrations environment.
It ensures the migrations folder exists and contains properly formatted files.
"""

import os
import sys
import shutil
from pathlib import Path

def ensure_migrations_dir():
    """Create migrations directory if it doesn't exist"""
    migrations_dir = Path("migrations")
    if not migrations_dir.exists():
        print("Creating migrations directory...")
        migrations_dir.mkdir(exist_ok=True)
        versions_dir = migrations_dir / "versions"
        versions_dir.mkdir(exist_ok=True)
        return True
    return False

def create_correct_env_py():
    """Create a correct env.py file"""
    env_content = """from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from flask import current_app

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app import app
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyManager, EmailSettings, SMSSettings
target_metadata = app.extensions['sqlalchemy'].db.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    \"\"\"Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    \"\"\"
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    \"\"\"Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    \"\"\"
    # Set SQLAlchemy URL from Flask app configuration
    with app.app_context():
        config.set_main_option('sqlalchemy.url', app.config.get('SQLALCHEMY_DATABASE_URI'))
    
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,   # Enable type comparison for migrations
            compare_server_default=True  # Check for default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
"""
    migrations_dir = Path("migrations")
    env_file = migrations_dir / "env.py"
    
    # Backup existing file if it exists
    if env_file.exists():
        backup_file = migrations_dir / "env.py.bak"
        print(f"Backing up existing env.py to {backup_file}")
        shutil.copy2(env_file, backup_file)
    
    # Write the correct file
    print("Creating correct env.py file...")
    with open(env_file, 'w') as f:
        f.write(env_content)
    return True

def create_alembic_ini():
    """Create a correct alembic.ini file"""
    alembic_content = """# A generic, single database configuration.

[alembic]
# path to migration scripts
script_location = migrations

# template used to generate migration files
# file_template = %%(rev)s_%%(slug)s

# sys.path path, will be prepended to sys.path if present.
# defaults to the current working directory.
prepend_sys_path = .

# timezone to use when rendering the date within the migration file
# as well as the filename.
# If specified, requires the python-dateutil library that can be
# installed by adding `alembic[tz]` to the pip requirements
# string value is passed to dateutil.tz.gettz()
# leave blank for localtime
# timezone =

# max length of characters to apply to the
# "slug" field
# truncate_slug_length = 40

# set to 'true' to run the environment during
# the 'revision' command, regardless of autogenerate
# revision_environment = false

# set to 'true' to allow .pyc and .pyo files without
# a source .py file to be detected as revisions in the
# versions/ directory
# sourceless = false

# version location specification; This defaults
# to migrations/versions.  When using multiple version
# directories, initial revisions must be specified with --version-path.
# The path separator used here should be the separator specified by "version_path_separator" below.
# version_locations = %(here)s/bar:%(here)s/bat:migrations/versions

# version path separator; As mentioned above, this is the character used to split
# version_locations. The default within new alembic.ini files is "os", which uses os.pathsep.
# If this key is omitted entirely, it falls back to the legacy behavior of splitting on spaces and/or commas.
# Valid values for version_path_separator are:
#
# version_path_separator = :
# version_path_separator = ;
# version_path_separator = space
version_path_separator = os  # Use os.pathsep. Default configuration used for new projects.

# set to 'true' to search source files recursively
# in each "version_locations" directory
# new in Alembic version 1.10
# recursive_version_locations = false

# the output encoding used when revision files
# are written from script.py.mako
# output_encoding = utf-8

sqlalchemy.url = driver://user:pass@localhost/dbname


[post_write_hooks]
# post_write_hooks defines scripts or Python functions that are run
# on newly generated revision scripts.  See the documentation for further
# detail and examples

# format using "black" - use the console_scripts runner, against the "black" entrypoint
# hooks = black
# black.type = console_scripts
# black.entrypoint = black
# black.options = -l 79 REVISION_SCRIPT_FILENAME

# Logging configuration
[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
"""
    migrations_dir = Path("migrations")
    alembic_file = migrations_dir / "alembic.ini"
    
    # Backup existing file if it exists
    if alembic_file.exists():
        backup_file = migrations_dir / "alembic.ini.bak"
        print(f"Backing up existing alembic.ini to {backup_file}")
        shutil.copy2(alembic_file, backup_file)
    
    # Write the correct file
    print("Creating correct alembic.ini file...")
    with open(alembic_file, 'w') as f:
        f.write(alembic_content)
    return True

def create_script_py_mako():
    """Create a correct script.py.mako file"""
    script_content = """\"\"\"${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

\"\"\"
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
"""
    migrations_dir = Path("migrations")
    script_file = migrations_dir / "script.py.mako"
    
    # Backup existing file if it exists
    if script_file.exists():
        backup_file = migrations_dir / "script.py.mako.bak"
        print(f"Backing up existing script.py.mako to {backup_file}")
        shutil.copy2(script_file, backup_file)
    
    # Write the correct file
    print("Creating correct script.py.mako file...")
    with open(script_file, 'w') as f:
        f.write(script_content)
    return True

def fix_migrations_environment():
    """Fix the entire migrations environment"""
    created_dir = ensure_migrations_dir()
    fixed_env = create_correct_env_py()
    fixed_alembic = create_alembic_ini()
    fixed_script = create_script_py_mako()
    
    if created_dir or fixed_env or fixed_alembic or fixed_script:
        print("\n✅ Migrations environment has been fixed!")
    else:
        print("\n✓ Migrations environment already correctly set up.")
    
    return True

if __name__ == "__main__":
    print("🔧 Fixing Alembic Migrations Environment 🔧")
    try:
        if fix_migrations_environment():
            print("Migration environment ready for use.")
            sys.exit(0)
        else:
            print("Failed to fix migration environment.")
            sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1) 