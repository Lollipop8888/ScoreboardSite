"""
Push notification utilities for sending web push notifications
"""
import json
import os
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
import models

# VAPID keys - in production, these should be environment variables
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '''-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgjdnaDzBPr5+RH2mX
yMF70BLGiJsOQDJXHyZLvi+3gTGhRANCAAT7QnTeNA/SMStvAMDl9+AQdxcVmFle
ihekTsnKt4Lu4HXL7mPx1FsPTjtpLlZK4J5QjNNLVEeakMogiJxIK3ZS
-----END PRIVATE KEY-----''')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', 'BPtCdN40D9IxK28AwOX34BB3FxWYWV6KF6ROycq3gu7gdcvuY_HUWw9OO2kuVkrgnlCM00tUR5qQyiCInEgrdlI')
VAPID_CLAIMS = {
    "sub": "mailto:admin@scoreboard.local"
}


def send_push_notification(subscription_info: dict, title: str, body: str, data: dict = None):
    """Send a push notification to a single subscription"""
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
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
    except WebPushException as e:
        print(f"Push notification failed: {e}")
        # If subscription is invalid, return False so caller can clean up
        if e.response and e.response.status_code in [404, 410]:
            return False
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
