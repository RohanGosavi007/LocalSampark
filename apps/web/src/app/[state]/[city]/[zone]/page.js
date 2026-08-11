import React from 'react';


export async function generateMetadata({ params }) {
  const { state, city, zone } = await params;
  
  // Format for display (capitalize first letters)
  const formatName = (str) => str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
  
  const stateName = formatName(state);
  const cityName = formatName(city);
  const zoneName = formatName(zone);

  return {
    title: `Local Shops, Jobs, and Services in ${zoneName}, ${cityName} | LocalSampark`,
    description: `Discover top-rated local shops, gig jobs, properties, and community events in ${zoneName}, ${cityName}, ${stateName}. Connect with your neighborhood today on LocalSampark.`,
    keywords: `${zoneName}, ${cityName}, ${stateName}, local shops, home delivery, gig jobs, local properties, society management`,
  };
}

export default async function ZoneSEOLandingPage({ params }) {
  const { state, city, zone } = await params;
  
  const formatName = (str) => str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
  const stateName = formatName(state);
  const cityName = formatName(city);
  const zoneName = formatName(zone);

  // In a real implementation, we would fetch server-side data here
  // e.g., const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/zones/seo/${state}/${city}/${zone}`);
  // const zoneData = await res.json();
  
  // For now, mock SEO data
  const mockShopsCount = Math.floor(Math.random() * 50) + 10;
  const mockJobsCount = Math.floor(Math.random() * 20) + 5;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <section className="bg-indigo-600 text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" d="M45.7,-76.3C58.8,-69.3,68.6,-55.8,76.5,-41.8C84.4,-27.8,90.4,-13.9,89.5,-0.5C88.6,12.9,80.8,25.8,72.4,38.2C64.1,50.7,55.3,62.7,42.7,70.5C30.2,78.2,15.1,81.7,0.7,80.6C-13.8,79.4,-27.6,73.5,-40.4,65.8C-53.1,58.2,-64.8,48.7,-72.5,36.4C-80.1,24.1,-83.8,9,-81.8,-5.2C-79.9,-19.4,-72.3,-32.8,-62.4,-43.8C-52.6,-54.9,-40.4,-63.5,-27.7,-70.7C-15,-77.9,-1.8,-83.8,6.8,-82.9C15.4,-82,32.6,-83.2,45.7,-76.3Z" transform="translate(100 100)" />
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-block bg-indigo-500 text-indigo-50 px-3 py-1 rounded-full text-sm font-semibold tracking-wide mb-4 uppercase">
            {stateName} » {cityName}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            Welcome to {zoneName}'s Local Hub
          </h1>
          <p className="text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
            Discover {mockShopsCount}+ local businesses, find {mockJobsCount}+ nearby gig jobs, and connect directly with your community in {zoneName}.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg">
              Explore Shops
            </button>
            <button className="bg-indigo-500 border border-indigo-400 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-400 transition-colors">
              Find Jobs
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-wrap justify-between items-center text-center divide-x divide-gray-100">
          <div className="flex-1 px-4 py-2">
            <div className="text-4xl font-black text-gray-800 mb-1">{mockShopsCount}</div>
            <div className="text-sm font-medium text-gray-500 uppercase">Verified Shops</div>
          </div>
          <div className="flex-1 px-4 py-2">
            <div className="text-4xl font-black text-gray-800 mb-1">{mockJobsCount}</div>
            <div className="text-sm font-medium text-gray-500 uppercase">Local Jobs</div>
          </div>
          <div className="flex-1 px-4 py-2">
            <div className="text-4xl font-black text-gray-800 mb-1">24/7</div>
            <div className="text-sm font-medium text-gray-500 uppercase">Hyperlocal Delivery</div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Popular in {zoneName}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Skeleton Cards for SEO / SSR */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
              <div className="flex justify-between items-center">
                <div className="h-8 bg-indigo-100 rounded-full w-20"></div>
                <div className="h-4 bg-gray-100 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Dynamic SEO Text to boost keyword relevance */}
      <section className="bg-white py-12 px-6 border-t border-gray-100">
        <div className="max-w-4xl mx-auto prose prose-indigo text-gray-600">
          <h3 className="text-xl font-bold text-gray-800 mb-4">About LocalSampark in {zoneName}, {cityName}</h3>
          <p>
            LocalSampark is India's premier neighborhood super-app, bringing the best of {zoneName} right to your fingertips. 
            Whether you reside in {zoneName} or are visiting {cityName}, our platform connects you with trusted local merchants, 
            rapid delivery services, verified property listings, and real-time community updates.
          </p>
          <p className="mt-4">
            Support local businesses in {stateName} by ordering through LocalSampark. Our zero-commission model for essential 
            services ensures that your favorite shops in {zoneName} retain more of their earnings, while you enjoy faster 
            hyperlocal delivery.
          </p>
        </div>
      </section>
    </div>
  );
}
