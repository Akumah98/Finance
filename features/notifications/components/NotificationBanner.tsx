import React from 'react';
import { Text, View } from 'react-native';
import { notificationStyles } from '../styles/notificationStyles';

interface NotificationBannerProps {
  title: string;
  body: string;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ title, body }) => {
  if (!title && !body) {
    return null;
  }

  return (
    <View style={notificationStyles.bannerContainer}>
      <Text style={notificationStyles.titleText}>{title}</Text>
      <Text style={notificationStyles.bodyText}>{body}</Text>
    </View>
  );
};
