import logging
from flask import render_template, jsonify
from flask_login import current_user
from app.home import home

logger = logging.getLogger(__name__)


@home.route('/', methods=['GET'])
def show_login_dialog():
    return render_template('show_login_dialog.html')


@home.route('/index')
def index():
    return render_template('index.html')


@home.route('/exceed/limit')
def limit_exceed():
    return jsonify({"status": "error", "message": "Limit Exceeded."}), 401