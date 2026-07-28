"use client";

/**
 * ProfileAvatar
 *
 * Displays the signed-in user's avatar with a dropdown menu (profile
 * summary + sign out). Positioned per the `position` prop — typically fixed
 * to the top-right corner of an authenticated shell.
 *
 * Note: the Vite source also opens `SecuritySettings`/`UserDataModal` dialogs
 * from this menu (`components/auth/*`). Those are a Phase 13 surface not yet
 * ported, so those two menu entries are omitted here — re-add them once
 * `components/auth/SecuritySettings` and `UserDataModal` land.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/features/auth/authApi";
import {
  selectIsAuthenticated,
  selectOrganization,
  selectUser,
} from "@/features/auth/authSelectors";
import { useAppSelector } from "@/hooks/useAppSelector";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/utils/userInitials";
import { InitialsAvatar } from "@/components/InitialsAvatar/InitialsAvatar";
import styles from "./ProfileAvatar.module.css";
import type { ProfileAvatarProps } from "./ProfileAvatar.types";

/** Absolutely/fixed-positioned user menu: avatar button + dropdown (profile summary, sign out). */
export function ProfileAvatar({ position = "fixed", className = "" }: ProfileAvatarProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const organization = useAppSelector(selectOrganization);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = getUserInitials(user.name, user.email);
  const displayName = user.name || user.email || "User";
  const orgName = organization?.display_name || organization?.name || null;
  const inlineAvatarClass = position === "inline" ? styles.inlineAvatar : "";

  const positionClass =
    position === "fixed" ? styles.fixed : position === "inline" ? styles.inline : styles.absolute;

  return (
    <div ref={dropdownRef} className={cn(styles.container, positionClass, className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.button}
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="profile-avatar-menu"
      >
        <InitialsAvatar
          initials={initials}
          size="sm"
          alt={displayName}
          className={inlineAvatarClass}
        />
        <ChevronDown
          className={cn(styles.chevron, isOpen && styles.chevronOpen)}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id="profile-avatar-menu"
          className={styles.dropdown}
          role="menu"
          aria-label="User menu"
        >
          <div className={styles.dropdownHeader}>
            <InitialsAvatar initials={initials} size="md" alt={displayName} />
            <div className={styles.dropdownInfo}>
              <span className={styles.dropdownName}>{displayName}</span>
              {user.email && <span className={styles.dropdownEmail}>{user.email}</span>}
              {orgName && <span className={styles.dropdownOrg}>{orgName}</span>}
            </div>
          </div>

          <div className={styles.dropdownDivider} />

          <div className={styles.dropdownMenu}>
            <button
              type="button"
              role="menuitem"
              className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
            >
              <LogOut className={styles.dropdownItemIcon} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileAvatar;
