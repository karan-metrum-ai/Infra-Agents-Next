"use client";

/**
 * CenterNavPanel — global floating navigation menu (Onboarding / Team
 * Building / Dashboard), role-filtered.
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
import { LayoutDashboard, Menu, Rocket, UsersRound } from "lucide-react";
import { selectIsOrgResolved, selectUserRole } from "@/features/auth/authSelectors";
import { useAppSelector } from "@/hooks/useAppSelector";
import { cn } from "@/lib/utils";
import styles from "./CenterNavPanel.module.css";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles: string[];
}

const navItems: NavItem[] = [
  {
    label: "Onboarding",
    path: "/onboarding",
    icon: <Rocket data-icon size={16} aria-hidden="true" />,
    allowedRoles: ["platform_admin"],
  },
  {
    label: "Team Building",
    path: "/workflows",
    icon: <UsersRound data-icon size={16} aria-hidden="true" />,
    allowedRoles: ["platform_admin", "infra_admin"],
  },
  {
    label: "Dashboard",
    path: "/dashboard/live",
    icon: <LayoutDashboard data-icon size={16} aria-hidden="true" />,
    allowedRoles: ["platform_admin", "infra_admin", "operator", "viewer"],
  },
];

/** Global floating navigation menu, filtered to the routes the current role may access. */
export function CenterNavPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userRole = useAppSelector(selectUserRole);
  const isOrgResolved = useAppSelector(selectIsOrgResolved);

  // Only filter once the role is known. Before that, show all items.
  const visibleItems = isOrgResolved
    ? navItems.filter((item) => item.allowedRoles.includes(userRole))
    : navItems;

  const isActive = (path: string): boolean => {
    if (path === "/dashboard/live") {
      return pathname.startsWith("/dashboard/live");
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    if (isActive(path)) {
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
          {visibleItems.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              onClick={() => handleNavigation(item.path)}
              className={cn(styles.dropdownItem, isActive(item.path) && styles.active)}
              aria-current={isActive(item.path) ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CenterNavPanel;
