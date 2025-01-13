from app import app, db

# Drop all tables and recreate them on startup
# with app.app_context():
#     db.drop_all()
#     db.create_all()
#     print("Database reset complete - all tables dropped and recreated")

if __name__ == "__main__":
    app.run()