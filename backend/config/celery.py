"""
Celery Configuration for Mortgage Underwriting System
Handles background task processing for agent workflows
"""
import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('mortgage_underwriter')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Task routing
app.conf.task_routes = {
    'applications.underwriting.tasks.*': {'queue': 'underwriting'},
    'applications.agents.tasks.*': {'queue': 'agents'},
    'applications.compliance.tasks.*': {'queue': 'compliance'},
}

# Task priority
app.conf.task_default_priority = 5
app.conf.task_queue_max_priority = 10

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
