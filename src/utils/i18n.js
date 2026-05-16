import React, { createContext, useContext, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'EN' },
  { code: 'mr', label: 'Marathi',  native: 'मराठी' },
  { code: 'hi', label: 'Hindi',    native: 'हिंदी' },
];

const STRINGS = {
  en: {
    home: 'Home', jobs: 'Jobs', rooms: 'Rooms', cars: 'Cars', post: 'Post',
    findJobs: 'Find Jobs', roomsPG: 'Rooms/PG', carRental: 'Cars',
    buySell: 'Buy & Sell', ourServices: 'OUR SERVICES', recentJobs: 'RECENT JOBS',
    viewAllJobs: 'View All Jobs', seeAll: 'See all',
    aiAssistant: 'AI Career Assistant', aiJobMatch: 'AI Job Match',
    postAJob: 'Post a Job', postAJobTitle: 'Post a Job',
    jobDetails: 'Job Details', myProfile: 'My Profile',
    admin: 'Admin', referralTitle: 'Refer & Earn',
    opening: 'openings', listings: 'listings', vehicles: 'vehicles',
    searchPlaceholder: 'Search job title, company…',
    applyNow: 'Apply Now', chatWhatsApp: 'Chat on WhatsApp',
    shareJob: 'Share Job', reportListing: 'Report Listing',
  },
  mr: {
    home: 'मुख्यपृष्ठ', jobs: 'नोकऱ्या', rooms: 'खोल्या', cars: 'गाड्या', post: 'पोस्ट',
    findJobs: 'नोकऱ्या शोधा', roomsPG: 'खोल्या/PG', carRental: 'गाड्या',
    buySell: 'खरेदी-विक्री', ourServices: 'आमच्या सेवा', recentJobs: 'अलीकडील नोकऱ्या',
    viewAllJobs: 'सर्व नोकऱ्या पहा', seeAll: 'सर्व पहा',
    aiAssistant: 'AI करिअर सहाय्यक', aiJobMatch: 'AI नोकरी जुळवणी',
    postAJob: 'नोकरी पोस्ट करा', postAJobTitle: 'नोकरी पोस्ट करा',
    jobDetails: 'नोकरी तपशील', myProfile: 'माझे प्रोफाइल',
    admin: 'प्रशासक', referralTitle: 'रेफर आणि कमवा',
    opening: 'जागा', listings: 'यादी', vehicles: 'वाहने',
    searchPlaceholder: 'नोकरी, कंपनी शोधा…',
    applyNow: 'आत्ता अर्ज करा', chatWhatsApp: 'WhatsApp वर बोला',
    shareJob: 'नोकरी शेअर करा', reportListing: 'तक्रार करा',
  },
  hi: {
    home: 'होम', jobs: 'नौकरियाँ', rooms: 'कमरे', cars: 'गाड़ियाँ', post: 'पोस्ट',
    findJobs: 'नौकरी खोजें', roomsPG: 'कमरे/PG', carRental: 'गाड़ियाँ',
    buySell: 'खरीदें-बेचें', ourServices: 'हमारी सेवाएं', recentJobs: 'हाल की नौकरियाँ',
    viewAllJobs: 'सभी नौकरियाँ देखें', seeAll: 'सब देखें',
    aiAssistant: 'AI करियर सहायक', aiJobMatch: 'AI नौकरी मिलान',
    postAJob: 'नौकरी पोस्ट करें', postAJobTitle: 'नौकरी पोस्ट करें',
    jobDetails: 'नौकरी विवरण', myProfile: 'मेरी प्रोफ़ाइल',
    admin: 'एडमिन', referralTitle: 'रेफर करें और कमाएं',
    opening: 'रिक्तियाँ', listings: 'सूचियाँ', vehicles: 'वाहन',
    searchPlaceholder: 'नौकरी, कंपनी खोजें…',
    applyNow: 'अभी आवेदन करें', chatWhatsApp: 'WhatsApp पर चैट करें',
    shareJob: 'नौकरी शेयर करें', reportListing: 'रिपोर्ट करें',
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
