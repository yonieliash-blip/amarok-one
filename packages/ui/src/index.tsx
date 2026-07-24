import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import "./styles.css";

export type BadgeVariant = "default" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  const classes = ["amarok-badge", `amarok-badge--${variant}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  const classes = ["amarok-button", `amarok-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function Card({ title, description, children, className, ...props }: CardProps) {
  const classes = ["amarok-card", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <h3 className="amarok-card__title">{title}</h3>
      {description ? <p className="amarok-card__description">{description}</p> : null}
      {children}
    </div>
  );
}

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function Logo({ label = "AMAROK ONE", className, ...props }: LogoProps) {
  const classes = ["amarok-logo", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <span className="amarok-logo__mark" aria-hidden="true">
        A1
      </span>
      <span>{label}</span>
    </div>
  );
}

export { Badge as AmarokBadge, Button as AmarokButton, Card as AmarokCard, Logo as AmarokLogo };
