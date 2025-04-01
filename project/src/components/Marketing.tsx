import React from 'react';
import { Heart, Shield, Zap, Users, Star, ArrowRight, Gift, Trophy, Video, ArrowLeft } from 'lucide-react';

const Marketing: React.FC = () => {
  const howItWorks = [
    {
      title: "Choose Your Role",
      description: "Sign up as a Hero seeking motivation or an Uplifter ready to inspire through video chat",
      icon: Users
    },
    {
      title: "Instant Video Connection",
      description: "Get matched with a supportive Uplifter or a Hero who needs your positivity",
      icon: Video
    },
    {
      title: "7-Minute Magic",
      description: "Have a meaningful face-to-face conversation that lifts your spirits",
      icon: Zap
    },
    {
      title: "Rate & Earn",
      description: "Heroes rate their experience, Uplifters earn rewards for spreading positivity",
      icon: Trophy
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Hero",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop&auto=format",
      quote: "When I'm feeling down, connecting face-to-face with an Uplifter instantly brightens my day. It's amazing how a 7-minute video chat can completely change your perspective.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Uplifter",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&auto=format",
      quote: "Being able to see the immediate impact of my support through video chat is incredibly rewarding. I've helped hundreds of people find their inner strength.",
      rating: 5
    }
  ];

  const features = [
    {
      title: "Face-to-Face Support",
      description: "Real-time video chat for genuine human connection",
      icon: Video
    },
    {
      title: "Instant Mood Boost",
      description: "Connect with positive people who lift your spirits",
      icon: Heart
    },
    {
      title: "Safe Environment",
      description: "Verified uplifters and moderated conversations",
      icon: Shield
    }
  ];

  return (
    <div className="bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            Feel Better in 7 Minutes
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Connect through video chat with amazing people who will lift your spirits and motivate you to be your best self
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Need Motivation? Join as Hero
            </button>
            <button className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-purple-500 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Want to Inspire? Become Uplifter
            </button>
          </div>
        </div>

        {/* Video Preview */}
        <div className="mb-20 relative">
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1516387938699-a93567ec168e?w=1200&auto=format"
              alt="Video chat preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-8">
              <p className="text-white text-xl font-semibold">
                Real-time video conversations that make a difference
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-center mb-12">How UpliftMe Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <step.icon className="w-12 h-12 text-purple-500 mb-4" />
                  <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                  <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-purple-500 w-8 h-8" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <feature.icon className="w-12 h-12 text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-center mb-12">What Our Community Says</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-xl italic text-gray-700 dark:text-gray-300 mb-4">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center space-x-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role} since 2024</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="text-center">
          <div className="mb-8">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">TRUSTED BY THOUSANDS</span>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-4xl font-bold gradient-text mb-2">50,000+</div>
                <div className="text-gray-600 dark:text-gray-300">Uplifting Conversations</div>
              </div>
              <div>
                <div className="text-4xl font-bold gradient-text mb-2">100,000+</div>
                <div className="text-gray-600 dark:text-gray-300">Lives Touched</div>
              </div>
              <div>
                <div className="text-4xl font-bold gradient-text mb-2">4.9/5</div>
                <div className="text-gray-600 dark:text-gray-300">Average Session Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;