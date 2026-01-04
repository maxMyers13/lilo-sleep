import { User, Group, Week, SleepEntry, LeaderboardEntry, WeeklyPledge } from '../types';
import { MIN_STREAK_HOURS } from '../constants';

// --- MOCK DATA ---

const MOCK_USER: User = {
  id: 'user-1',
  email: 'demo@sleeptax.app',
  name: 'Alex (You)',
  avatarUrl: 'https://picsum.photos/200',
};

const MOCK_USERS: User[] = [
  MOCK_USER,
  { id: 'user-2', email: 'sarah@sleeptax.app', name: 'Sarah', avatarUrl: 'https://picsum.photos/201' },
  { id: 'user-3', email: 'mike@sleeptax.app', name: 'Mike', avatarUrl: 'https://picsum.photos/202' },
  { id: 'user-4', email: 'jess@sleeptax.app', name: 'Jess', avatarUrl: 'https://picsum.photos/203' },
];

const MOCK_GROUP: Group = {
  id: 'group-1',
  name: 'Sleepy Heads',
  ownerId: 'user-1', 
  code: 'SLEEP-2024',
  createdAt: '2024-01-01T00:00:00Z',
};

// Initial state
let currentWeek: Week = {
  id: 'week-12',
  groupId: 'group-1',
  weekNumber: 12,
  isActive: true,
  startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Started 3 days ago
  endDate: null,
};

// Pledges
let weeklyPledges: WeeklyPledge[] = [
  { id: 'p2', weekId: 'week-12', userId: 'user-2', amount: 10, createdAt: new Date().toISOString() },
  { id: 'p3', weekId: 'week-12', userId: 'user-3', amount: 25, createdAt: new Date().toISOString() },
  { id: 'p4', weekId: 'week-12', userId: 'user-4', amount: 0, createdAt: new Date().toISOString() },
  // User 1 (Me) has NOT pledged yet to demonstrate the modal flow
];

let sleepEntries: SleepEntry[] = [
  // User 1 (Me) - Good logs
  { id: 'e1', userId: 'user-1', weekId: 'week-12', wakeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 7.5, loggedAt: new Date().toISOString() },
  { id: 'e2', userId: 'user-1', weekId: 'week-12', wakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 8.0, loggedAt: new Date().toISOString() },
  
  // User 2 - Mixed
  { id: 'e3', userId: 'user-2', weekId: 'week-12', wakeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 6.5, loggedAt: new Date().toISOString() },
  { id: 'e4', userId: 'user-2', weekId: 'week-12', wakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 9.0, loggedAt: new Date().toISOString() },
  
  // User 3 - Slacker
  { id: 'e5', userId: 'user-3', weekId: 'week-12', wakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 5.5, loggedAt: new Date().toISOString() },
];

// Add historical data for streak calculation
const addHistoricalData = () => {
    const today = new Date();
    // Give User 1 a streak of 5 days (2 in current week, 3 prior)
    for(let i=3; i<=5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        sleepEntries.push({
            id: `hist-${i}`,
            userId: 'user-1',
            weekId: 'week-11',
            wakeDate: d.toISOString().split('T')[0],
            hours: 8.0,
            loggedAt: d.toISOString()
        });
    }
    // Give User 2 a broken streak
};
addHistoricalData();

// --- HELPERS ---

// Strict Streak Logic
// A streak is consecutive days (ending yesterday or today) where hours >= 7.5
const calculateStreak = (userId: string, allEntries: SleepEntry[]): number => {
    const userEntries = allEntries
        .filter(e => e.userId === userId)
        .sort((a, b) => new Date(b.wakeDate).getTime() - new Date(a.wakeDate).getTime());

    if (userEntries.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const latestDate = userEntries[0].wakeDate;

    // Anchor check: Streak must be active (logged today or yesterday)
    if (latestDate !== todayStr && latestDate !== yesterdayStr) {
        return 0;
    }

    let streak = 0;
    let currentDate = new Date(latestDate);

    for (const entry of userEntries) {
        const entryDate = new Date(entry.wakeDate);
        const diffTime = Math.abs(currentDate.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > 1 && streak > 0) break; // Gap detected

        if (entry.hours >= MIN_STREAK_HOURS) {
            streak++;
            currentDate = entryDate;
        } else {
            break; // Streak broken by poor sleep
        }
    }

    return streak;
};

// --- SERVICE METHODS ---

export const mockService = {
  signIn: async (): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return MOCK_USER;
  },

  getGroup: async (): Promise<Group> => {
    return MOCK_GROUP;
  },

  getCurrentWeek: async (): Promise<Week> => {
    return currentWeek;
  },

  getEntriesForWeek: async (weekId: string): Promise<SleepEntry[]> => {
    return sleepEntries.filter(e => e.weekId === weekId);
  },

  getMyPledge: async (weekId: string): Promise<WeeklyPledge | undefined> => {
      return weeklyPledges.find(p => p.weekId === weekId && p.userId === MOCK_USER.id);
  },

  pledgeSleepTax: async (weekId: string, amount: number): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      if (amount < 0 || amount > 50) throw new Error("Pledge must be between $0 and $50");
      
      const existing = weeklyPledges.find(p => p.weekId === weekId && p.userId === MOCK_USER.id);
      if (existing) throw new Error("You have already pledged for this week.");

      weeklyPledges.push({
          id: Math.random().toString(36).substr(2, 9),
          weekId,
          userId: MOCK_USER.id,
          amount,
          createdAt: new Date().toISOString()
      });
  },

  getLeaderboard: async (weekId: string): Promise<LeaderboardEntry[]> => {
    const weekEntries = sleepEntries.filter(e => e.weekId === weekId);
    
    const leaderboard: LeaderboardEntry[] = MOCK_USERS.map(user => {
      const userWeekEntries = weekEntries.filter(e => e.userId === user.id);
      const totalHours = userWeekEntries.reduce((sum, e) => sum + e.hours, 0);
      const pledge = weeklyPledges.find(p => p.weekId === weekId && p.userId === user.id);
      const streak = calculateStreak(user.id, sleepEntries);

      return {
        userId: user.id,
        user: user,
        totalHours,
        streak,
        taxPledged: pledge ? pledge.amount : 0,
        rank: 0,
        entriesCount: userWeekEntries.length
      };
    });

    leaderboard.sort((a, b) => b.totalHours - a.totalHours);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  },

  logSleep: async (date: string, hours: number): Promise<SleepEntry> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Check Pledge
    const pledge = weeklyPledges.find(p => p.weekId === currentWeek.id && p.userId === MOCK_USER.id);
    if (!pledge) {
        throw new Error("PLEDGE_REQUIRED");
    }

    // Check duplicate
    const existing = sleepEntries.find(e => 
      e.userId === MOCK_USER.id && 
      e.weekId === currentWeek.id && 
      e.wakeDate === date
    );

    if (existing) {
      throw new Error("You have already logged sleep for this date.");
    }

    const newEntry: SleepEntry = {
      id: Math.random().toString(36).substr(2, 9),
      userId: MOCK_USER.id,
      weekId: currentWeek.id,
      wakeDate: date,
      hours: hours,
      loggedAt: new Date().toISOString(),
    };

    sleepEntries = [...sleepEntries, newEntry];
    return newEntry;
  },

  endWeek: async (): Promise<Week> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (MOCK_USER.id !== MOCK_GROUP.ownerId) {
      throw new Error("Only the owner can end the week.");
    }

    currentWeek = {
      ...currentWeek,
      isActive: false,
      endDate: new Date().toISOString(),
      winnerId: 'user-2' 
    };

    const newWeek: Week = {
      id: `week-${currentWeek.weekNumber + 1}`,
      groupId: MOCK_GROUP.id,
      weekNumber: currentWeek.weekNumber + 1,
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: null,
    };
    
    currentWeek = newWeek;
    
    return newWeek;
  },
  
  getUserStats: async (userId: string, weekId: string) => {
      const allUserEntries = sleepEntries.filter(e => e.userId === userId);
      const weekEntries = allUserEntries.filter(e => e.weekId === weekId);
      const streak = calculateStreak(userId, sleepEntries);
      return {
          entries: weekEntries,
          streak
      };
  }
};
