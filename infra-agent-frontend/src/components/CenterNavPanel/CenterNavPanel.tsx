"use client";

/**
 * CenterNavPanel — global floating navigation menu, role-filtered and
 * driven by the shared `appNav` config (labels, descriptions, groups).
 *
 * The Vite source additionally did manual chunk-prefetching on hover/focus
 * (`import()` of the destination route's top-level component) and rendered
 * a manual `PageLoader` overlay via `createPortal` while a deferred
 * `navigate()` call was in flight, working around React Router having no
 * built-in per-route Suspense fallback. Next's App Router already prefetches
 * linked routes and renders `loading.tsx` automatically on navigation (see
 * the `NavigationLoader` resolution in `CLAUDE.md`'s conflict table), so
 * that machinery is dropped here rather than reimplemented.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import {
  APP_NAV_ITEMS,
  filterAppNavByRole,
  groupAppNavItems,
  isAppNavItemActive,
} from "@/config/appNav";
import { selectIsOrgResolved, selectUserRole } from "@/features/auth/authSelectors";
import { useAppSelector } from "@/hooks/useAppSelector";
import { cn } from "@/lib/utils";
import styles from "./CenterNavPanel.module.css";

/** Global floating navigation menu, filtered to the routes the current role may access. */
export function CenterNavPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userRole = useAppSelector(selectUserRole);
  const isOrgResolved = useAppSelector(selectIsOrgResolved);

  const visibleItems = filterAppNavByRole(APP_NAV_ITEMS, userRole, isOrgResolved);
  const sections = groupAppNavItems(visibleItems);

  const handleNavigation = (path: string, active: boolean) => {
    setIsOpen(false);
    if (active) {
      return;
    }
    router.push(path);
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside.
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

  // Close dropdown on Escape.
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

  return (
    <div className={styles.centerNavPanel} ref={dropdownRef}>
      <button
        type="button"
        className={styles.floatingButton}
        onClick={toggleDropdown}
        aria-label="Navigation Menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="center-nav-panel-menu"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id="center-nav-panel-menu"
          className={styles.dropdownMenu}
          role="menu"
          aria-label="Navigation Menu"
        >
          {sections.map((section) => (
            <fieldset key={section.group} className={styles.group}>
              <legend className={styles.groupHeader}>{section.group}</legend>
              {section.items.map((item) => {
                const active = isAppNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigation(item.path, active)}
                    className={cn(styles.dropdownItem, active && styles.active)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon data-icon size={16} aria-hidden="true" className={styles.itemIcon} />
                    <span className={styles.itemText}>
                      <span className={styles.itemLabel}>{item.label}</span>
                      <span className={styles.itemDescription}>{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}

export default CenterNavPanel;
