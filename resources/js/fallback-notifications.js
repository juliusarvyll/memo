/**
 * Simple fallback notification system when FCM fails
 */
const LOCAL_STORAGE_KEY = 'notification_preference';

// Check if notifications are supported
const notificationsSupported = () => {
  return 'Notification' in window;
};

// Request permission for notifications
const requestPermission = async () => {
  if (!notificationsSupported()) {
    console.error('Notifications not supported in this browser');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(LOCAL_STORAGE_KEY, permission);
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Check if permission is granted
const permissionGranted = () => {
  return Notification.permission === 'granted' ||
         localStorage.getItem(LOCAL_STORAGE_KEY) === 'granted';
};

// Show a notification
const showNotification = (title, options = {}) => {
  if (!permissionGranted()) {
    console.error('Notification permission not granted');
    return false;
  }

  try {
    const notification = new Notification(title, {
      icon: '/images/logo.png',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

export {
  notificationsSupported,
  requestPermission,
  permissionGranted,
  showNotification
};
