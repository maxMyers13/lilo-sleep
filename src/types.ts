export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  code: string;
  createdAt: string;
}

export interface Week {
  id: string;
  groupId: string;
  weekNumber: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  winnerId?: string | null;
}

export interface WeeklyPledge {
  id: string;
  weekId: string;
  userId: string;
  amount: number;
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  userId: string;
  weekId: string;
  wakeDate: string; // YYYY-MM-DD
  hours: number;
  loggedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  user: User;
  totalHours: number;
  streak: number; // Consecutive days >= 7.5 hrs
  taxPledged: number; // Amount pledged for this week
  rank: number;
  entriesCount: number;
}

export enum AppView {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
}