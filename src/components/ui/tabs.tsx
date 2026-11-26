"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { createContext, useContext, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { segmentItem, segmentTrack } from "./segmented-control";

type TabsVariant = "underline" | "pill";
const VariantContext = createContext<TabsVariant>("underline");

export const Tabs = TabsPrimitive.Root;

export interface TabsListProps extends ComponentProps<typeof TabsPrimitive.List> {
  variant?: TabsVariant;
  block?: boolean;
}

export function TabsList({ variant = "underline", block = false, className, ...props }: TabsListProps) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.List
        className={cn(
          variant === "underline"
            ? "flex gap-4 overflow-x-auto border-b border-line"
            : cn(block ? "flex w-full" : "inline-flex", segmentTrack),
          className,
        )}
        {...props}
      />
    </VariantContext.Provider>
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = useContext(VariantContext);
  return (
    <TabsPrimitive.Trigger
      className={cn(
        variant === "underline"
          ? cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent pb-2.5 text-body-sm font-semibold text-ink-subtle",
              "transition-[color,border-color] duration-150 ease-out hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "data-[state=active]:border-brand data-[state=active]:font-extrabold data-[state=active]:text-brand",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )
          : cn(
              segmentItem,
              "flex-1 whitespace-nowrap px-3.5 font-semibold text-ink-subtle hover:text-ink",
              "data-[state=active]:bg-surface data-[state=active]:font-bold data-[state=active]:text-ink data-[state=active]:shadow-segment",
            ),
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", className)}
      {...props}
    />
  );
}
