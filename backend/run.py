from app import app
import logging
import os
from datetime import datetime

# Configure logging
def setup_run_logging():
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')

    # Set up logging configuration
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(f'logs/server_{datetime.now().strftime("%Y%m%d")}.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_run_logging()

# Drop all tables and recreate them on startup
# with app.app_context():
#     db.drop_all()
#     db.create_all()
#     print("Database reset complete - all tables dropped and recreated")

if __name__ == '__main__':
    try:
        logger.info("="*50)
        logger.info("Starting Flask server...")
        logger.info(f"Environment: {os.environ.get('FLASK_ENV', 'production')}")
        logger.info(f"Debug mode: {app.debug}")
        logger.info(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        logger.info(f"CORS settings: {app.config['CORS_HEADERS']}")
        logger.info("Server configuration:")
        logger.info(f"  - Host: 0.0.0.0")
        logger.info(f"  - Port: 5000")
        logger.info(f"  - Debug: {app.debug}")
        logger.info(f"  - Threaded: True")
        logger.info("="*50)

        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            threaded=True,
            use_reloader=True
        )
    except Exception as e:
        logger.error("Failed to start server")
        logger.error(f"Error: {str(e)}", exc_info=True)
        raise