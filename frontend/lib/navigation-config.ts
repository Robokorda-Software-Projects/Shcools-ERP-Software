// Simplified navigation configuration for MVP
// Only shows: Schools, Classes, Students, Exams, Teacher Assignments, Parent Management, and Grades

import { LayoutDashboard, School, Users, BookOpen, FileText, UserCog, Link2, GraduationCap } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles: string[];
  description?: string;
}

export const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "school_admin", "teacher", "student", "parent"],
    description: "Overview and statistics",
  },
  {
    title: "Schools",
    href: "/dashboard/schools",
    icon: School,
    roles: ["super_admin"],
    description: "Manage schools",
  },
  {
    title: "Classes",
    href: "/dashboard/classes",
    icon: BookOpen,
    roles: ["super_admin", "school_admin", "teacher"],
    description: "Manage classes",
  },
  {
    title: "Teacher Assignments",
    href: "/dashboard/teacher-assignments",
    icon: UserCog,
    roles: ["super_admin", "school_admin"],
    description: "Assign teachers to classes",
  },
  {
    title: "Students",
    href: "/dashboard/students",
    icon: Users,
    roles: ["super_admin", "school_admin", "teacher"],
    description: "Manage students",
  },
  {
    title: "Parent Management",
    href: "/dashboard/parents",
    icon: Link2,
    roles: ["super_admin", "school_admin"],
    description: "Manage parents and link to students",
  },
  {
    title: "Exams",
    href: "/dashboard/exams",
    icon: FileText,
    roles: ["super_admin", "school_admin", "teacher"],
    description: "Create and grade exams",
  },
  {
    title: "My Grades",
    href: "/dashboard/my-grades",
    icon: GraduationCap,
    roles: ["student"],
    description: "View your exam results",
  },
  {
    title: "Children's Grades",
    href: "/dashboard/children-grades",
    icon: GraduationCap,
    roles: ["parent"],
    description: "View your children's grades",
  },
];

// Helper function to get navigation items for a specific role
export function getNavigationForRole(role: string): NavItem[] {
  return navigationItems.filter((item) => item.roles.includes(role));
}

// Helper function to check if user has access to a route
export function canAccessRoute(route: string, role: string): boolean {
  const item = navigationItems.find((item) => item.href === route);
  return item ? item.roles.includes(role) : false;
}