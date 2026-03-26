import redis
import re
from flask import Flask, request, jsonify, flash, redirect, url_for

# Importing extensions
from .extensions import db, login_manager, limiter, mail, executor, migrate

def youtube_embed_url(url):
    """Converts YouTube URLs to embed format for Jinja filter."""
    if not url: return ""
    yt_id_match = re.search(r'(?:v=|\/|embed\/|youtu.be\/)([0-9A-Za-z_-]{11})', url)
    if yt_id_match:
        video_id = yt_id_match.group(1)
        return f"https://www.youtube.com/embed/{video_id}"
    return url

def create_app(config_name='default'):
    app = Flask(__name__)

    # 1. Load Configuration
    from config import config, Config
    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)
    Config.init_app(app)

    # 2. Initialize Extensions
    # Priority: Limiter needs Redis URI from config
    app.config.setdefault('RATELIMIT_STORAGE_URI', app.config.get('REDIS_URL', 'memory://'))
    
    db.init_app(app)
    mail.init_app(app)
    executor.init_app(app)
    limiter.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db) # Added migrate initialization

    # 3. Configure Auth Security
    login_manager.session_protection = "strong"
    login_manager.login_view = 'home.show_login_dialog'
    login_manager.login_message_category = "info"

    # 4. Redis Connection with Fallback
    try:
        _redis_client = redis.from_url(app.config['REDIS_URL'], decode_responses=True)
        _redis_client.ping()
        app.redis = _redis_client
    except Exception as e:
        import fakeredis
        app.logger.warning(f"Redis failed ({e}). Using fakeredis.")
        app.redis = fakeredis.FakeRedis(decode_responses=True)

    # 5. Register Jinja Filters
    app.jinja_env.filters['embed'] = youtube_embed_url
    
    # 6. Register Blueprints
    from .home import home
    from .main import main
    from .auth import auth
    from .learning import learn
    from .admin import admin

    app.register_blueprint(admin, url_prefix='/admin')
    app.register_blueprint(home, url_prefix='/')
    app.register_blueprint(main, url_prefix='/main')
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(learn, url_prefix='/learn')

    # 7. App Context Tasks (Database & Error Handlers)
    with app.app_context():
        # Avoid running db.create_all() in production if using Migrations
        if config_name == 'development':
            from . import models
            db.create_all()

        # Rate Limit Error Handler (Inside context to use url_for)
        from flask_limiter import RateLimitExceeded
        @app.errorhandler(RateLimitExceeded)
        def handle_ratelimit_error(e):
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": "Too many requests."}), 429
            flash("You're moving too fast!", "danger")
            return redirect(url_for('home.limit_exceed'))

    # 8. User Loader for Login Manager
    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User
        return User.query.get(user_id)

    return app