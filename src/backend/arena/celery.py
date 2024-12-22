"""
Celery configuration for Arena MVP platform.

This module configures the Celery task queue for handling asynchronous operations including:
- AI-powered requirement parsing
- Proposal processing
- Document handling
- Email notifications

Version: 1.0.0
"""

from os import environ
from celery import Celery  # v5.3+
from celery.signals import worker_ready
from django.apps import apps

# Create the Celery application instance
app = Celery('arena', 
             broker=environ.get('BROKER_URL', 'redis://localhost:6379/0'),
             backend='django-db')

# Configure Celery using Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Task serialization settings
app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']

# Timezone configuration
app.conf.enable_utc = True
app.conf.timezone = 'UTC'

# Task execution settings
app.conf.task_soft_time_limit = 300  # 5 minutes
app.conf.task_time_limit = 600  # 10 minutes
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1
app.conf.worker_max_tasks_per_child = 1000

# Queue configuration
app.conf.task_default_queue = 'default'
app.conf.task_queues = {
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
        'queue_arguments': {'x-max-priority': 10}
    },
    'ai_processing': {
        'exchange': 'ai_processing',
        'routing_key': 'ai_processing',
        'queue_arguments': {'x-max-priority': 10}
    },
    'proposals': {
        'exchange': 'proposals',
        'routing_key': 'proposals',
        'queue_arguments': {'x-max-priority': 5}
    },
    'notifications': {
        'exchange': 'notifications',
        'routing_key': 'notifications',
        'queue_arguments': {'x-max-priority': 3}
    }
}

# Task routing configuration
app.conf.task_routes = {
    'requests.tasks.*': {'queue': 'ai_processing'},
    'proposals.tasks.*': {'queue': 'proposals'},
    'notifications.*': {'queue': 'notifications'}
}

# Broker settings
app.conf.broker_transport_options = {
    'visibility_timeout': 3600,  # 1 hour
    'max_retries': 3,
    'interval_start': 0,
    'interval_step': 0.2,
    'interval_max': 0.5
}

# Task retry settings
app.conf.task_annotations = {
    '*': {
        'rate_limit': '100/s',
        'acks_late': True,
        'reject_on_worker_lost': True,
        'retry_backoff': True,
        'retry_backoff_max': 600,  # 10 minutes
        'retry_jitter': True
    }
}

# Performance monitoring settings
app.conf.worker_send_task_events = True
app.conf.task_send_sent_event = True
app.conf.task_track_started = True

@worker_ready.connect
def configure_worker(sender, **kwargs):
    """
    Configure worker settings when the worker starts up.
    Ensures consistent worker configuration across deployments.
    """
    sender.app.conf.worker_prefetch_multiplier = 1
    sender.app.conf.worker_max_memory_per_child = 400000  # 400MB
    sender.app.conf.worker_proc_alive_timeout = 60.0

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks(lambda: [app_config.name for app_config in apps.get_app_configs()])

# Export the Celery app instance
__all__ = ['app']