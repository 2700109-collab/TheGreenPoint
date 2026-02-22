import { message, notification } from 'antd';

export function configureNotifications(): void {
  message.config({
    top: 100,
    duration: 4,
    maxCount: 3,
  });

  notification.config({
    placement: 'topRight',
    top: 100,
    duration: 0,
    maxCount: 5,
  });
}
