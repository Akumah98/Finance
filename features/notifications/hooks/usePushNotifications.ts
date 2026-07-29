import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  fetchExpoPushToken,
  setupAndroidChannel,
} from '../services/notificationService';
import { PushTokenState } from '../types/notificationTypes';

export function usePushNotifications() {
  const [tokenState, setTokenState] = useState<PushTokenState>({
    token: null,
    error: null,
    permissionGranted: false,
  });

  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    setupAndroidChannel();

    fetchExpoPushToken()
      .then((token) => {
        if (token) {
          setTokenState({ token, error: null, permissionGranted: true });
        } else {
          setTokenState((prev) => ({ ...prev, permissionGranted: false }));
        }
      })
      .catch((err: Error) => {
        setTokenState({ token: null, error: err.message, permissionGranted: false });
      });

    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setNotification(notif);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((_res) => {
      // Handle notification click navigation here if needed
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return {
    pushToken: tokenState.token,
    error: tokenState.error,
    permissionGranted: tokenState.permissionGranted,
    notification,
  };
}
