import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

export async function createPaymentIntent(amount: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // In development, simulate successful payment
    if (import.meta.env.DEV) {
      return {
        clientSecret: 'test_secret',
        amount,
        currency: 'usd'
      };
    }

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Payment intent error:', error);
    throw error;
  }
}

export async function createCheckoutSession(priceId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // In development, simulate successful subscription
    if (import.meta.env.DEV) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_tier: 'premium',
          sessions_remaining: 999
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      return { success: true };
    }

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId }
    });

    if (error) throw error;

    // Redirect to Stripe Checkout
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
    if (!stripe) throw new Error('Stripe failed to load');

    const { error: stripeError } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (stripeError) throw stripeError;
  } catch (error) {
    console.error('Checkout session error:', error);
    throw error;
  }
}

export async function getSubscriptionStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier, sessions_remaining')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return {
      status: data.subscription_status,
      tier: data.subscription_tier,
      sessionsRemaining: data.sessions_remaining
    };
  } catch (error) {
    console.error('Subscription status error:', error);
    throw error;
  }
}

export async function cancelSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // In development, simulate cancellation
    if (import.meta.env.DEV) {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'canceled',
          subscription_tier: 'free'
        })
        .eq('id', user.id);

      if (error) throw error;
      return { success: true };
    }

    const { error } = await supabase.functions.invoke('cancel-subscription');
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    throw error;
  }
}