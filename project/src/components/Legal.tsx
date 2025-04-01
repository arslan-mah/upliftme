import React from 'react';
import { Shield, Lock, Scale } from 'lucide-react';

const Legal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Legal Information</h1>

      {/* Privacy Policy */}
      <section className="mb-12">
        <div className="flex items-center space-x-3 mb-4">
          <Lock className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-semibold">Privacy Policy</h2>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p>Last updated: February 22, 2025</p>
          <p>
            UpliftMe ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your information when you use our service.
          </p>
          <h3>Information We Collect</h3>
          <ul>
            <li>Account information (email, username)</li>
            <li>Profile information (avatar, bio)</li>
            <li>Session data (duration, ratings, messages)</li>
            <li>Emotional wellbeing scores</li>
            <li>Payment information (processed securely through Stripe)</li>
          </ul>
          <h3>How We Use Your Information</h3>
          <ul>
            <li>To provide and improve our services</li>
            <li>To match you with appropriate users</li>
            <li>To process payments</li>
            <li>To analyze service usage and trends</li>
            <li>To ensure platform safety</li>
          </ul>
          <h3>Data Security</h3>
          <p>
            We implement industry-standard security measures to protect your data. All video sessions are end-to-end encrypted, and we never store video content.
          </p>
        </div>
      </section>

      {/* Terms of Service */}
      <section className="mb-12">
        <div className="flex items-center space-x-3 mb-4">
          <Scale className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-semibold">Terms of Service</h2>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p>Last updated: February 22, 2025</p>
          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing or using UpliftMe, you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </p>
          <h3>2. User Responsibilities</h3>
          <ul>
            <li>You must be at least 18 years old to use this service</li>
            <li>You agree to provide accurate information</li>
            <li>You will not use the service for any illegal purposes</li>
            <li>You will not harass or harm other users</li>
          </ul>
          <h3>3. Service Rules</h3>
          <ul>
            <li>Sessions are limited to 7 minutes</li>
            <li>Payment is required for each session</li>
            <li>Inappropriate behavior will result in account termination</li>
            <li>No recording of video sessions is allowed</li>
          </ul>
        </div>
      </section>

      {/* Disclaimer */}
      <section>
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-semibold">Disclaimer</h2>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p>
            UpliftMe is not a substitute for professional mental health services. Our platform provides peer support and motivation only. If you're experiencing serious mental health issues, please seek professional help.
          </p>
          <h3>Important Notes:</h3>
          <ul>
            <li>Uplifters are not licensed therapists or counselors</li>
            <li>Sessions are for motivational support only</li>
            <li>We do not provide medical or mental health advice</li>
            <li>In case of emergency, contact your local emergency services</li>
          </ul>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            By using UpliftMe, you acknowledge and agree to these terms and conditions.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Legal;