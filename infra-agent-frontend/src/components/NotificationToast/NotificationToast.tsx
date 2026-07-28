"use client";

import { useEffect } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { removeNotification } from "@/features/notifications/notificationsSlice";
import { selectNotifications } from "@/features/notifications/notificationsSelectors";
import type { Notification } from "@/features/notifications/notificationsSlice";
import styles from "./NotificationToast.module.css";

const TYPE_CLASS: Record<Notification["type"], string> = {
  success: styles.success,
  error: styles.error,
  warning: styles.warning,
  info: styles.info,
};

function iconFor(type: Notification["type"]) {
  switch (type) {
    case "success":
      return <CheckCircle size={20} color="var(--success)" />;
    case "error":
      return <AlertCircle size={20} color="var(--destructive)" />;
    case "warning":
      return <AlertTriangle size={20} color="var(--warning)" />;
    default:
      return <Info size={20} color="var(--primary)" />;
  }
}

export function NotificationToast() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);

  useEffect(() => {
    const timers = notifications
      .filter((notification) => notification.duration && notification.duration > 0)
      .map((notification) =>
        setTimeout(() => dispatch(removeNotification(notification.id)), notification.duration),
      );

    return () => timers.forEach(clearTimeout);
  }, [notifications, dispatch]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {notifications.map((notification) => (
        <div key={notification.id} className={`${styles.toast} ${TYPE_CLASS[notification.type]}`}>
          <div className={styles.content}>
            <div className={styles.icon}>{iconFor(notification.type)}</div>
            <div className={styles.text}>
              <div className={styles.title}>{notification.title}</div>
              {notification.message && <div className={styles.message}>{notification.message}</div>}
            </div>
            <button
              type="button"
              onClick={() => dispatch(removeNotification(notification.id))}
              aria-label="Dismiss notification"
              className={styles.closeButton}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
