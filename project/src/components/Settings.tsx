import React, { useState, useEffect } from 'react';
import { CreditCard, Bell, Shield, Gift, History, HelpCircle, Camera, Upload, Star, User, Code } from 'lucide-react';
import { useSessionStore } from '../store/session';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    username: string;
    bio: string;
    avatar_url: string;
  } | null>(null);
  const { loadUserSubscription, isDevelopment, toggleDevelopmentMode } = useSessionStore();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('username, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('users')
        .update({
          username: profile.username,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // First, ensure old avatar is removed
      const { data: oldFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (oldFiles?.length) {
        await supabase.storage
          .from('avatars')
          .remove(oldFiles.map(f => `${user.id}/${f.name}`));
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
    }
  };

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      content: profile && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-6">Edit Profile</h3>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-purple-500 rounded-full p-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )
    },
    {
      id: 'developer',
      label: 'Developer',
      icon: Code,
      content: (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold">Developer Mode</h3>
            </div>
            <button
              onClick={toggleDevelopmentMode}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDevelopment 
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isDevelopment ? 'Disable Dev Mode' : 'Enable Dev Mode'}
            </button>
          </div>
          {isDevelopment && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Developer mode is enabled. All features are unlocked for testing.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Enabled Features:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                  <li>Bypass subscription requirements</li>
                  <li>Unlimited session credits</li>
                  <li>Access to all premium features</li>
                  <li>Test user functionality</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      ),
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Settings</h2>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-purple-500 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1">
          {tabs.find(tab => tab.id === activeTab)?.content}
        </div>
      </div>
    </div>
  );
};

export default Settings;