import React, { useState } from 'react';
import { Heart, Shield, ArrowRight, Video, ArrowLeft } from 'lucide-react';
import Auth from './Auth';
import ProfileSetup from './ProfileSetup';
import { createCheckoutSession } from '../lib/stripe';


interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'hero' | 'uplifter' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selectedRole: 'hero' | 'uplifter') => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAuthSuccess = async (isNewUser: boolean) => {
    
    if (isNewUser) {      
      setStep(3); // Go to profile setup for new users
    } else {  
      // For existing users, check if they have a profile
     
        // User has a profile, go straight to completion
        onComplete();
      } 
    
  };

  const handleProfileComplete = () => {
    setStep(4);
  };

  const handleSubscribe = async () => {
    if (!role) return;
    
    setLoading(true);
    try {
      await createCheckoutSession('price_monthly_subscription');
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (role) {
      onComplete();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Welcome to UpliftMe</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Choose your role to start meaningful video conversations
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('hero')}
                className="w-full p-6 rounded-xl border-2 border-transparent hover:border-purple-500 bg-gray-50 dark:bg-gray-700 transition-all"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <Shield className="w-8 h-8 text-purple-500" />
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">I need motivation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Join as a Hero</p>
                  </div>
                </div>
                <p className="text-sm text-left text-gray-600 dark:text-gray-300">
                  Connect with supportive Uplifters who will motivate and inspire you through video chat
                </p>
              </button>

              <button
                onClick={() => handleRoleSelect('uplifter')}
                className="w-full p-6 rounded-xl border-2 border-transparent hover:border-pink-500 bg-gray-50 dark:bg-gray-700 transition-all"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <Heart className="w-8 h-8 text-pink-500" />
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">I want to motivate</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Join as an Uplifter</p>
                  </div>
                </div>
                <p className="text-sm text-left text-gray-600 dark:text-gray-300">
                  Use video chat to inspire others, share positivity, and earn rewards for making a difference
                </p>
              </button>
            </div>

            <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Video className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold">7-Minute Video Sessions</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Quick, meaningful face-to-face conversations that fit your schedule
              </p>
            </div>
          </div>
        );
      case 2:
        return  <Auth onSuccess={handleAuthSuccess} />;
      case 3:
        return role && <ProfileSetup role={role} onComplete={handleProfileComplete} />;
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Subscribe to UpliftMe</h2>
              <p className="text-gray-600 dark:text-gray-300">
                {role === 'hero'
                  ? 'Get instant video motivation from our amazing Uplifters'
                  : 'Help others through uplifting video conversations'}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-gray-700 p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Monthly Subscription</h3>
                <div className="text-2xl font-bold">$9.99</div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 text-purple-500 mr-2" />
                  Unlimited video sessions
                </li>
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 text-purple-500 mr-2" />
                  Priority matching
                </li>
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 text-purple-500 mr-2" />
                  Access to advanced features
                </li>
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 text-purple-500 mr-2" />
                  Community perks and rewards
                </li>
              </ul>
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Continue with Free Trial
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="mb-6 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        )}
        {renderStep()}
      </div>
    </div>
  );
};

export default WelcomeScreen;