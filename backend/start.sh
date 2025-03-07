#!/bin/bash

# Kill any existing gunicorn processes
pkill gunicorn || true

# Add diagnostic for migrations environment
echo "===== MIGRATION SYSTEM DIAGNOSTIC ====="
echo "Checking migrations folder structure..."
if [ -d "migrations" ]; then
  echo "✓ Migrations folder exists"
  if [ -f "migrations/env.py" ]; then
    echo "✓ env.py exists"
    echo "Contents of env.py line 53-55:"
    sed -n '53,55p' migrations/env.py
  else
    echo "✗ env.py missing"
  fi
  if [ -d "migrations/versions" ]; then
    echo "✓ Versions folder exists"
    echo "Migration versions:"
    ls -la migrations/versions
  else
    echo "✗ Versions folder missing"
  fi
else
  echo "✗ Migrations folder missing"
fi
echo "======================================="

# Set environment variables
export FLASK_APP=run.py
export FLASK_ENV=development

# Define text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Database Migration System =====${NC}"

# First, check and fix migrations environment using our dedicated script
echo -e "${BLUE}Checking and fixing migrations environment...${NC}"
python3 fix_migrations.py
if [ $? -ne 0 ]; then
    echo -e "${RED}Error fixing migrations environment. Will continue with database setup only.${NC}"
    echo -e "${BLUE}Setting up database directly...${NC}"
    python3 setup_db.py
    echo -e "${GREEN}Starting server...${NC}"
    gunicorn --bind 0.0.0.0:5000 run:app --reload
    exit 0
fi

# Check for timestamp compatibility issues
echo -e "${BLUE}Checking for timestamp compatibility issues...${NC}"
if [ -f "fix_timestamps.py" ]; then
    python3 fix_timestamps.py
    
    # If in interactive mode and timestamp issues were found, ask if user wants to fix them
    if [ $? -ne 0 ] && [ -t 0 ]; then
        read -p "Do you want to fix timestamp compatibility issues? (y/n): " FIX_TIMESTAMPS
        if [[ $FIX_TIMESTAMPS =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Fixing timestamp compatibility issues...${NC}"
            python3 fix_timestamps.py --fix
        else
            echo -e "${YELLOW}Skipping timestamp fixes. Note that migrations may report type changes.${NC}"
        fi
    fi
else
    echo -e "${YELLOW}fix_timestamps.py not found. Skipping timestamp compatibility check.${NC}"
fi

# Detect model changes
echo -e "${BLUE}Checking for model changes...${NC}"
python3 -c "from setup_db import detect_model_changes; changes_detected = detect_model_changes(); exit(0 if changes_detected else 1)" 2>/tmp/model_changes_error.log || {
    # Check if there was an error by examining the error log
    if [ -s /tmp/model_changes_error.log ]; then
        echo -e "${RED}Error occurred during model changes detection:${NC}"
        cat /tmp/model_changes_error.log
        echo -e "${YELLOW}Attempting to fix the issue by running setup_db.py...${NC}"
        python3 setup_db.py
        
        # Try to detect model changes again
        echo -e "${BLUE}Checking for model changes again...${NC}"
        python3 -c "from setup_db import detect_model_changes; changes_detected = detect_model_changes(); exit(0 if changes_detected else 1)" 2>/tmp/model_changes_error_retry.log || {
            # If we still have an error, just continue
            if [ -s /tmp/model_changes_error_retry.log ]; then
                echo -e "${RED}Still having issues detecting model changes. Continuing without migration.${NC}"
            else
                echo -e "${GREEN}No model changes detected that require migration.${NC}"
            fi
            # Skip to database setup
            echo -e "${BLUE}Setting up database...${NC}"
            python3 setup_db.py
            echo -e "${GREEN}Starting server...${NC}"
            gunicorn --bind 0.0.0.0:5000 run:app --reload
            exit 0
        }
    else
        echo -e "${GREEN}No model changes detected that require migration.${NC}"
        # Skip to database setup
        echo -e "${BLUE}Setting up database...${NC}"
        python3 setup_db.py
        echo -e "${GREEN}Starting server...${NC}"
        gunicorn --bind 0.0.0.0:5000 run:app --reload
        exit 0
    fi
}

# If we get here, changes were detected
echo -e "${YELLOW}Model changes detected!${NC}"

# Create automatic backup first
echo -e "${BLUE}Creating database backup before proceeding...${NC}"
BACKUP_FILE=$(python3 -c "from setup_db import backup_database; backup = backup_database(); print(backup if backup else '')")

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Failed to create backup. Aborting for safety.${NC}"
    exit 1
else
    echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
fi

# Interactive vs. Non-interactive mode
if [ -t 0 ]; then
    # Terminal is interactive, ask for confirmation
    echo -e "${YELLOW}Do you want to generate and apply a migration? This might modify your database schema.${NC}"
    read -p "Generate migration? (y/n): " GEN_MIGRATION
    
    if [[ $GEN_MIGRATION =~ ^[Yy]$ ]]; then
        # Create the migration
        echo -e "${BLUE}Creating migration...${NC}"
        python3 -c "from setup_db import create_migration; create_migration()" || {
            echo -e "${RED}Failed to create migration. You may need to reset the migrations system.${NC}"
            echo -e "${YELLOW}Try running: python3 manage_db.py reset-migrations${NC}"
            # Continue to database setup anyway
            echo -e "${BLUE}Setting up database...${NC}"
            python3 setup_db.py
            echo -e "${GREEN}Starting server...${NC}"
            gunicorn --bind 0.0.0.0:5000 run:app --reload
            exit 0
        }
        
        # Ask for confirmation to apply the migration
        echo -e "${YELLOW}Do you want to apply this migration now?${NC}"
        read -p "Apply migration? (y/n): " APPLY_MIGRATION
        
        if [[ $APPLY_MIGRATION =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Applying migration...${NC}"
            python3 -c "from setup_db import safe_upgrade; safe_upgrade()" || {
                echo -e "${RED}Migration failed. Please check the logs and restore from backup if needed.${NC}"
                echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
                echo -e "${YELLOW}You can restore with: python3 manage_db.py restore $BACKUP_FILE${NC}"
                # Ask if they want to continue with setup anyway
                read -p "Continue with database setup anyway? (y/n): " CONTINUE
                if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
                    echo -e "${RED}Exiting...${NC}"
                    exit 1
                fi
            }
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Migration applied successfully.${NC}"
            fi
        else
            echo -e "${YELLOW}Migration not applied. You can apply it later with:${NC}"
            echo -e "${YELLOW}python3 manage_db.py migrate${NC}"
        fi
    else
        echo -e "${YELLOW}Migration not generated. You can generate it later with:${NC}"
        echo -e "${YELLOW}python3 manage_db.py migrate${NC}"
    fi
else
    # Non-interactive mode (e.g. CI/CD pipeline)
    echo -e "${BLUE}Running in non-interactive mode.${NC}"
    
    # Check if we're allowed to proceed with automatic migration
    if [ "$AUTO_MIGRATE" = "true" ]; then
        echo -e "${YELLOW}AUTO_MIGRATE=true, proceeding with automatic migration.${NC}"
        python3 -c "from setup_db import create_migration, safe_upgrade; create_migration() and safe_upgrade()" || {
            echo -e "${RED}Migration failed. Review the logs and restore from backup if needed.${NC}"
            echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
            # In non-interactive mode, continue with setup anyway
            echo -e "${YELLOW}Continuing with setup anyway in non-interactive mode.${NC}"
        }
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Migration applied successfully.${NC}"
        fi
    else
        echo -e "${YELLOW}AUTO_MIGRATE not set to 'true'. Skipping automatic migration.${NC}"
        echo -e "${YELLOW}To enable automatic migration, set AUTO_MIGRATE=true environment variable.${NC}"
    fi
fi

# Set up the database (creates any missing tables through SQLAlchemy directly)
echo -e "${BLUE}Setting up database...${NC}"
python3 setup_db.py || {
    echo -e "${RED}Database setup failed. Attempting to restore from backup...${NC}"
    if [ -n "$BACKUP_FILE" ]; then
        python3 -c "from setup_db import restore_database; restore_database('$BACKUP_FILE')"
        echo -e "${YELLOW}Restored from backup: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}No backup available for restore!${NC}"
    fi
    exit 1
}

# Start gunicorn
echo -e "${GREEN}Starting server...${NC}"
gunicorn --bind 0.0.0.0:5000 run:app --reload 