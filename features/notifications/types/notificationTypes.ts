import * as Notifications from 'expo-notifications';

export interface PushTokenState {
  token: string | null;
  error: string | null;
  permissionGranted: boolean;
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type NotificationResponse = Notifications.NotificationResponse;
export type NotificationObject = Notifications.Notification;
