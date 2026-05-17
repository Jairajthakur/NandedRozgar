import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { http } from '../utils/api';

const { width: SW } = Dimensions.get('window');
const TEAL   = '#0d9488';
const ORANGE = '#f97316';
const TOTAL  = 5;

const ROOM_TYPES = [
  { label: 'Single Room',  sub: '1 room, shared or private bathroom' },
  { label: '1 BHK Flat',   sub: '1 Bedroom + Hall + Kitchen' },
  { label: '2 BHK Flat',   sub: '2 Bedrooms + Hall + Kitchen' },
  { label: '3 BHK Flat',   sub: '3 Bedrooms + Hall + Kitchen' },
  { label: 'PG / Hostel',  sub: 'Shared accommodation with meals' },
];
const FURNISHING_OPTS = [
  { label: 'Fully Furnished',  sub: 'Bed, wardrobe, fridge, TV included' },
  { label: 'Semi Furnished',   sub: 'Basic furniture only' },
  { label: 'Unfurnished',      sub: 'Empty flat, tenant furnishes' },
];
const FLOOR_OPTS    = ['Ground','1st','2nd','3rd','4th','5th','6th+'];
const BATHROOM_OPTS = ['1','2','3','4'];
const SUITABLE_FOR  = [
  { label: 'Anyone',           sub: 'Male or female tenants' },
  { label: 'Male only',        sub: null },
  { label: 'Female only',      sub: null },
  { label: 'Family preferred', sub: null },
];
const AREAS = [
  'Vazirabad','Shivaji Nagar','Cidco','Nanded City','Old Nanded',
  'Vishnupuri','Guru Nanak Nagar','Naigaon','Ardhapur','Hadgaon','Other',
];
const AVAILABLE_FROM = [
  { label: 'Immediately',   sub: 'Ready to move in right now' },
  { label: 'Within 7 Days', sub: null },
  { label: 'This Month',    sub: null },
  { label: 'Next Month',    sub: null },
];
const AMENITIES = [
  'WiFi / Broadband','AC','Meals Included','Parking','Power Backup',
  '24/7 Security','Lift','Water 24/7','CCTV','Geyser','Laundry','Cook Available',
];
const PLANS = [
  { days:15,  label:'15 Days',  price:69,  popular:false },
  { days:30,  label:'1 Month',  price:99,  popular:true  },
  { days:60,  label:'2 Months', price:169, popular:false },
  { days:90,  label:'3 Months', price:229, popular:false },
];
const STEP_META = [
  { title:'Room Details',       sub:'Tell us about the room type' },
  { title:'Location & Rent',    sub:'Set area, rent and availability' },
  { title:'Amenities & Photos', sub:'Add amenities, photos and contact' },
  { title:'Choose Plan',        sub:'How long should your listing stay live?' },
  { title:'Review & Post',      sub:'Confirm your listing before going live' },
];

export default function PostRoomScreen() {
  const nav = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState({
    roomType:'1 BHK Flat', furnishing:'Fully Furnished', floor:'Ground',
    bathrooms:'1', suitableFor:'Anyone', area:'Vazirabad',
    landmark:'', rent:'', deposit:'', availableFrom:'Immediately',
    amenities:[], notes:'', whatsapp:'', plan:PLANS[1],
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleAmenity = a => set('amenities', form.amenities.includes(a)
    ? form.amenities.filter(x=>x!==a) : [...form.amenities,a]);

  function animateStep(dir, cb) {
    Animated.parallel([
      Animated.timing(slideAnim,{toValue:dir==='next'?-SW:SW,duration:220,useNativeDriver:true}),
      Animated.timing(fadeAnim, {toValue:0,duration:150,useNativeDriver:true}),
    ]).start(()=>{
      slideAnim.setValue(dir==='next'?SW:-SW); cb();
      Animated.parallel([
        Animated.spring(slideAnim,{toValue:0,tension:60,friction:10,useNativeDriver:true}),
        Animated.timing(fadeAnim, {toValue:1,duration:200,useNativeDriver:true}),
      ]).start();
    });
  }

  function next() {
    if (step===1 && !form.roomType){Alert.alert('Required','Select room type');return;}
    if (step===2 && !form.rent)    {Alert.alert('Required','Enter monthly rent');return;}
    if (step===3 && !form.whatsapp){Alert.alert('Required','Enter WhatsApp number');return;}
    if (step<TOTAL) animateStep('next',()=>setStep(s=>s+1));
  }
  function back() {
    if (step>1) animateStep('back',()=>setStep(s=>s-1)); else nav.goBack();
  }

  async function submit() {
    if (!form.rent||!form.area||!form.whatsapp){
      Alert.alert('Missing Info','Rent, area and WhatsApp are required'); return;
    }
    setLoading(true);
    try {
      const r = await http('POST','/api/rooms',{
        roomType:form.roomType, furnished:form.furnishing, floor:form.floor,
        forGender:form.suitableFor, vacancies:1, rent:form.rent,
        deposit:form.deposit, amenities:form.amenities,
        availableFrom:form.availableFrom, tenantPref:form.suitableFor,
        area:form.area, landmark:form.landmark, whatsapp:form.whatsapp,
        description:form.notes, planDays:form.plan.days,
        planLabel:form.plan.label, planPrice:form.plan.price,
      });
      if (r.ok) {
        Toast.show({type:'success',text1:'✅ Room listed successfully!'});
        nav.goBack();
      } else {
        Alert.alert('Error',r.error||'Failed to post room');
      }
    } catch {
      Alert.alert('Error','Something went wrong');
    } finally { setLoading(false); }
  }

  const meta = STEP_META[step-1];

  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:'#f5f5f5'}}
      behavior={Platform.OS==='ios'?'padding':undefined}>

      {/* Top nav */}
      <View style={s.topNav}>
        <TouchableOpacity onPress={back} style={s.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#fff"/>
        </TouchableOpacity>
        <Text style={s.stepLbl}>Step {step} of {TOTAL}</Text>
      </View>

      {/* Progress dots */}
      <View style={s.dotsRow}>
        {Array.from({length:TOTAL}).map((_,i)=>(
          <View key={i} style={[s.dot, i<step&&s.dotDone, i===step-1&&s.dotCur]}/>
        ))}
      </View>

      {/* Banner */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>{meta.title}</Text>
        <Text style={s.bannerSub}>{meta.sub}</Text>
      </View>

      {/* Animated content */}
      <Animated.View style={{flex:1,transform:[{translateX:slideAnim}],opacity:fadeAnim}}>
        <ScrollView style={{flex:1}} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          {/* STEP 1 */}
          {step===1&&<>
            <Lbl>ROOM / ACCOMMODATION TYPE *</Lbl>
            {ROOM_TYPES.map(t=><RadioCard key={t.label} label={t.label} sub={t.sub}
              selected={form.roomType===t.label} onPress={()=>set('roomType',t.label)} color={TEAL}/>)}

            <Lbl style={{marginTop:18}}>FURNISHING</Lbl>
            {FURNISHING_OPTS.map(f=><RadioCard key={f.label} label={f.label} sub={f.sub}
              selected={form.furnishing===f.label} onPress={()=>set('furnishing',f.label)} color={ORANGE}/>)}

            <View style={s.row}>
              <View style={{flex:1}}>
                <Lbl>FLOOR</Lbl>
                <Picker value={form.floor} options={FLOOR_OPTS} onSelect={v=>set('floor',v)}/>
              </View>
              <View style={{width:12}}/>
              <View style={{flex:1}}>
                <Lbl>BATHROOMS</Lbl>
                <Picker value={form.bathrooms} options={BATHROOM_OPTS} onSelect={v=>set('bathrooms',v)}/>
              </View>
            </View>

            <Lbl style={{marginTop:18}}>SUITABLE FOR</Lbl>
            {SUITABLE_FOR.map(x=><RadioCard key={x.label} label={x.label} sub={x.sub}
              selected={form.suitableFor===x.label} onPress={()=>set('suitableFor',x.label)} color={ORANGE}/>)}
          </>}

          {/* STEP 2 */}
          {step===2&&<>
            <Lbl>AREA / LOCALITY *</Lbl>
            <Picker value={form.area} options={AREAS} onSelect={v=>set('area',v)} fullWidth/>

            <Lbl style={{marginTop:16}}>NEARBY LANDMARK</Lbl>
            <TextInput style={s.input} placeholder="e.g. Near Bus Stand, Behind HDFC Bank"
              value={form.landmark} onChangeText={v=>set('landmark',v)}/>

            <Lbl style={{marginTop:16}}>MONTHLY RENT (₹) *</Lbl>
            <View style={s.prefixRow}>
              <Text style={s.prefix}>₹</Text>
              <TextInput style={s.prefixField} placeholder="e.g. 5500"
                keyboardType="numeric" value={form.rent} onChangeText={v=>set('rent',v)}/>
            </View>

            <Lbl style={{marginTop:16}}>SECURITY DEPOSIT (₹)</Lbl>
            <View style={s.prefixRow}>
              <Text style={s.prefix}>₹</Text>
              <TextInput style={s.prefixField} placeholder="e.g. 11000 (2 months)"
                keyboardType="numeric" value={form.deposit} onChangeText={v=>set('deposit',v)}/>
            </View>

            <Lbl style={{marginTop:16}}>AVAILABLE FROM</Lbl>
            {AVAILABLE_FROM.map(a=><RadioCard key={a.label} label={a.label} sub={a.sub}
              selected={form.availableFrom===a.label} onPress={()=>set('availableFrom',a.label)} color={ORANGE}/>)}
          </>}

          {/* STEP 3 */}
          {step===3&&<>
            <Lbl>AMENITIES AVAILABLE</Lbl>
            <View style={s.chipWrap}>
              {AMENITIES.map(a=>(
                <TouchableOpacity key={a}
                  style={[s.chip, form.amenities.includes(a)&&s.chipOn]}
                  onPress={()=>toggleAmenity(a)}>
                  <Text style={[s.chipTxt, form.amenities.includes(a)&&s.chipTxtOn]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Lbl style={{marginTop:18}}>ROOM PHOTOS</Lbl>
            <View style={s.photoGrid}>
              {['Living Area','Bedroom','Kitchen','Bathroom'].map(lbl=>(
                <TouchableOpacity key={lbl} style={s.photoBox}>
                  <Ionicons name="camera-outline" size={22} color={TEAL}/>
                  <Text style={s.photoLbl}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.uploadBox}>
              <Ionicons name="cloud-upload-outline" size={26} color={TEAL}/>
              <Text style={s.uploadTitle}>Upload room photos</Text>
              <Text style={s.uploadSub}>Listings with photos rent 4× faster</Text>
            </TouchableOpacity>

            <Lbl style={{marginTop:18}}>ADDITIONAL NOTES</Lbl>
            <TextInput style={[s.input,{height:90,textAlignVertical:'top',paddingTop:12}]}
              placeholder="Rules (no pets, no cooking), nearby facilities, transport access..."
              multiline value={form.notes} onChangeText={v=>set('notes',v)}/>

            <Lbl style={{marginTop:16}}>WHATSAPP NUMBER *</Lbl>
            <TextInput style={s.input} placeholder="+91 98765 43210"
              keyboardType="phone-pad" value={form.whatsapp}
              onChangeText={v=>set('whatsapp',v)}/>
          </>}

          {/* STEP 4 */}
          {step===4&&<>
            <Text style={s.planQ}>How long should your listing stay live?</Text>
            <Text style={s.planNote}>Your listing is automatically removed after the selected period.</Text>
            <View style={s.planGrid}>
              {PLANS.map(p=>(
                <TouchableOpacity key={p.days}
                  style={[s.planCard, form.plan.days===p.days&&{backgroundColor:TEAL,borderColor:TEAL}]}
                  onPress={()=>set('plan',p)}>
                  {p.popular&&<View style={s.popBadge}><Text style={s.popTxt}>★ POPULAR</Text></View>}
                  <Ionicons name="calendar" size={28} color={form.plan.days===p.days?'#fff':'#6b7280'}/>
                  <Text style={[s.planLabel,form.plan.days===p.days&&{color:'#fff'}]}>{p.label}</Text>
                  <Text style={[s.planType, form.plan.days===p.days&&{color:'rgba(255,255,255,0.75)'}]}>listing</Text>
                  <Text style={[s.planPrice,form.plan.days===p.days&&{color:'#fff'}]}>₹{p.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.planFeats}>
              {[['flash-outline','Instant Activation'],['shield-checkmark-outline','Secure UPI / Card'],['refresh-outline','Renewable Anytime']].map(([ic,lb])=>(
                <View key={lb} style={s.planFeat}>
                  <Ionicons name={ic} size={18} color={TEAL}/>
                  <Text style={s.planFeatTxt}>{lb}</Text>
                </View>
              ))}
            </View>
          </>}

          {/* STEP 5 */}
          {step===5&&<>
            <Text style={s.reviewH}>Review your room listing:</Text>
            <View style={s.revCard}>
              {[['TYPE',form.roomType],['FURNISHING',form.furnishing],['FLOOR',form.floor],
                ['BATHROOMS',form.bathrooms],['FOR',form.suitableFor]].map(([k,v])=>(
                <RevRow key={k} label={k} value={v}/>
              ))}
            </View>
            <View style={[s.revCard,{marginTop:12}]}>
              {[['AREA',form.area],['LANDMARK',form.landmark||'—'],
                ['RENT',form.rent?`₹${form.rent}/mo`:'Not set'],
                ['DEPOSIT',form.deposit?`₹${form.deposit}`:'—'],
                ['AVAILABLE',form.availableFrom]].map(([k,v])=>(
                <RevRow key={k} label={k} value={v}/>
              ))}
            </View>
            <View style={[s.revCard,{marginTop:12}]}>
              {[['AMENITIES',form.amenities.length?form.amenities.join(', '):'None'],
                ['WHATSAPP',form.whatsapp||'Not set'],
                ['PLAN',`${form.plan.label} – ₹${form.plan.price}`]].map(([k,v])=>(
                <RevRow key={k} label={k} value={v}/>
              ))}
            </View>
          </>}

          <View style={{height:24}}/>
        </ScrollView>
      </Animated.View>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.backBtnB} onPress={back}>
          <Text style={s.backBtnTxt}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.continueBtn, loading&&{opacity:0.7}]}
          onPress={step===TOTAL?submit:next} disabled={loading}>
          {loading
            ?<ActivityIndicator color="#fff"/>
            :<Text style={s.continueTxt}>{step===TOTAL?'Post Listing':'Continue'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Lbl({children,style}){
  return <Text style={[s.lbl,style]}>{children}</Text>;
}
function RadioCard({label,sub,selected,onPress,color}){
  return(
    <TouchableOpacity
      style={[s.radioCard,selected&&{borderColor:color,backgroundColor:color+'14'}]}
      onPress={onPress} activeOpacity={0.7}>
      <View style={[s.radio,selected&&{borderColor:color}]}>
        {selected&&<View style={[s.radioDot,{backgroundColor:color}]}/>}
      </View>
      <View style={{flex:1}}>
        <Text style={[s.radioLbl,selected&&{color:'#111',fontWeight:'700'}]}>{label}</Text>
        {sub&&<Text style={s.radioSub}>{sub}</Text>}
      </View>
    </TouchableOpacity>
  );
}
function Picker({value,options,onSelect,fullWidth}){
  const [open,setOpen]=useState(false);
  return(
    <View style={[{position:'relative',zIndex:10},fullWidth&&{width:'100%'}]}>
      <TouchableOpacity style={s.dd} onPress={()=>setOpen(o=>!o)}>
        <Text style={s.ddVal}>{value}</Text>
        <Ionicons name={open?'chevron-up':'chevron-down'} size={16} color="#555"/>
      </TouchableOpacity>
      {open&&(
        <View style={s.ddMenu}>
          {options.map(o=>(
            <TouchableOpacity key={o} style={s.ddItem}
              onPress={()=>{onSelect(o);setOpen(false);}}>
              <Text style={[s.ddItemTxt,o===value&&{color:ORANGE,fontWeight:'700'}]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
function RevRow({label,value}){
  return(
    <View style={s.revRow}>
      <Text style={s.revLabel}>{label}</Text>
      <Text style={s.revValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  topNav:      {flexDirection:'row',justifyContent:'space-between',alignItems:'center',
                 backgroundColor:TEAL,paddingHorizontal:16,
                 paddingTop:Platform.OS==='ios'?50:14,paddingBottom:10},
  backBtn:     {width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,0.25)',
                 justifyContent:'center',alignItems:'center'},
  stepLbl:     {fontSize:13,fontWeight:'700',color:'rgba(255,255,255,0.9)'},
  dotsRow:     {flexDirection:'row',gap:6,paddingHorizontal:16,paddingVertical:8,backgroundColor:TEAL},
  dot:         {flex:1,height:3,borderRadius:2,backgroundColor:'rgba(255,255,255,0.3)'},
  dotDone:     {backgroundColor:'rgba(255,255,255,0.65)'},
  dotCur:      {backgroundColor:'#fff'},
  banner:      {backgroundColor:TEAL,paddingHorizontal:16,paddingBottom:20},
  bannerTitle: {fontSize:22,fontWeight:'800',color:'#fff'},
  bannerSub:   {fontSize:13,color:'rgba(255,255,255,0.85)',marginTop:2},
  body:        {padding:16,paddingBottom:40},
  lbl:         {fontSize:11,fontWeight:'700',color:'#888',letterSpacing:0.8,marginBottom:10,textTransform:'uppercase'},
  radioCard:   {flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:'#e5e5e5',
                 borderRadius:12,padding:14,marginBottom:10,backgroundColor:'#fff'},
  radio:       {width:20,height:20,borderRadius:10,borderWidth:2,borderColor:'#ccc',
                 justifyContent:'center',alignItems:'center'},
  radioDot:    {width:10,height:10,borderRadius:5},
  radioLbl:    {fontSize:14,fontWeight:'600',color:'#555'},
  radioSub:    {fontSize:12,color:'#999',marginTop:2},
  row:         {flexDirection:'row',marginTop:18},
  dd:          {flexDirection:'row',justifyContent:'space-between',alignItems:'center',
                 backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e5e5',
                 borderRadius:10,paddingHorizontal:14,paddingVertical:13},
  ddVal:       {fontSize:14,color:'#333',fontWeight:'500'},
  ddMenu:      {position:'absolute',top:50,left:0,right:0,backgroundColor:'#fff',borderWidth:1,
                 borderColor:'#e5e5e5',borderRadius:10,zIndex:999,shadowColor:'#000',
                 shadowOpacity:0.1,shadowRadius:6,elevation:6,maxHeight:220},
  ddItem:      {paddingHorizontal:14,paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#f0f0f0'},
  ddItemTxt:   {fontSize:14,color:'#333'},
  input:       {backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e5e5',borderRadius:10,
                 paddingHorizontal:14,paddingVertical:13,fontSize:14,color:'#111'},
  prefixRow:   {flexDirection:'row',alignItems:'center',backgroundColor:'#fff',
                 borderWidth:1,borderColor:'#e5e5e5',borderRadius:10,paddingHorizontal:14},
  prefix:      {fontSize:15,color:'#666',marginRight:6},
  prefixField: {flex:1,paddingVertical:13,fontSize:14,color:'#111'},
  chipWrap:    {flexDirection:'row',flexWrap:'wrap',gap:8},
  chip:        {paddingVertical:7,paddingHorizontal:13,borderRadius:20,backgroundColor:'#fff',
                 borderWidth:1.5,borderColor:'#e5e5e5'},
  chipOn:      {borderColor:TEAL,backgroundColor:TEAL+'15'},
  chipTxt:     {fontSize:13,fontWeight:'600',color:'#555'},
  chipTxtOn:   {color:TEAL},
  photoGrid:   {flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:12},
  photoBox:    {width:'47%',height:90,borderWidth:1.5,borderColor:TEAL+'80',borderStyle:'dashed',
                 borderRadius:10,justifyContent:'center',alignItems:'center',
                 backgroundColor:TEAL+'08',gap:6},
  photoLbl:    {fontSize:12,fontWeight:'600',color:TEAL},
  uploadBox:   {borderWidth:1.5,borderColor:'#ccc',borderStyle:'dashed',borderRadius:12,
                 padding:20,alignItems:'center',gap:6,backgroundColor:'#fff'},
  uploadTitle: {fontSize:14,fontWeight:'700',color:'#333'},
  uploadSub:   {fontSize:12,color:'#888'},
  planQ:       {fontSize:14,fontWeight:'600',color:'#333',marginBottom:4},
  planNote:    {fontSize:12,color:'#888',marginBottom:16},
  planGrid:    {flexDirection:'row',flexWrap:'wrap',gap:10},
  planCard:    {width:'47%',backgroundColor:'#fff',borderWidth:1.5,borderColor:'#e5e5e5',
                 borderRadius:14,padding:16,alignItems:'center',gap:4,position:'relative',overflow:'hidden'},
  popBadge:    {position:'absolute',top:8,right:8,backgroundColor:'rgba(255,255,255,0.25)',
                 borderRadius:10,paddingHorizontal:6,paddingVertical:2},
  popTxt:      {fontSize:9,color:'#fff',fontWeight:'800'},
  planLabel:   {fontSize:15,fontWeight:'800',color:'#333',marginTop:6},
  planType:    {fontSize:11,color:'#888'},
  planPrice:   {fontSize:17,fontWeight:'800',color:'#111',marginTop:2},
  planFeats:   {flexDirection:'row',justifyContent:'space-around',marginTop:16,
                 backgroundColor:'#fff',borderRadius:12,padding:14,
                 borderWidth:1,borderColor:'#e5e5e5'},
  planFeat:    {alignItems:'center',gap:4},
  planFeatTxt: {fontSize:10,color:'#555',fontWeight:'600',textAlign:'center'},
  reviewH:     {fontSize:14,fontWeight:'700',color:'#333',marginBottom:12},
  revCard:     {backgroundColor:'#fff',borderRadius:14,overflow:'hidden',
                 borderWidth:1,borderColor:'#f0f0f0'},
  revRow:      {flexDirection:'row',justifyContent:'space-between',
                 paddingHorizontal:16,paddingVertical:12,
                 borderBottomWidth:1,borderBottomColor:'#f5f5f5'},
  revLabel:    {fontSize:11,fontWeight:'700',color:'#aaa',letterSpacing:0.5},
  revValue:    {fontSize:13,fontWeight:'600',color:'#333',maxWidth:'60%',textAlign:'right'},
  bottomBar:   {flexDirection:'row',gap:12,padding:16,backgroundColor:'#fff',
                 borderTopWidth:1,borderTopColor:'#f0f0f0'},
  backBtnB:    {flex:1,borderWidth:1.5,borderColor:'#ddd',borderRadius:12,
                 paddingVertical:14,alignItems:'center'},
  backBtnTxt:  {fontSize:14,fontWeight:'700',color:'#555'},
  continueBtn: {flex:2,backgroundColor:TEAL,borderRadius:12,
                 paddingVertical:14,alignItems:'center'},
  continueTxt: {color:'#fff',fontSize:15,fontWeight:'800'},
});
