"""
Push notification utilities for sending web push notifications
"""
import json
import os
from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from sqlalchemy.orm import Session
import models

# VAPID keys. The private key is a secret: it is read from VAPID_PRIVATE_KEY_FILE
# (the Docker image points this at /data/vapid_private.pem) or VAPID_PRIVATE_KEY (PEM).
# The public key must match frontend/src/lib/notifications.js.
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', 'BPmdvQmzKsfRYLqzL-CKmVC1TimdNoTro7zVTVZWJjx9SctszKqByW9_I2przLSI2QchrNsX2Kb4cj0GWO7cZEU')
# Apple's push service rejects a "sub" that isn't a real mailto: or https: URL (403 BadJwtToken)
VAPID_CLAIMS = {
    "sub": os.getenv('VAPID_SUBJECT', 'https://gridironscore.com')
}


def _load_vapid_private_key_pem():
    key_file = os.getenv('VAPID_PRIVATE_KEY_FILE')
    if key_file and os.path.exists(key_file):
        with open(key_file) as f:
            return f.read()
    return os.getenv('VAPID_PRIVATE_KEY')


# Parse PEM once at import time. pywebpush's from_string expects raw DER base64,
# not PEM, so we build a Vapid instance manually and pass it in.
_VAPID_PRIVATE_KEY_PEM = _load_vapid_private_key_pem()
_VAPID_INSTANCE = Vapid.from_pem(_VAPID_PRIVATE_KEY_PEM.encode()) if _VAPID_PRIVATE_KEY_PEM else None
if _VAPID_INSTANCE is None:
    print("[Push] No VAPID private key configured - push notifications are disabled")


def send_push_notification(subscription_info: dict, title: str, body: str, data: dict = None):
    """Send a push notification to a single subscription"""
    if _VAPID_INSTANCE is None:
        return False
    try:
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/logo.png",
            "badge": "/logo.png",
            "data": data or {}
        })

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=_VAPID_INSTANCE,
            vapid_claims=dict(VAPID_CLAIMS),
        )
        return True
    except WebPushException as e:
        print(f"Push notification failed: {e}")
        # If subscription is invalid, return False so caller can clean up
        if e.response and e.response.status_code in [404, 410]:
            return False
        return None
    except Exception as e:
        # Never let notification failures 500 the caller.
        print(f"Push notification error: {type(e).__name__}: {e}")
        return None


def notify_league_followers(db: Session, league_id: str, title: str, body: str, data: dict = None, notification_type: str = None):
    """Send notifications to all users following a league"""
    # Get all follows for this league
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.league_id == league_id
    ).all()
    
    user_ids = set(f.user_id for f in follows if f.user_id)
    
    if not user_ids:
        return 0
    
    # Check notification preferences and get subscriptions
    sent_count = 0
    invalid_endpoints = []
    
    for user_id in user_ids:
        # Check user preferences
        prefs = db.query(models.NotificationPreferences).filter(
            models.NotificationPreferences.user_id == user_id
        ).first()
        
        if prefs:
            if not prefs.notifications_enabled:
                continue
            if notification_type == 'game_start' and not prefs.game_start:
                continue
            if notification_type == 'game_end' and not prefs.game_end:
                continue
            if notification_type == 'score_update' and not prefs.score_updates:
                continue
            if notification_type == 'quarter_end' and not prefs.quarter_end:
                continue
        
        # Get user's push subscriptions
        subscriptions = db.query(models.PushSubscription).filter(
            models.PushSubscription.user_id == user_id
        ).all()
        
        for sub in subscriptions:
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth
                }
            }
            
            result = send_push_notification(subscription_info, title, body, data)
            if result is True:
                sent_count += 1
            elif result is False:
                # Invalid subscription, mark for cleanup
                invalid_endpoints.append(sub.endpoint)
    
    # Clean up invalid subscriptions
    for endpoint in invalid_endpoints:
        db.query(models.PushSubscription).filter(
            models.PushSubscription.endpoint == endpoint
        ).delete()
    
    if invalid_endpoints:
        db.commit()
    
    return sent_count


def notify_game_followers(db: Session, game_id: str, title: str, body: str, data: dict = None, notification_type: str = None):
    """Send notifications to all users following a specific game"""
    # Get all follows for this game
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.game_id == game_id
    ).all()
    
    user_ids = set(f.user_id for f in follows if f.user_id)
    
    if not user_ids:
        return 0
    
    sent_count = 0
    invalid_endpoints = []
    
    for user_id in user_ids:
        # Check user preferences
        prefs = db.query(models.NotificationPreferences).filter(
            models.NotificationPreferences.user_id == user_id
        ).first()
        
        if prefs:
            if not prefs.notifications_enabled:
                continue
            if notification_type == 'game_start' and not prefs.game_start:
                continue
            if notification_type == 'game_end' and not prefs.game_end:
                continue
            if notification_type == 'score_update' and not prefs.score_updates:
                continue
            if notification_type == 'quarter_end' and not prefs.quarter_end:
                continue
        
        subscriptions = db.query(models.PushSubscription).filter(
            models.PushSubscription.user_id == user_id
        ).all()
        
        for sub in subscriptions:
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth
                }
            }
            
            result = send_push_notification(subscription_info, title, body, data)
            if result is True:
                sent_count += 1
            elif result is False:
                invalid_endpoints.append(sub.endpoint)
    
    # Clean up invalid subscriptions
    for endpoint in invalid_endpoints:
        db.query(models.PushSubscription).filter(
            models.PushSubscription.endpoint == endpoint
        ).delete()
    
    if invalid_endpoints:
        db.commit()
    
    return sent_count
