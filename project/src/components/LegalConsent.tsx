import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LegalConsentProps {
  onAccept: () => void;
}

const LegalConsent: React.FC<LegalConsentProps> = ({ onAccept }) => {
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadDisclaimer, setHasReadDisclaimer] = useState(false);

  const handleAccept = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update user's legal acceptance status
      const { error } = await supabase
        .from('users')
        .update({
          legal_accepted_at: new Date().toISOString(),
          legal_version: '1.0'
        })
        .eq('id', user.id);

      if (error) throw error;
      onAccept();
    } catch (error) {
      console.error('Error updating legal acceptance:', error);
    }
  };

  const allChecked = hasReadPrivacy && hasReadTerms && hasReadDisclaimer;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-8 h-8 text-purple-500" />
          <h2 className="text-2xl font-semibold">Legal Agreement</h2>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Before using UpliftMe, please review and accept our legal terms:
        </p>

        <div className="space-y-4 mb-6">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasReadPrivacy}
              onChange={(e) => setHasReadPrivacy(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              I have read and agree to the <a href="/legal#privacy" className="text-purple-500 hover:underline">Privacy Policy</a>, including how you collect and process my personal data.
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasReadTerms}
              onChange={(e) => setHasReadTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              I have read and agree to the <a href="/legal#terms" className="text-purple-500 hover:underline">Terms of Service</a>, including the rules for using UpliftMe.
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasReadDisclaimer}
              onChange={(e) => setHasReadDisclaimer(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              I understand that UpliftMe is not a substitute for professional mental health services and have read the <a href="/legal#disclaimer" className="text-purple-500 hover:underline">Disclaimer</a>.
            </span>
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={!allChecked}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Accept & Continue
        </button>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          By clicking "Accept & Continue", you agree to be bound by our legal terms.
        </p>
      </div>
    </div>
  );
};

export default LegalConsent;