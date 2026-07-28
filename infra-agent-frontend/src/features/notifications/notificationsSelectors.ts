import type { Notification } from "@/features/notifications/notificationsSlice";

interface NotificationsRootState {
  notifications: { notifications: Notification[] };
}

export const selectNotifications = (state: NotificationsRootState) =>
  state.notifications.notifications;
