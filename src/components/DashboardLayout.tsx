import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, LogOut, Boxes, FileText, Wrench,
  Tags, UserSquare2, BarChart3, ScrollText, Menu,
} from "lucide-react";
import { ROLE_LABELS_AR, ROLE_BADGE_VARIANTS } from "@/lib/roles";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, roles, isSuperAdmin, isAdmin, isStorekeeper, isTechnician, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const initials = (profile?.arabic_name || profile?.email || "?").charAt(0);
  const primaryRole = roles[0];

  const navItems = [
    { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, show: true },
    { to: "/inventory", label: "المخزون", icon: Boxes, show: isAdmin || isStorekeeper || isTechnician },
    { to: "/brands", label: "الماركات", icon: Tags, show: isAdmin },
    { to: "/customers", label: "العملاء", icon: UserSquare2, show: isAdmin || isStorekeeper },
    { to: "/custody", label: "عهدتي", icon: Wrench, show: isTechnician && !isAdmin && !isStorekeeper },
    { to: "/invoices", label: "الفواتير", icon: FileText, show: true },
    { to: "/analytics", label: "التحليلات", icon: BarChart3, show: isAdmin || isStorekeeper },
    { to: "/audit-logs", label: "سجل التدقيق", icon: ScrollText, show: isAdmin },
    { to: "/users", label: "إدارة المستخدمين", icon: Users, show: isSuperAdmin },
  ].filter((i) => i.show);

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/dashboard"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth text-sm font-medium ${
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "hover:bg-sidebar-accent"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-l border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="bg-background rounded-lg p-2 inline-block">
            <Logo size="sm" />
          </div>
        </div>
        <NavList />
        <div className="p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start hover:bg-sidebar-accent text-sidebar-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            {/* Mobile sidebar trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="القائمة">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 bg-sidebar text-sidebar-foreground" dir="rtl">
                <div className="p-6 border-b border-sidebar-border">
                  <div className="bg-background rounded-lg p-2 inline-block">
                    <Logo size="sm" />
                  </div>
                </div>
                <NavList onNavigate={() => setMobileOpen(false)} />
                <div className="p-4 border-t border-sidebar-border">
                  <Button variant="ghost" className="w-full justify-start hover:bg-sidebar-accent text-sidebar-foreground" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 ml-2" />
                    تسجيل الخروج
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="md:hidden">
              <Logo size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{profile?.arabic_name || profile?.email}</p>
              {primaryRole && (
                <Badge variant={ROLE_BADGE_VARIANTS[primaryRole]} className="mt-0.5 text-[10px]">
                  {ROLE_LABELS_AR[primaryRole]}
                </Badge>
              )}
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};
