from flask import Blueprint


learn = Blueprint(
    'learn', 
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import tutorials
from . import quizzes