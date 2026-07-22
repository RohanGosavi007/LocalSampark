const { query } = require('../../../config/database');

// Static Database for Non-AI Mode
const FAQ_DB = [
  { 
    keywords: ['order', 'track', 'food', 'grocery', 'ecommerce'], 
    answer: 'E-Commerce & Ordering Mode: LocalSampark offers a comprehensive hyperlocal e-commerce experience. You can order groceries, food from restaurants, pharmacy medicines, and electronics directly from local Shop Owners. We support 3 fulfillment modes: 1) Home Delivery via our Delivery Agents, 2) Store Pickup for skipping queues, and 3) Dine-in for restaurants. To track your order in real-time, navigate to the Orders tab in your Resident Dashboard where you can see live GPS tracking of the agent and status updates.' 
  },
  { 
    keywords: ['refund', 'money', 'cancel', 'payment'], 
    answer: 'Payments & Refunds: We support multiple payment methods including UPI, Credit/Debit cards, and the integrated LocalSampark Wallet. If an order is cancelled before the shop accepts it, the refund is instant to your wallet. If paid via card/UPI, refunds are processed within 5-7 business days to your original payment method. You can view all transaction history in the Wallet tab.' 
  },
  { 
    keywords: ['shop', 'vendor', 'sell', 'merchant', 'business'], 
    answer: 'Shop Owner Mode: As a registered Shop Owner, you get a dedicated Dashboard to manage your business. Features include: 1) Real-time Swiggy/Zomato style ringing alerts on your mobile for new orders. 2) Complete CRUD operations for your product catalog. 3) Analytics to track your daily/weekly revenue. 4) The ability to create custom Promo Codes. 5) Management of Appointment slots if you offer services. To join, select the Shop Owner role upon registration and our Field Agent will verify your documents.' 
  },
  { 
    keywords: ['delivery', 'agent', 'job', 'runner', 'earn'], 
    answer: 'Delivery Agent Mode: Delivery agents get a specialized app interface. You can view Available Orders nearby, Accept/Reject them, and use the integrated GPS Route Map for active deliveries. Earnings are calculated based on a Base Fee + Per KM rate, with surge multipliers for late night or bad weather. Payouts can be tracked in the Earnings tab and withdrawn weekly.' 
  },
  { 
    keywords: ['carpool', 'ride', 'share', 'travel', 'commute'], 
    answer: 'Carpool & Community Mode: Our enhanced Carpool system allows residents to share daily commutes. Drivers can post recurring rides, set seat prices, and restrict rides to Women-Only for safety. Riders can search by route, time, and price. Once a booking is made, a secure OTP is generated for ride verification, and live tracking is enabled. Payment is seamlessly handled via the LocalSampark Wallet.' 
  },
  { 
    keywords: ['property', 'rent', 'buy', 'real estate', 'flat', 'house'], 
    answer: 'Real Estate & Properties Mode: The Properties module allows residents to list flats, apartments, or commercial spaces for Rent or Sale. As a buyer/tenant, you can filter listings by BHK configuration (1BHK, 2BHK, etc.), price range, and society name. Listings include detailed stats and high-quality image cards. Contact the owner directly through the app.' 
  },
  { 
    keywords: ['appointment', 'salon', 'clinic', 'book', 'service'], 
    answer: 'Appointment Booking Mode: For Service Providers (Salons, Clinics, Plumbers), users can book specific time slots. The flow allows you to: 1) Select multiple services, 2) Choose a preferred staff member, 3) Pick an available date/time slot. Upon confirmation, you receive a unique QR code which the service provider scans to start the job. Service Providers get a dedicated dashboard to manage their calendar and earnings.' 
  },
  { 
    keywords: ['admin', 'revenue', 'franchise', 'partner', 'territory'], 
    answer: 'Franchise & Admin Mode: Franchise partners (Territory Admins) get a powerful dashboard to oversee their zone. They can monitor Field Agents, view heatmaps of active shops, and track their commission splits (e.g., 25% of order fees). The Super Admin gets a global God-Mode panel with a comprehensive Revenue Management Center to configure platform fees, surge pricing rules, subscription plans (SamparkPlus), and export Tally/QuickBooks compliant financial CSVs.' 
  },
  { 
    keywords: ['website', 'modes', 'features', 'what is localsampark'], 
    answer: 'LocalSampark is a complete hyperlocal ecosystem bridging the gap between local businesses and residents. The platform encompasses: 1) E-Commerce & Deliveries, 2) Service Appointments, 3) Community Carpool, 4) Real Estate Listings, 5) Social Stories/Updates, and 6) Franchise Management. It relies on a strict Role-Based Access Control (RBAC) system ensuring every user—from Residents to Security Guards to Shop Owners—gets a tailored app experience.' 
  }
];

exports.handleChatMessage = async (req, res, next) => {
  try {
    const { message, visitorDetails, isFinal } = req.body;

    // If it's the final step where visitor submits their details
    if (isFinal && visitorDetails) {
      // In a real scenario, we'd save visitor details to the database (leads/support table)
      console.log('Lead Captured:', visitorDetails);
      return res.json({
        success: true,
        reply: "Thank you for providing your details. We will contact you back soon."
      });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messageLower = message.toLowerCase();

    // Check if Gemini AI is configured (Dual Mode)
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (geminiKey && geminiKey !== 'your_gemini_key_here') {
      // AI Mode Active (Placeholder for actual Google Gemini integration)
      console.log('Gemini AI Mode Triggered for:', message);
      return res.json({
        success: true,
        mode: 'ai',
        reply: "[Gemini AI Assistant] I understand you are asking about: " + message + ". Here is an AI-generated response based on the platform data."
      });
    }

    // Non-AI Fallback Mode
    let bestMatch = null;
    let maxMatches = 0;

    FAQ_DB.forEach(faq => {
      let matches = 0;
      faq.keywords.forEach(kw => {
        if (messageLower.includes(kw)) matches++;
      });
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = faq;
      }
    });

    let reply = bestMatch 
      ? bestMatch.answer 
      : "I'm sorry, I don't have an automated answer for that. Could you please provide your Name and Phone Number so our support team can reach out to you?";
    
    let needsDetails = !bestMatch; // If we didn't find an answer, trigger the detail collection flow

    res.json({
      success: true,
      mode: 'static',
      reply,
      needsDetails
    });

  } catch (error) {
    next(error);
  }
};
