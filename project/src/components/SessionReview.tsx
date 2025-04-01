import React, { useState } from 'react';
import { Star, Flag, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useSessionStore } from '../store/session';
import { supabase } from '../lib/supabase';
import { createPaymentIntent } from '../lib/stripe';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import EmotionalSlider from './EmotionalSlider';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface SessionReviewProps {
  uplifterName: string;
  onClose: () => void;
}

const PaymentForm = ({ onSuccess, amount }: { onSuccess: () => void, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // In development, simulate successful payment
      if (import.meta.env.DEV) {
        console.log('Simulating successful payment in development');
        onSuccess();
        return;
      }

      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (paymentError) {
        throw paymentError;
      }

      onSuccess();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!import.meta.env.DEV && <PaymentElement />}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
};

const SessionReview: React.FC<SessionReviewProps> = ({ uplifterName, onClose }) => {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagType, setFlagType] = useState<'inappropriate' | 'dangerous' | 'scam' | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [wellbeingScore, setWellbeingScore] = useState<number>(5);
  const { currentSession, endSession, isDevelopment } = useSessionStore();

  // If there was no match, just close
  if (!currentSession?.uplifter_id) {
    endSession();
    onClose();
    return null;
  }

  const handleSubmit = async () => {
    if (!currentSession) return;
    setLoading(true);

    try {
      // Store post-session emotional score
      await supabase.from('emotional_tracking').insert({
        session_id: currentSession.id,
        user_id: currentSession.hero_id,
        score: wellbeingScore,
        type: 'post_session'
      });

      // In development mode, simulate successful payment
      if (isDevelopment) {
        await endSession(rating, {
          payment_intent_id: 'dev_pi_' + Date.now(),
          amount_paid: 110,
          uplifter_earnings: 100,
          platform_fee: 10,
          message,
          note
        });
        onClose();
        return;
      }

      const { clientSecret } = await createPaymentIntent(110);
      setClientSecret(clientSecret);
    } catch (error) {
      console.error('Payment intent creation error:', error);
      // In development, simulate successful payment without Stripe
      if (import.meta.env.DEV) {
        await handlePaymentSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!currentSession) return;
    
    try {
      await endSession(rating, {
        payment_intent_id: import.meta.env.DEV ? 'dev_pi_success' : 'pi_success',
        amount_paid: 110,
        uplifter_earnings: 100,
        platform_fee: 10,
        message,
        note
      });

      onClose();
    } catch (error) {
      console.error('Session end error:', error);
    }
  };

  const handleFlag = async () => {
    if (!currentSession || !flagType) return;
    setLoading(true);

    try {
      await supabase
        .from('flags')
        .insert({
          session_id: currentSession.id,
          uplifter_id: currentSession.uplifter_id,
          reason: flagReason,
          type: flagType,
          severity: flagType === 'dangerous' ? 'high' : 'medium'
        });

      onClose();
    } catch (error) {
      console.error('Flag submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const flagTypes = [
    { id: 'inappropriate' as const, label: 'Inappropriate Content', icon: AlertTriangle },
    { id: 'dangerous' as const, label: 'Dangerous Behavior', icon: ShieldAlert },
    { id: 'scam' as const, label: 'Scam Attempt', icon: Flag }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
        {!showFlagForm ? (
          <>
            <h3 className="text-xl font-semibold mb-4">
              Rate Your Session with {uplifterName}
            </h3>
            
            <div className="flex items-center justify-center space-x-1 mb-6">
              {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      value <= rating
                        ? 'text-yellow-500 fill-current'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  How are you feeling now?
                </label>
                <EmotionalSlider
                  value={wellbeingScore}
                  onChange={setWellbeingScore}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Share feedback with your Uplifter (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What did you find most helpful about this session?"
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Personal note (private)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write a private note for yourself about this session..."
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            {clientSecret && !import.meta.env.DEV ? (
              <Elements stripe={stripePromise} options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                },
              }}>
                <PaymentForm onSuccess={handlePaymentSuccess} amount={110} />
              </Elements>
            ) : (
              <>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Session cost: $1.10
                  </p>
                  <p className="text-xs text-gray-500">
                    ($1.00 goes to the Uplifter, $0.10 platform fee)
                  </p>
                </div>

                <div className="flex flex-col space-y-3">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || rating === 0}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Submit Rating & Pay'}
                  </button>

                  <button
                    onClick={() => setShowFlagForm(true)}
                    className="flex items-center justify-center space-x-2 text-red-500 hover:text-red-600 font-medium"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report Inappropriate Behavior</span>
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center space-x-2 text-red-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Report Inappropriate Behavior</h3>
            </div>

            <div className="space-y-4 mb-4">
              {flagTypes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFlagType(id)}
                  className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                    flagType === id
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${flagType === id ? 'text-red-500' : 'text-gray-500'}`} />
                  <span className={flagType === id ? 'text-red-700 dark:text-red-300' : ''}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Please provide details about the incident..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 resize-none"
              required
            />

            <div className="flex flex-col space-y-3">
              <button
                onClick={handleFlag}
                disabled={loading || !flagReason.trim() || !flagType}
                className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>

              <button
                onClick={() => setShowFlagForm(false)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionReview;