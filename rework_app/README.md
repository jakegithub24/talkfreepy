Rework of talkfreepy: project structure and guidance

This folder contains a restructured version of the application with clearer separation of concerns and a modern UI/UX scaffold.

Structure
- rework_app/
  - app/
    - __init__.py        # Creates the Flask app and loads extensions
    - auth.py            # Authentication helpers and login manager
    - conn.py            # DB and socket initialization
    - models.py          # SQLAlchemy models
    - routes.py          # Blueprints and API routes
    - middlewares.py     # Request/response middlewares
  - static/
    - css/
    - js/
    - assets/
  - templates/
    - base.html
    - landing.html
    - dashboard.html
  - run.py              # entrypoint to run the app

Notes
- This is a scaffold—copy business logic from the original app into the respective modules and test incrementally.
- For production, add Flask-Migrate (Alembic) and set real secrets via environment variables.
