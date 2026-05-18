import React, { createContext, useContext, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'EN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी' },
];

const STRINGS = {
  en: {
    // Navigation
    home: 'Home', jobs: 'Jobs', rooms: 'Rooms', cars: 'Cars', post: 'Post',
    // Screens
    findJobs: 'Find Jobs', roomsPG: 'Rooms/PG', carRental: 'Cars',
    buySell: 'Buy & Sell', ourServices: 'OUR SERVICES', recentJobs: 'RECENT JOBS',
    viewAllJobs: 'View All Jobs', seeAll: 'See all',
    // AI
    aiAssistant: 'AI Career Assistant', aiJobMatch: 'AI Job Match',
    askAnything: 'Ask anything about jobs in Nanded…',
    send: 'Ask AI',
    // Jobs
    postAJob: 'Post a Job', postAJobTitle: 'Post a Job',
    jobDetails: 'Job Details',
    applyNow: 'Apply Now', applied: 'Applied ✓',
    chatWhatsApp: 'Chat on WhatsApp',
    shareJob: 'Share Job', reportListing: 'Report Listing',
    opening: 'openings',
    // Applications
    applicationStatus: 'Application Status',
    statusApplied: 'Applied', statusReviewed: 'Reviewed',
    statusShortlisted: 'Shortlisted 🎉', statusRejected: 'Not Selected',
    statusHired: 'Hired 🎊',
    myApplications: 'My Applications',
    // Profile
    myProfile: 'My Profile', jobsPosted: 'Jobs Posted',
    jobsApplied: 'Applied', jobsSaved: 'Saved',
    referralTitle: 'Refer & Earn',
    // Rooms & Cars
    listings: 'listings', vehicles: 'vehicles',
    // Search
    searchPlaceholder: 'Search job title, company…',
    // Admin
    admin: 'Admin',
    // Common
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    loading: 'Loading…', error: 'Something went wrong',
    noResults: 'No results found', tryAgain: 'Try Again',
    // Referral
    referFriend: 'Refer a Friend', yourCode: 'YOUR REFERRAL CODE',
    shareWithFriends: 'Share with Friends', copyCode: 'Copy Code',
    howItWorks: 'How it works',
    referStep1Title: 'Share your code', referStep1Sub: 'Send it to friends in Nanded',
    referStep2Title: 'Friend signs up',  referStep2Sub: 'They use your code during registration',
    referStep3Title: 'Both get rewarded', referStep3Sub: 'Get free featured job post credits',
  },

  mr: {
    // Navigation
    home: 'मुख्यपृष्ठ', jobs: 'नोकऱ्या', rooms: 'खोल्या', cars: 'गाड्या', post: 'पोस्ट',
    // Screens
    findJobs: 'नोकऱ्या शोधा', roomsPG: 'खोल्या/PG', carRental: 'गाड्या',
    buySell: 'खरेदी-विक्री', ourServices: 'आमच्या सेवा', recentJobs: 'अलीकडील नोकऱ्या',
    viewAllJobs: 'सर्व नोकऱ्या पहा', seeAll: 'सर्व पहा',
    // AI
    aiAssistant: 'AI करिअर सहाय्यक', aiJobMatch: 'AI नोकरी जुळवणी',
    askAnything: 'नांदेडमधील नोकऱ्यांबद्दल काहीही विचारा…',
    send: 'AI ला विचारा',
    // Jobs
    postAJob: 'नोकरी पोस्ट करा', postAJobTitle: 'नोकरी पोस्ट करा',
    jobDetails: 'नोकरी तपशील',
    applyNow: 'आत्ता अर्ज करा', applied: 'अर्ज केला ✓',
    chatWhatsApp: 'WhatsApp वर बोला',
    shareJob: 'नोकरी शेअर करा', reportListing: 'तक्रार करा',
    opening: 'जागा',
    // Applications
    applicationStatus: 'अर्जाची स्थिती',
    statusApplied: 'अर्ज केला', statusReviewed: 'तपासले',
    statusShortlisted: 'निवड झाली 🎉', statusRejected: 'निवड नाही',
    statusHired: 'नोकरी मिळाली 🎊',
    myApplications: 'माझे अर्ज',
    // Profile
    myProfile: 'माझे प्रोफाइल', jobsPosted: 'पोस्ट केलेल्या नोकऱ्या',
    jobsApplied: 'अर्ज केलेल्या', jobsSaved: 'जतन केलेल्या',
    referralTitle: 'रेफर आणि कमवा',
    // Rooms & Cars
    listings: 'यादी', vehicles: 'वाहने',
    // Search
    searchPlaceholder: 'नोकरी, कंपनी शोधा…',
    // Admin
    admin: 'प्रशासक',
    // Common
    save: 'जतन करा', cancel: 'रद्द करा', delete: 'हटवा', edit: 'संपादित करा',
    loading: 'लोड होत आहे…', error: 'काहीतरी चुकले',
    noResults: 'परिणाम आढळले नाहीत', tryAgain: 'पुन्हा प्रयत्न करा',
    // Referral
    referFriend: 'मित्राला रेफर करा', yourCode: 'तुमचा रेफरल कोड',
    shareWithFriends: 'मित्रांसह शेअर करा', copyCode: 'कोड कॉपी करा',
    howItWorks: 'हे कसे कार्य करते',
    referStep1Title: 'कोड शेअर करा',     referStep1Sub: 'नांदेडमधील मित्रांना पाठवा',
    referStep2Title: 'मित्र नोंदणी करतो', referStep2Sub: 'ते नोंदणीच्या वेळी तुमचा कोड वापरतात',
    referStep3Title: 'दोघांना बक्षीस',    referStep3Sub: 'मोफत फीचर्ड जॉब क्रेडिट्स मिळवा',
  },

  hi: {
    // Navigation
    home: 'होम', jobs: 'नौकरियाँ', rooms: 'कमरे', cars: 'गाड़ियाँ', post: 'पोस्ट',
    // Screens
    findJobs: 'नौकरी खोजें', roomsPG: 'कमरे/PG', carRental: 'गाड़ियाँ',
    buySell: 'खरीदें-बेचें', ourServices: 'हमारी सेवाएं', recentJobs: 'हाल की नौकरियाँ',
    viewAllJobs: 'सभी नौकरियाँ देखें', seeAll: 'सब देखें',
    // AI
    aiAssistant: 'AI करियर सहायक', aiJobMatch: 'AI नौकरी मिलान',
    askAnything: 'नांदेड की नौकरियों के बारे में कुछ भी पूछें…',
    send: 'AI से पूछें',
    // Jobs
    postAJob: 'नौकरी पोस्ट करें', postAJobTitle: 'नौकरी पोस्ट करें',
    jobDetails: 'नौकरी विवरण',
    applyNow: 'अभी आवेदन करें', applied: 'आवेदन किया ✓',
    chatWhatsApp: 'WhatsApp पर चैट करें',
    shareJob: 'नौकरी शेयर करें', reportListing: 'रिपोर्ट करें',
    opening: 'रिक्तियाँ',
    // Applications
    applicationStatus: 'आवेदन की स्थिति',
    statusApplied: 'आवेदन किया', statusReviewed: 'समीक्षा हुई',
    statusShortlisted: 'शॉर्टलिस्ट हुए 🎉', statusRejected: 'चयन नहीं हुआ',
    statusHired: 'नौकरी मिली 🎊',
    myApplications: 'मेरे आवेदन',
    // Profile
    myProfile: 'मेरी प्रोफ़ाइल', jobsPosted: 'पोस्ट की नौकरियाँ',
    jobsApplied: 'आवेदन किए', jobsSaved: 'सहेजी गई',
    referralTitle: 'रेफर करें और कमाएं',
    // Rooms & Cars
    listings: 'सूचियाँ', vehicles: 'वाहन',
    // Search
    searchPlaceholder: 'नौकरी, कंपनी खोजें…',
    // Admin
    admin: 'एडमिन',
    // Common
    save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएं', edit: 'संपादित करें',
    loading: 'लोड हो रहा है…', error: 'कुछ गलत हुआ',
    noResults: 'कोई परिणाम नहीं मिला', tryAgain: 'फिर कोशिश करें',
    // Referral
    referFriend: 'दोस्त को रेफर करें', yourCode: 'आपका रेफरल कोड',
    shareWithFriends: 'दोस्तों के साथ शेयर करें', copyCode: 'कोड कॉपी करें',
    howItWorks: 'यह कैसे काम करता है',
    referStep1Title: 'कोड शेयर करें',     referStep1Sub: 'नांदेड के दोस्तों को भेजें',
    referStep2Title: 'दोस्त साइन अप करे', referStep2Sub: 'वे रजिस्ट्रेशन के दौरान आपका कोड उपयोग करें',
    referStep3Title: 'दोनों को इनाम',     referStep3Sub: 'मुफ़्त फ़ीचर्ड जॉब क्रेडिट पाएं',
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');
  function changeLang(code) { setLang(code); }
  function t(key) { return STRINGS[lang]?.[key] || STRINGS.en[key] || key; }
  return (
    <LangContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}
