import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-[9px] font-body font-semibold text-[15px] " +
  "px-[26px] py-[14px] rounded-full cursor-pointer border-none transition-all duration-200 " +
  "[&_svg]:w-4 [&_svg]:h-4 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none " +
  "disabled:translate-y-0 disabled:hover:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-leaf text-white shadow-[0_8px_22px_-10px_rgba(25,61,32,.7)] " +
    "hover:-translate-y-0.5 hover:bg-leaf-deep hover:shadow-[0_14px_28px_-12px_rgba(25,61,32,.8)]",
  ghost:
    "bg-transparent text-ink border-[1.5px] border-line hover:border-leaf hover:text-leaf",
};

type CommonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "children" | "href"
  > & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Pill button matching `.btn` / `.btn-primary` / `.btn-ghost` from the prototype. */
export function Button({
  variant = "primary",
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = cn(base, variants[variant], className);

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonAsButton)}>
      {children}
    </button>
  );
}
