import { StyleSheet } from 'react-native';

export const notificationStyles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#94A3B8',
  },
});
