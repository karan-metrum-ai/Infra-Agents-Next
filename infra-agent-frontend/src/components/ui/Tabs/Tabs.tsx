"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";
import styles from "./Tabs.module.css";
import type {
  TabsContentProps,
  TabsListProps,
  TabsListVariant,
  TabsProps,
  TabsTriggerProps,
} from "./Tabs.types";

const LIST_VARIANT_CLASSES: Record<TabsListVariant, string> = {
  default: styles.tabsListDefault,
  line: styles.tabsListLine,
};

export function Tabs({ className, ref, ...props }: TabsProps) {
  return <BaseTabs.Root ref={ref} className={cn(styles.tabs, className)} {...props} />;
}

export function TabsList({ className, variant = "default", ref, ...props }: TabsListProps) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cn(styles.tabsList, LIST_VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ref, ...props }: TabsTriggerProps) {
  return <BaseTabs.Tab ref={ref} className={cn(styles.tabsTrigger, className)} {...props} />;
}

export function TabsContent({ className, ref, ...props }: TabsContentProps) {
  return <BaseTabs.Panel ref={ref} className={cn(styles.tabsContent, className)} {...props} />;
}
