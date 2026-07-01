"use client";

import { ArrowLeft, CheckCircle2, Link as LinkIcon, Zap, Database } from "lucide-react";
import Link from "next/link";

export default function FacebookIntegration() {
  async function connectFacebook() {
    window.location.href = "/api/facebook/login";
  }

  const benefits = [
    {
      title: "Real-time Sync",
      description: "Leads appear in your CRM the exact moment they submit the form.",
      icon: Zap,
    },
    {
      title: "Custom Field Mapping",
      description: "Map Facebook form questions to your specific CRM data fields.",
      icon: Database,
    },
  ];

  return (
    <div className=" p-8">
      
      {/* Navigation Header */}
      <div className="mb-8">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Integrations
        </Link>
      </div>

      {/* Main CTA Card */}
      <div className=" bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Connection Action */}
        <div className="p-8 md:p-12 md:w-3/5 flex flex-col justify-center">
          <div className="w-14 h-14 bg-blue-50 text-[#05335c] rounded-md flex items-center justify-center mb-6 border border-blue-100">
            {/* Using a generic SVG for Facebook to avoid extra dependencies, or you can use a library icon */}
            <svg
              className="w-7 h-7 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Connect Facebook Lead Ads
          </h1>
          
          <p className="mt-3 text-gray-500 text-md leading-relaxed">
            Link your Facebook Page to automatically capture new leads, map your form fields, and trigger automated workflows instantly.
          </p>

          <div className="mt-8">
            <button
              onClick={connectFacebook}
              className="bg-[#05335c] hover:bg-[#183f72] cursor-pointer text-white px-8 py-3.5 rounded-lg font-semibold flex items-center gap-3 transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <LinkIcon size={20} />
              Connect with Facebook
            </button>
            <p className="text-xs text-gray-500 mt-4 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-600" />
              Secure connection via Facebook OAuth
            </p>
          </div>
        </div>

        {/* Right Side: Features / Benefits */}
        <div className="bg-gray-50 p-8 md:p-12 md:w-2/5 border-t md:border-t-0 md:border-l border-gray-200">
          <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase mb-6">
            What you get
          </h3>
          
          <div className="space-y-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm">
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}