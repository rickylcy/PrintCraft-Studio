"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

function NavItem({ href, children }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-md text-sm font-medium transition",
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-700 hover:bg-neutral-200",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function NavBar() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createAndGo() {
    try {
      setCreating(true);
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled", type: "escpos" }),
      });
      const data = await res.json();
      if (data.ok) router.push(`/templates/${data.template.id}/edit`);
      else router.push("/templates?error=create_failed");
    } catch {
      router.push("/templates?error=network");
    } finally {
      setCreating(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            PrintCraft Studio
          </Link>
          <nav className="ml-2 hidden gap-1 sm:flex">
            <NavItem href="/">Home</NavItem>
            <NavItem href="/templates">Templates</NavItem>
            <NavItem href="/profiles">Profiles</NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/templates"
            className="hidden rounded-md border px-3 py-2 text-sm sm:inline-block"
          >
            All Templates
          </Link>
          <button
            onClick={createAndGo}
            disabled={creating}
            className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
            title="Create a new template"
          >
            {creating ? "Creating…" : "New Template"}
          </button>
        </div>
      </div>
    </header>
  );
}
