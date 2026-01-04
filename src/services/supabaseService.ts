import { createClient } from '@/utils/supabase/client';
import { User, SleepEntry, LeaderboardEntry } from '../types';

export const supabaseService = {
  // Get current user's profile
  getCurrentUser: async (): Promise<User | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email || '',
      name: profile.name || 'User',
      avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=3B82F6&color=fff`,
    };
  },

  // Get all sleep entries for the current week (last 7 days)
  getWeeklyEntries: async (): Promise<SleepEntry[]> => {
    const supabase = createClient();
    
    // Get entries from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sleep_entries')
      .select('*')
      .gte('wake_date', weekAgoStr)
      .order('wake_date', { ascending: true });

    if (error) {
      console.error('Error fetching entries:', error);
      return [];
    }

    return data.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      weekId: 'current',
      wakeDate: entry.wake_date,
      hours: parseFloat(entry.hours),
      loggedAt: entry.logged_at,
    }));
  },

  // Get user's own entries for the week
  getMyWeeklyEntries: async (userId: string): Promise<SleepEntry[]> => {
    const supabase = createClient();
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sleep_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('wake_date', weekAgoStr)
      .order('wake_date', { ascending: true });

    if (error) {
      console.error('Error fetching my entries:', error);
      return [];
    }

    return data.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      weekId: 'current',
      wakeDate: entry.wake_date,
      hours: parseFloat(entry.hours),
      loggedAt: entry.logged_at,
    }));
  },

  // Get leaderboard for the current week
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const supabase = createClient();
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Get all entries for the week
    const { data: entries, error: entriesError } = await supabase
      .from('sleep_entries')
      .select('*')
      .gte('wake_date', weekAgoStr);

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return [];
    }

    // Calculate leaderboard
    const leaderboard: LeaderboardEntry[] = profiles.map(profile => {
      const userEntries = entries.filter(e => e.user_id === profile.id);
      const totalHours = userEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
      const streak = userEntries.length;

      return {
        userId: profile.id,
        user: {
          id: profile.id,
          email: profile.email || '',
          name: profile.name || 'User',
          avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=3B82F6&color=fff`,
        },
        totalHours,
        streak,
        rank: 0,
        entriesCount: userEntries.length,
      };
    });

    // Sort by total hours and assign ranks
    leaderboard.sort((a, b) => b.totalHours - a.totalHours);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Only return users who have logged at least one entry
    return leaderboard.filter(e => e.entriesCount > 0);
  },

  // Ensure user profile exists (for users who signed up before trigger was created)
  ensureProfile: async (): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      });
    }
  },

  // Log sleep for a specific date
  logSleep: async (date: string, hours: number): Promise<SleepEntry> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Ensure profile exists first
    await supabaseService.ensureProfile();

    // Check if entry already exists for this date
    const { data: existing } = await supabase
      .from('sleep_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('wake_date', date)
      .maybeSingle();

    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('sleep_entries')
        .update({ hours, logged_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        weekId: 'current',
        wakeDate: data.wake_date,
        hours: parseFloat(data.hours),
        loggedAt: data.logged_at,
      };
    }

    // Insert new entry
    const { data, error } = await supabase
      .from('sleep_entries')
      .insert({
        user_id: user.id,
        wake_date: date,
        hours,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already logged sleep for this date.');
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      weekId: 'current',
      wakeDate: data.wake_date,
      hours: parseFloat(data.hours),
      loggedAt: data.logged_at,
    };
  },

  // Delete a sleep entry
  deleteEntry: async (entryId: string): Promise<void> => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('sleep_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  },
};
