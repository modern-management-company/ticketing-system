from app import app, db

if __name__ == '__main__':
    with app.app_context():
        db.drop_all()
        print("Creating all tables...")
        db.create_all()  # Create all tables at startup
    app.run(debug=True)
