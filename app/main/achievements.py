import logging
from flask import jsonify, request, redirect, render_template, url_for, flash
from flask_login import login_required, current_user
from app.main import main

logger = logging.getLogger(__name__)


@main.route('/achievements', methods=['GET'])
@login_required
def achievements():
    return render_template('achievements.html', user=current_user)