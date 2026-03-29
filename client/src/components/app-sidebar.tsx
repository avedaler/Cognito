import { useLocation, Link } from "wouter";
import {
  MessageSquare,
  LayoutDashboard,
  FileText,
  Target,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Geometric thought-bubble / brain mark — works at 24px, minimal
function ThinkLogMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="ThinkLog"
      className="shrink-0"
    >
      {/* Thought bubble main shape */}
      <path
        d="M12 3C8.13 3 5 6.13 5 10C5 12.76 6.59 15.17 8.9 16.38V19H15.1V16.38C17.41 15.17 19 12.76 19 10C19 6.13 15.87 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-primary"
        fill="none"
      />
      {/* Thought dots */}
      <rect x="9.5" y="19" width="5" height="1.5" rx="0.75" fill="currentColor" className="text-primary" opacity="0.7" />
      <rect x="10.5" y="20.5" width="3" height="1" rx="0.5" fill="currentColor" className="text-primary" opacity="0.4" />
      {/* Inner brain-like circles */}
      <circle cx="9.5" cy="10" r="1.25" fill="currentColor" className="text-primary" />
      <circle cx="12" cy="8.5" r="1.25" fill="currentColor" className="text-primary" />
      <circle cx="14.5" cy="10" r="1.25" fill="currentColor" className="text-primary" />
    </svg>
  );
}

const navItems = [
  {
    label: "Chat",
    icon: MessageSquare,
    href: "/",
    primary: true,
    testId: "nav-chat",
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    primary: false,
    testId: "nav-dashboard",
  },
  {
    label: "Entries",
    icon: FileText,
    href: "/entries",
    primary: false,
    testId: "nav-entries",
  },
  {
    label: "Review",
    icon: Target,
    href: "/review",
    primary: false,
    testId: "nav-review",
  },
  {
    label: "Digest",
    icon: TrendingUp,
    href: "/digest",
    primary: false,
    testId: "nav-digest",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "";
    return location.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <ThinkLogMark size={24} />
            <span className="font-bold text-sm tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              ThinkLog
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      data-testid={item.testId}
                      className={
                        item.primary
                          ? active
                            ? "bg-primary/15 text-primary font-semibold hover:bg-primary/20"
                            : "text-primary/70 font-medium hover:text-primary hover:bg-primary/10"
                          : ""
                      }
                    >
                      <Link href={item.href}>
                        <item.icon
                          className={`h-4 w-4 ${item.primary ? "text-primary" : ""}`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator className="mb-3" />

        {/* User email */}
        {user && (
          <div className="px-2 py-1 mb-2 group-data-[collapsible=icon]:hidden">
            <p
              className="text-xs text-sidebar-foreground/60 truncate"
              data-testid="sidebar-user-email"
            >
              {user.email}
            </p>
            {user.name && (
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            data-testid="button-theme-toggle"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
            data-testid="button-logout"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
