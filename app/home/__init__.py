from flask import Blueprint


home = Blueprint(
    'home',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/home/static'
)

from . import routes
from . import api
from . import ai_api