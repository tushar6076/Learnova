from flask import Blueprint

# Define the 'auth' blueprint. All routes in routes.py will be prefixed with /auth
auth = Blueprint(
    'auth', 
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import routes