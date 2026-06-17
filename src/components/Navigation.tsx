"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/walking-area", label: "Walking Area", icon: MapPin },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Button
            key={href}
            asChild
            variant={active ? "default" : "ghost"}
            size="sm"
          >
            <Link href={href} aria-label={label}>
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
