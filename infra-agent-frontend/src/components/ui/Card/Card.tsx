import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";
import styles from "./Card.module.css";
import type { CardProps } from "./Card.types";

export function Card({
  className,
  variant = "default",
  ref,
  ...props
}: CardProps & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        styles.card,
        variant === "default" && styles.cardBordered,
        variant === "borderless" && styles.cardBorderless,
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(styles.cardHeader, className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} data-slot="card-title" className={cn(styles.cardTitle, className)} {...props} />
  );
}

export function CardDescription({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card-description"
      className={cn(styles.cardDescription, className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn(styles.cardContent, className)}
      {...props}
    />
  );
}

export function CardFooter({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(styles.cardFooter, className)}
      {...props}
    />
  );
}

export function CardAction({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(styles.cardAction, className)}
      {...props}
    />
  );
}
