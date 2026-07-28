import type { ComponentPropsWithRef } from "react";
import type { Tabs as BaseTabs } from "@base-ui/react/tabs";

export type TabsListVariant = "default" | "line";

export type TabsProps = ComponentPropsWithRef<typeof BaseTabs.Root>;

export interface TabsListProps extends ComponentPropsWithRef<typeof BaseTabs.List> {
  variant?: TabsListVariant;
}

export type TabsTriggerProps = ComponentPropsWithRef<typeof BaseTabs.Tab>;

export type TabsContentProps = ComponentPropsWithRef<typeof BaseTabs.Panel>;
