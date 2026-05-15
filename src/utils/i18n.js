// ── i18n: English / Marathi / Hindi ─────────────────────────────────────────
// Language state lives in LangProvider so ALL screens re-render on change.
// Wrap your app in <LangProvider> and use the `useLang()` hook in every screen.

import React, { createContext, useContext, useState } from 'react';

// ─── English ─────────────────────────────────────────────────────────────────
const en = {
  home:'Home',jobs:'Jobs',post:'Post',rooms:'Rooms',cars:'Cars',
  ourServices:'OUR SERVICES',findJobs:'Find Jobs',carRental:'Car Rental',
  roomsPG:'Rooms & PG',buySell:'Buy & Sell',recentJobs:'RECENT JOBS',
  viewAllJobs:'View all jobs →',aiJobMatch:'AI Job Match',myProfile:'My Profile',
  opening:'opening',openings:'openings',vehicles:'vehicles',listings:'listings',
  newBadge:'New',live:'Live',
  searchPlaceholder:'Search jobs, area, company…',jobsFound:'jobs found',
  noJobsFound:'No jobs found',tryDifferentFilters:'Try different filters',
  checkBackLater:'Check back later for new listings',postAJob:'Post a Job',
  aboutRole:'About the Role',contactEmployer:'Contact Employer',
  callFree:"Call or WhatsApp — It's FREE for you!",markApplied:'Mark Applied',
  applied:'Applied',save:'Save',saved:'Saved',whatsapp:'💬 WhatsApp',
  deleteJob:'🗑 Delete Job',featured:'Featured Listing — Top Placement',
  urgent:'Urgent Hiring — Apply Immediately',views:'views',postedAgo:'Posted',
  reportListing:'⚠️ Report Listing',reportSent:"Report submitted. We'll review it shortly.",
  shareJob:'📤 Share Job',postAJobTitle:'Post a Job',jobTitle:'Job Title',
  company:'Company Name',location:'Location / Area',salary:'Salary (e.g. ₹12,000/month)',
  phone:'Contact Phone',description:'Job Description',category:'Category',
  jobType:'Job Type',boost:'Boost this listing',featured_boost:'Featured (+₹49)',
  urgent_boost:'Urgent (+₹29)',submit:'Submit',paying:'Processing…',
  myJobs:'My Jobs',analytics:'Analytics',signOut:'Sign Out',
  onboard1Title:'Find Local Jobs',
  onboard1Sub:'Browse hundreds of jobs in Nanded — driver, security, shop, and more.',
  onboard2Title:'Rooms & Cars',
  onboard2Sub:'Rent a room or hire a car — everything local, everything affordable.',
  onboard3Title:'Post for Free',
  onboard3Sub:'Employers post jobs, rooms, and vehicles in minutes. Boost for more visibility.',
  getStarted:'Get Started',next:'Next',skip:'Skip',
  notifNewJob:'New job matching your profile!',
  notifListingView:'Someone viewed your listing',
  notifApplied:'New applicant on your job post',
  referralTitle:'Invite a Friend',
  referralSub:'Invite a friend and get a FREE Boosted listing when they post!',
  copyCode:'Copy Code',shareViaWhatsApp:'Share via WhatsApp',codeCopied:'Referral code copied!',
  reportTitle:'Report this Listing',reportSpam:'Spam',reportFraud:'Fraud / Scam',
  reportInappropriate:'Inappropriate Content',reportOther:'Other',
  reportSubmit:'Submit Report',reportCancel:'Cancel',
  verifiedEmployer:'✓ Verified Employer',lastActive:'Last active',justNow:'just now',ago:'ago',
  noPhotoTips:'📸 Photo Tips',photoTip1:'Use good natural lighting',
  photoTip2:'Keep background clean and tidy',photoTip3:'Take multiple angles',
  photoTip4:'Avoid blurry or dark photos',
  bookNow:'Book Now',perDay:'/day',available:'Available',notAvailable:'Not Available',
  roomDetails:'Room Details',jobDetails:'Job Details',carDetails:'Car Details',contact:'Contact',rent:'Rent',
  furnished:'Furnished',unfurnished:'Unfurnished',deposit:'Deposit',
  postRoom:'Post a Room',postCar:'Post a Car',
  sellItem:'Sell an Item',buyItem:'Buy Items',price:'Price',condition:'Condition',
  newItem:'New',usedItem:'Used',
  admin:'Admin',allUsers:'All Users',allJobs:'All Jobs',deleteUser:'Delete User',
  aiAssistant:'AI Career Assistant',askAnything:'Ask anything about jobs in Nanded…',send:'Send',
  // Extra UI strings
  activeJustNow:'Active just now',activeToday:'Active today',
  appliedCount:'applied',jobAlreadyFilled:'Job Already Filled',
  deleteJobTitle:'Delete Job',areYouSure:'Are you sure?',
  cancel:'Cancel',delete:'Delete',
  vehicleDetails:'VEHICLE DETAILS',includes:'INCLUDES',owner:'OWNER',
  roomDetails2:'ROOM DETAILS',amenities:'AMENITIES',ownerLandlord:'OWNER / LANDLORD',
  verified:'✓ Verified',availableNow:'Available now',limited:'Limited',
  photosLabel:'photos',respondsFast:'Responds fast',trips:'trips',
  front:'Front',side:'Side',inside:'Inside',back:'Back',interior:'Interior',
  room:'Room',kitchen:'Kitchen',bath:'Bath',outside:'Outside',
  bedroom:'Bedroom',bathroom:'Bathroom',
  inNanded:'in Nanded',
};

// ─── Marathi ──────────────────────────────────────────────────────────────────
const mr = {
  home:'मुख्यपृष्ठ',jobs:'नोकऱ्या',post:'पोस्ट',rooms:'खोल्या',cars:'गाड्या',
  ourServices:'आमच्या सेवा',findJobs:'नोकरी शोधा',carRental:'कार भाडे',
  roomsPG:'खोल्या आणि PG',buySell:'खरेदी-विक्री',recentJobs:'अलीकडील नोकऱ्या',
  viewAllJobs:'सर्व नोकऱ्या पहा →',aiJobMatch:'AI नोकरी मिळवा',myProfile:'माझे प्रोफाइल',
  opening:'जागा',openings:'जागा',vehicles:'वाहने',listings:'यादी',
  newBadge:'नवीन',live:'थेट',
  searchPlaceholder:'नोकरी, भाग, कंपनी शोधा…',jobsFound:'नोकऱ्या मिळाल्या',
  noJobsFound:'नोकरी मिळाली नाही',tryDifferentFilters:'वेगळे फिल्टर वापरा',
  checkBackLater:'नंतर नवीन जाहिराती पाहा',postAJob:'नोकरी पोस्ट करा',
  aboutRole:'नोकरीबद्दल',contactEmployer:'नियोक्त्याशी संपर्क करा',
  callFree:'कॉल किंवा WhatsApp करा — तुमच्यासाठी मोफत!',markApplied:'अर्ज केल्यावर चिन्हांकित करा',
  applied:'अर्ज केला',save:'जतन करा',saved:'जतन केले',whatsapp:'💬 WhatsApp',
  deleteJob:'🗑 नोकरी हटवा',featured:'वैशिष्ट्यीकृत जाहिरात — सर्वात वर',
  urgent:'तातडीची भरती — लगेच अर्ज करा',views:'दृश्ये',postedAgo:'पोस्ट केले',
  reportListing:'⚠️ तक्रार करा',reportSent:'तक्रार सादर केली. आम्ही लवकरच तपासू.',
  shareJob:'📤 नोकरी शेअर करा',postAJobTitle:'नोकरी पोस्ट करा',jobTitle:'नोकरीचे नाव',
  company:'कंपनीचे नाव',location:'ठिकाण / भाग',salary:'पगार (उदा. ₹12,000/महिना)',
  phone:'संपर्क नंबर',description:'नोकरीचे वर्णन',category:'प्रकार',
  jobType:'नोकरीचा प्रकार',boost:'हे जाहिरात बूस्ट करा',featured_boost:'वैशिष्ट्यीकृत (+₹49)',
  urgent_boost:'तातडीचे (+₹29)',submit:'सबमिट करा',paying:'प्रक्रिया होत आहे…',
  myJobs:'माझ्या नोकऱ्या',analytics:'विश्लेषण',signOut:'साइन आउट करा',
  onboard1Title:'स्थानिक नोकऱ्या शोधा',
  onboard1Sub:'नांदेडमधील शेकडो नोकऱ्या — चालक, सुरक्षा, दुकान आणि बरेच काही.',
  onboard2Title:'खोल्या आणि गाड्या',
  onboard2Sub:'खोली भाड्याने घ्या किंवा कार भाड्याने द्या — सर्व स्थानिक, सर्व परवडणारे.',
  onboard3Title:'मोफत पोस्ट करा',
  onboard3Sub:'नियोक्ते नोकऱ्या, खोल्या आणि वाहने काही मिनिटांत पोस्ट करतात.',
  getStarted:'सुरू करा',next:'पुढे',skip:'वगळा',
  notifNewJob:'तुमच्या प्रोफाइलशी जुळणारी नवीन नोकरी!',
  notifListingView:'कोणीतरी तुमची जाहिरात पाहिली',
  notifApplied:'तुमच्या नोकरी पोस्टवर नवीन अर्जदार',
  referralTitle:'मित्राला आमंत्रित करा',
  referralSub:'मित्राला आमंत्रित करा आणि ते पोस्ट करतात तेव्हा मोफत बूस्टेड लिस्टिंग मिळवा!',
  copyCode:'कोड कॉपी करा',shareViaWhatsApp:'WhatsApp द्वारे शेअर करा',codeCopied:'रेफरल कोड कॉपी केला!',
  reportTitle:'ही जाहिरात तक्रार करा',reportSpam:'स्पॅम',reportFraud:'फसवणूक / घोटाळा',
  reportInappropriate:'अयोग्य सामग्री',reportOther:'इतर',
  reportSubmit:'तक्रार सादर करा',reportCancel:'रद्द करा',
  verifiedEmployer:'✓ सत्यापित नियोक्ता',lastActive:'शेवटचे सक्रिय',justNow:'आत्ता',ago:'पूर्वी',
  noPhotoTips:'📸 फोटो टिप्स',photoTip1:'चांगला नैसर्गिक प्रकाश वापरा',
  photoTip2:'पार्श्वभूमी स्वच्छ ठेवा',photoTip3:'अनेक कोनांतून फोटो काढा',
  photoTip4:'अस्पष्ट किंवा अंधाऱ्या फोटोंपासून दूर राहा',
  bookNow:'आता बुक करा',perDay:'/दिवस',available:'उपलब्ध',notAvailable:'अनुपलब्ध',
  roomDetails:'खोलीचे तपशील',jobDetails:'नोकरीचे तपशील',carDetails:'कारचे तपशील',contact:'संपर्क',rent:'भाडे',
  furnished:'सुसज्ज',unfurnished:'असुसज्ज',deposit:'ठेव',
  postRoom:'खोली पोस्ट करा',postCar:'कार पोस्ट करा',
  sellItem:'वस्तू विका',buyItem:'वस्तू खरेदी करा',price:'किंमत',condition:'स्थिती',
  newItem:'नवीन',usedItem:'वापरलेले',
  admin:'प्रशासक',allUsers:'सर्व वापरकर्ते',allJobs:'सर्व नोकऱ्या',deleteUser:'वापरकर्ता हटवा',
  aiAssistant:'AI करिअर सहाय्यक',askAnything:'नांदेडमधील नोकऱ्यांबद्दल काहीही विचारा…',send:'पाठवा',
  // Extra UI strings
  activeJustNow:'आत्ता सक्रिय',activeToday:'आज सक्रिय',
  appliedCount:'अर्ज केले',jobAlreadyFilled:'नोकरी भरली गेली',
  deleteJobTitle:'नोकरी हटवा',areYouSure:'आपल्याला खात्री आहे का?',
  cancel:'रद्द करा',delete:'हटवा',
  vehicleDetails:'वाहनाचे तपशील',includes:'समाविष्ट',owner:'मालक',
  roomDetails2:'खोलीचे तपशील',amenities:'सुविधा',ownerLandlord:'मालक / घरमालक',
  verified:'✓ सत्यापित',availableNow:'आत्ता उपलब्ध',limited:'मर्यादित',
  photosLabel:'फोटो',respondsFast:'लवकर प्रतिसाद देतात',trips:'ट्रिप्स',
  front:'समोर',side:'बाजू',inside:'आत',back:'मागे',interior:'आतील',
  room:'खोली',kitchen:'स्वयंपाकघर',bath:'स्नानगृह',outside:'बाहेर',
  bedroom:'बेडरूम',bathroom:'बाथरूम',
  inNanded:'नांदेडमध्ये',
};

// ─── Hindi ────────────────────────────────────────────────────────────────────
const hi = {
  home:'होम',jobs:'नौकरियाँ',post:'पोस्ट',rooms:'कमरे',cars:'गाड़ियाँ',
  ourServices:'हमारी सेवाएं',findJobs:'नौकरी खोजें',carRental:'कार किराया',
  roomsPG:'कमरे और PG',buySell:'खरीदें-बेचें',recentJobs:'हाल की नौकरियाँ',
  viewAllJobs:'सभी नौकरियाँ देखें →',aiJobMatch:'AI नौकरी मिलान',myProfile:'मेरी प्रोफाइल',
  opening:'पद',openings:'पद',vehicles:'वाहन',listings:'सूची',
  newBadge:'नया',live:'लाइव',
  searchPlaceholder:'नौकरी, क्षेत्र, कंपनी खोजें…',jobsFound:'नौकरियाँ मिलीं',
  noJobsFound:'कोई नौकरी नहीं मिली',tryDifferentFilters:'अलग फिल्टर आज़माएं',
  checkBackLater:'नई लिस्टिंग के लिए बाद में देखें',postAJob:'नौकरी पोस्ट करें',
  aboutRole:'पद के बारे में',contactEmployer:'नियोक्ता से संपर्क करें',
  callFree:'कॉल या WhatsApp करें — यह आपके लिए मुफ्त है!',markApplied:'आवेदित चिह्नित करें',
  applied:'आवेदित',save:'सहेजें',saved:'सहेजा गया',whatsapp:'💬 WhatsApp',
  deleteJob:'🗑 नौकरी हटाएं',featured:'विशेष लिस्टिंग — शीर्ष स्थान',
  urgent:'तत्काल भर्ती — तुरंत आवेदन करें',views:'दृश्य',postedAgo:'पोस्ट किया',
  reportListing:'⚠️ रिपोर्ट करें',reportSent:'रिपोर्ट सबमिट हुई। हम जल्द समीक्षा करेंगे।',
  shareJob:'📤 नौकरी शेयर करें',postAJobTitle:'नौकरी पोस्ट करें',jobTitle:'नौकरी का शीर्षक',
  company:'कंपनी का नाम',location:'स्थान / क्षेत्र',salary:'वेतन (जैसे ₹12,000/माह)',
  phone:'संपर्क फोन',description:'नौकरी विवरण',category:'श्रेणी',
  jobType:'नौकरी का प्रकार',boost:'इस लिस्टिंग को बूस्ट करें',featured_boost:'विशेष (+₹49)',
  urgent_boost:'तत्काल (+₹29)',submit:'सबमिट करें',paying:'प्रक्रिया हो रही है…',
  myJobs:'मेरी नौकरियाँ',analytics:'विश्लेषण',signOut:'साइन आउट',
  onboard1Title:'स्थानीय नौकरियाँ खोजें',
  onboard1Sub:'नांदेड में सैकड़ों नौकरियाँ — ड्राइवर, सुरक्षा, दुकान और बहुत कुछ।',
  onboard2Title:'कमरे और गाड़ियाँ',
  onboard2Sub:'कमरा किराए पर लें या कार किराए पर दें — सब कुछ स्थानीय, सब कुछ किफायती।',
  onboard3Title:'मुफ्त में पोस्ट करें',
  onboard3Sub:'नियोक्ता मिनटों में नौकरियाँ, कमरे और वाहन पोस्ट करते हैं।',
  getStarted:'शुरू करें',next:'अगला',skip:'छोड़ें',
  notifNewJob:'आपकी प्रोफाइल से मेल खाती नई नौकरी!',
  notifListingView:'किसी ने आपकी लिस्टिंग देखी',
  notifApplied:'आपकी नौकरी पोस्ट पर नया आवेदक',
  referralTitle:'दोस्त को आमंत्रित करें',
  referralSub:'दोस्त को आमंत्रित करें और जब वे पोस्ट करें तो मुफ्त बूस्टेड लिस्टिंग पाएं!',
  copyCode:'कोड कॉपी करें',shareViaWhatsApp:'WhatsApp से शेयर करें',codeCopied:'रेफरल कोड कॉपी हुआ!',
  reportTitle:'इस लिस्टिंग की रिपोर्ट करें',reportSpam:'स्पैम',reportFraud:'धोखाधड़ी / घोटाला',
  reportInappropriate:'अनुचित सामग्री',reportOther:'अन्य',
  reportSubmit:'रिपोर्ट सबमिट करें',reportCancel:'रद्द करें',
  verifiedEmployer:'✓ सत्यापित नियोक्ता',lastActive:'अंतिम सक्रिय',justNow:'अभी',ago:'पहले',
  noPhotoTips:'📸 फोटो टिप्स',photoTip1:'अच्छी प्राकृतिक रोशनी का उपयोग करें',
  photoTip2:'पृष्ठभूमि साफ और व्यवस्थित रखें',photoTip3:'कई कोणों से फोटो लें',
  photoTip4:'धुंधले या अंधेरे फोटो से बचें',
  bookNow:'अभी बुक करें',perDay:'/दिन',available:'उपलब्ध',notAvailable:'अनुपलब्ध',
  roomDetails:'कमरे का विवरण',jobDetails:'नौकरी का विवरण',carDetails:'कार का विवरण',contact:'संपर्क',rent:'किराया',
  furnished:'सुसज्जित',unfurnished:'असुसज्जित',deposit:'जमा',
  postRoom:'कमरा पोस्ट करें',postCar:'कार पोस्ट करें',
  sellItem:'सामान बेचें',buyItem:'सामान खरीदें',price:'कीमत',condition:'स्थिति',
  newItem:'नया',usedItem:'पुराना',
  admin:'व्यवस्थापक',allUsers:'सभी उपयोगकर्ता',allJobs:'सभी नौकरियाँ',deleteUser:'उपयोगकर्ता हटाएं',
  aiAssistant:'AI करियर सहायक',askAnything:'नांदेड में नौकरियों के बारे में कुछ भी पूछें…',send:'भेजें',
  // Extra UI strings
  activeJustNow:'अभी सक्रिय',activeToday:'आज सक्रिय',
  appliedCount:'आवेदित',jobAlreadyFilled:'नौकरी भर गई',
  deleteJobTitle:'नौकरी हटाएं',areYouSure:'क्या आप सुनिश्चित हैं?',
  cancel:'रद्द करें',delete:'हटाएं',
  vehicleDetails:'वाहन विवरण',includes:'शामिल है',owner:'मालिक',
  roomDetails2:'कमरे का विवरण',amenities:'सुविधाएं',ownerLandlord:'मालिक / मकान मालिक',
  verified:'✓ सत्यापित',availableNow:'अभी उपलब्ध',limited:'सीमित',
  photosLabel:'फ़ोटो',respondsFast:'जल्दी जवाब देते हैं',trips:'यात्राएं',
  front:'सामने',side:'किनारा',inside:'अंदर',back:'पीछे',interior:'आंतरिक',
  room:'कमरा',kitchen:'रसोई',bath:'स्नानघर',outside:'बाहर',
  bedroom:'बेडरूम',bathroom:'बाथरूम',
  inNanded:'नांदेड में',
};

const strings = { en, mr, hi };

// Module-level lang (kept for backward compat, not for reactivity)
let _lang = 'en';
export function setLanguage(lang) { if (strings[lang]) _lang = lang; }
export function getLanguage() { return _lang; }
export function t(key) { return strings[_lang]?.[key] ?? strings.en?.[key] ?? key; }

// ─── React Context ─────────────────────────────────────────────────────────────
const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');

  function changeLang(code) {
    if (strings[code]) {
      setLanguage(code); // sync module-level
      setLang(code);
    }
  }

  function tr(key) {
    return strings[lang]?.[key] ?? strings.en?.[key] ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, changeLang, t: tr }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'mr', label: 'Marathi', native: 'मराठी'  },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी'   },
];
