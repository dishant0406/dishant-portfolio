import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./logo.module.css";

export interface LogoProps {
  size?: number;
  className?: string;
}

// The site logo, a sticker of my face. It is decorative: the link around it
// already has the label "Home".
export function Logo({ size = 20, className }: LogoProps) {
  return (
    <Image
      src="/images/logo.webp"
      alt=""
      width={size}
      height={size}
      priority
      className={cn("shrink-0", styles.logo, className)}
    />
  );
}

export default Logo;
