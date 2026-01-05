/* eslint-disable @typescript-eslint/no-explicit-any */
// Simplified navigation configuration for MVP
// Only shows: Schools, Classes, Students, Exams, Teacher Assignments, Parent Management, and Grades

import { LayoutDashboard, School, Users, BookOpen, FileText, UserCog, Link2, GraduationCap, Layers, ClipboardList, CalendarClock, ClipboardCheck, PenTool, UserCheck, Settings, Brain, Calendar, Upload, FolderOpen, Award } from "lucide-react";

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
    roles: ["super_admin", "school_admin", "teacher", "student", "parent", "enrollment_officer"],
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
    title: "AI Settings",
    href: "/dashboard/super-admin/ai-settings",
    icon: Brain,
    roles: ["super_admin"],
    description: "Configure AI-powered file parsing",
  },
  {
    title: "Forms & Classes",
    href: "/dashboard/forms-classes",
    icon: Layers,
    roles: ["school_admin"],
    description: "Manage forms and classes",
  },
  {
    title: "Subjects",
    href: "/dashboard/subjects",
    icon: BookOpen,
    roles: ["school_admin"],
    description: "Manage subjects",
  },
  {
    title: "Staff",
    href: "/dashboard/staff",
    icon: UserCog,
    roles: ["school_admin"],
    description: "Manage teachers and staff",
  },
  {
    title: "My Classes",
    href: "/dashboard/classes",
    icon: ClipboardList,
    roles: ["teacher"],
    description: "View my assigned classes",
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
    roles: ["super_admin", "school_admin", "teacher", "enrollment_officer"],
    description: "Manage students",
  },
  {
    title: "Enroll Student",
    href: "/dashboard/students/enroll-new",
    icon: Users,
    roles: ["enrollment_officer"],
    description: "Enroll single student with parent",
  },
  {
    title: "Bulk Upload",
    href: "/dashboard/students/bulk-enroll",
    icon: Users,
    roles: ["enrollment_officer", "school_admin"],
    description: "Upload multiple students via CSV",
  },
  {
    title: "Enrollment Settings",
    href: "/dashboard/enrollment-settings",
    icon: Settings,
    roles: ["school_admin"],
    description: "Configure enrollment rules",
  },
  {
    title: "Parent Management",
    href: "/dashboard/parents",
    icon: Link2,
    roles: ["super_admin", "school_admin"],
    description: "Manage parents and link to students",
  },
  {
    title: "Exam Periods",
    href: "/dashboard/exam-periods",
    icon: CalendarClock,
    roles: ["school_admin"],
    description: "Control exam marking periods",
  },
  {
    title: "Exams",
    href: "/dashboard/exams",
    icon: FileText,
    roles: ["super_admin", "school_admin"],
    description: "Manage and publish exams",
  },
  {
    title: "Tests",
    href: "/dashboard/school-admin/tests",
    icon: ClipboardList,
    roles: ["school_admin"],
    description: "View teacher tests and quizzes",
  },
  {
    title: "Documents",
    href: "/dashboard/school-admin/documents",
    icon: BookOpen,
    roles: ["school_admin"],
    description: "View teacher documents",
  },
  {
    title: "Enter Marks",
    href: "/dashboard/teacher-exams",
    icon: ClipboardCheck,
    roles: ["teacher"],
    description: "Enter exam marks",
  },
  {
    title: "My Tests",
    href: "/dashboard/teacher-tests",
    icon: PenTool,
    roles: ["teacher"],
    description: "Create and manage tests",
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: UserCheck,
    roles: ["teacher", "school_admin"],
    description: "Mark daily attendance",
  },
  {
    title: "My Attendance",
    href: "/dashboard/student/attendance",
    icon: Calendar,
    roles: ["student"],
    description: "View your attendance record",
  },
  {
    title: "My Assignments",
    href: "/dashboard/student/assignments",
    icon: Upload,
    roles: ["student"],
    description: "View and submit assignments",
  },
  {
    title: "My Grades",
    href: "/dashboard/student/grades",
    icon: GraduationCap,
    roles: ["student"],
    description: "View your test results",
  },
  {
    title: "Resources",
    href: "/dashboard/student/resources",
    icon: FolderOpen,
    roles: ["student"],
    description: "Study materials and notes",
  },
  {
    title: "E-Report",
    href: "/dashboard/student/ereport",
    icon: Award,
    roles: ["student"],
    description: "View your exam report card",
  },
  {
    title: "Children's Grades",
    href: "/dashboard/children-grades",
    icon: GraduationCap,
    roles: ["parent"],
    description: "View your children's grades",
  },
  {
    title: "E-Report Card",
    href: "/dashboard/student/ereport",
    icon: Award,
    roles: ["parent"],
    description: "View your child's report card",
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