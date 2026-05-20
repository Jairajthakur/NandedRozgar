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
const PURPLE = '#7c3aed';
const ORANGE = '#f97316';
const TOTAL  = 5;

// ── Data ─────────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = [
  { label:'Car',          sub:'Sedan, Hatchback, etc.' },
  { label:'Bike / Scooter', sub:'Two-wheeler' },
  { label:'Auto Rickshaw', sub:'CNG 3-wheeler' },
  { label:'SUV / MUV',    sub:'Innova, Scorpio, etc.' },
  { label:'Tempo / Van',  sub:'Commercial vehicle' },
];
const BRANDS = ['Maruti Suzuki','Hyundai','Tata','Honda','Toyota','Mahindra','Bajaj','Hero','TVS','Other'];
const YEARS  = Array.from({length:15},(_,i)=>String(2025-i));
const FUEL_TYPES = ['Petrol','Diesel','CNG','Electric','Hybrid'];
const SEATING    = ['2','4','5','6','7','8','9+'];
const MIN_RENTAL = [
  { label:'1 Day minimum',  sub:'Flexible, short trips' },
  { label:'3 Days minimum', sub:null },
  { label:'7 Days minimum', sub:'Weekly rentals only' },
  { label:'Monthly only',   sub:'Long-term rental' },
];
const PICKUP_LOCS = ['Nanded City','Vazirabad','Cidco','Shivaji Nagar','Old Nanded','Ardhapur','Other'];
const FEATURES = [
  'AC','Power Steering','Bluetooth/Music','Fastag',
  'Carrier','Commercial RC','Comprehensive Insurance','Helmets Included',
];
const PLANS = [
  { days:15,  label:'15 Days',  price:69,  popular:false },
  { days:30,  label:'1 Month',  price:99,  popular:true  },
  { days:60,  label:'2 Months', price:169, popular:false },
  { days:90,  label:'3 Months', price:229, popular:false },
];
const STEP_META = [
  { title:'Vehicle Info',         sub:'Describe your vehicle' },
  { title:'Rental Details',       sub:'Set pricing and availability' },
  { title:'Photos & Description', sub:'Add photos and contact details' },
  { title:'Choose Plan',          sub:'How long should your listing stay live?' },
  { title:'Review & Post',        sub:'Confirm listing before going live' },
];

export default function PostCarScreen() {
  const nav = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState({
    vehicleType:'Car', name:'', brand:'Maruti Suzuki', year:'2022',
    fuelType:'Petrol', seating:'5', color:'',
    dailyRate:'', deposit:'', minRental:'1 Day minimum',
    pickupLocation:'Nanded City',
    features:[], notes:'', whatsapp:'',
    plan:PLANS[1],
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleFeature = f => set('features', form.features.includes(f)
    ? form.features.filter(x=>x!==f) : [...form.features,f]);

  function animateStep(dir,cb){
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

  function next(){
    if (step===1 && !form.vehicleType){Alert.alert('Required','Select vehicle type');return;}
    if (step===2 && !form.dailyRate)  {Alert.alert('Required','Enter daily rental rate');return;}
    if (step===3 && !form.whatsapp)  {Alert.alert('Required','Enter WhatsApp number');return;}
    if (step<TOTAL) animateStep('next',()=>setStep(s=>s+1));
  }
  function back(){
    if (step>1) animateStep('back',()=>setStep(s=>s-1)); else nav.goBack();
  }

  async function submit(){
    if (!form.dailyRate||!form.pickupLocation||!form.whatsapp){
      Alert.alert('Missing Info','Daily rate, pickup location and WhatsApp are required'); return;
    }
    setLoading(true);
    try {
      const r = await http('POST','/api/vehicles',{
        vehicleType:form.vehicleType, name:form.name||form.vehicleType,
        year:form.year, color:form.color, fuelType:form.fuelType,
        seats:form.seating, dailyRate:form.dailyRate, advanceAmt:form.deposit,
        minBooking:form.minRental, area:form.pickupLocation,
        purpose:form.features, whatsapp:form.whatsapp,
        description:form.notes, planDays:form.plan.days,
        planLabel:form.plan.label, planPrice:form.plan.price,
      });
      if (r.ok){
        Toast.show({type:'success',text1:'✅ Vehicle listed successfully!'});
        nav.goBack();
      } else {
        Alert.alert('Error',r.error||'Failed to post vehicle');
      }
    } catch {
      Alert.alert('Error','Something went wrong');
    } finally { setLoading(false); }
  }

  const meta = STEP_META[step-1];

  return(
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

          {/* STEP 1 – Vehicle Info */}
          {step===1&&<>
            <Lbl>VEHICLE TYPE *</Lbl>
            {VEHICLE_TYPES.map(t=>(
              <RadioCard key={t.label} label={t.label} sub={t.sub}
                selected={form.vehicleType===t.label}
                onPress={()=>set('vehicleType',t.label)} color={PURPLE}/>
            ))}

            <Lbl style={{marginTop:18}}>VEHICLE NAME / MODEL *</Lbl>
            <TextInput style={s.input} placeholder="e.g. Maruti Swift, Honda Activa 6G"
              value={form.name} onChangeText={v=>set('name',v)}/>

            <View style={s.row}>
              <View style={{flex:1}}>
                <Lbl>BRAND</Lbl>
                <Picker value={form.brand} options={BRANDS} onSelect={v=>set('brand',v)}/>
              </View>
              <View style={{width:12}}/>
              <View style={{flex:1}}>
                <Lbl>YEAR</Lbl>
                <Picker value={form.year} options={YEARS} onSelect={v=>set('year',v)}/>
              </View>
            </View>

            <View style={[s.row,{marginTop:16}]}>
              <View style={{flex:1}}>
                <Lbl>FUEL TYPE</Lbl>
                <Picker value={form.fuelType} options={FUEL_TYPES} onSelect={v=>set('fuelType',v)}/>
              </View>
              <View style={{width:12}}/>
              <View style={{flex:1}}>
                <Lbl>SEATING</Lbl>
                <Picker value={form.seating} options={SEATING} onSelect={v=>set('seating',v)}/>
              </View>
            </View>

            <Lbl style={{marginTop:16}}>VEHICLE COLOR</Lbl>
            <TextInput style={s.input} placeholder="e.g. White, Silver, Red"
              value={form.color} onChangeText={v=>set('color',v)}/>
          </>}

          {/* STEP 2 – Rental Details */}
          {step===2&&<>
            <Lbl>DAILY RENTAL RATE (₹) *</Lbl>
            <View style={s.prefixRow}>
              <Text style={s.prefix}>₹</Text>
              <TextInput style={s.prefixField} placeholder="e.g. 800 per day"
                keyboardType="numeric" value={form.dailyRate}
                onChangeText={v=>set('dailyRate',v)}/>
            </View>

            <Lbl style={{marginTop:16}}>SECURITY DEPOSIT (₹)</Lbl>
            <View style={s.prefixRow}>
              <Text style={s.prefix}>₹</Text>
              <TextInput style={s.prefixField} placeholder="e.g. 2000 refundable"
                keyboardType="numeric" value={form.deposit}
                onChangeText={v=>set('deposit',v)}/>
            </View>

            <Lbl style={{marginTop:18}}>MINIMUM RENTAL PERIOD</Lbl>
            {MIN_RENTAL.map(r=>(
              <RadioCard key={r.label} label={r.label} sub={r.sub}
                selected={form.minRental===r.label}
                onPress={()=>set('minRental',r.label)} color={ORANGE}/>
            ))}

            <Lbl style={{marginTop:16}}>PICKUP LOCATION</Lbl>
            <Picker value={form.pickupLocation} options={PICKUP_LOCS}
              onSelect={v=>set('pickupLocation',v)} fullWidth/>
          </>}

          {/* STEP 3 – Photos & Description */}
          {step===3&&<>
            <Lbl>FEATURES</Lbl>
            <View style={s.chipWrap}>
              {FEATURES.map(f=>(
                <TouchableOpacity key={f}
                  style={[s.chip, form.features.includes(f)&&s.chipOn]}
                  onPress={()=>toggleFeature(f)}>
                  <Text style={[s.chipTxt, form.features.includes(f)&&s.chipTxtOn]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Lbl style={{marginTop:18}}>VEHICLE PHOTOS</Lbl>
            <TouchableOpacity style={s.uploadBox}>
              <Ionicons name="cloud-upload-outline" size={26} color={PURPLE}/>
              <Text style={s.uploadTitle}>Upload vehicle photos</Text>
              <Text style={s.uploadSub}>Add front, side and interior shots</Text>
            </TouchableOpacity>

            <Lbl style={{marginTop:18}}>TERMS & CONDITIONS / NOTES</Lbl>
            <TextInput style={[s.input,{height:90,textAlignVertical:'top',paddingTop:12}]}
              placeholder="e.g. Max 200km per day, fuel not included, driving licence mandatory..."
              multiline value={form.notes} onChangeText={v=>set('notes',v)}/>

            <Lbl style={{marginTop:16}}>WHATSAPP NUMBER *</Lbl>
            <TextInput style={s.input} placeholder="+91 98765 43210"
              keyboardType="phone-pad" value={form.whatsapp}
              onChangeText={v=>set('whatsapp',v)}/>
          </>}

          {/* STEP 4 – Plan */}
          {step===4&&<>
            <Text style={s.planQ}>How long should your listing stay live?</Text>
            <Text style={s.planNote}>Your listing is automatically removed after the selected period.</Text>
            <View style={s.planGrid}>
              {PLANS.map(p=>(
                <TouchableOpacity key={p.days}
                  style={[s.planCard, form.plan.days===p.days&&{backgroundColor:PURPLE,borderColor:PURPLE}]}
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
                  <Ionicons name={ic} size={18} color={PURPLE}/>
                  <Text style={s.planFeatTxt}>{lb}</Text>
                </View>
              ))}
            </View>
          </>}

          {/* STEP 5 – Review */}
          {step===5&&<>
            <Text style={s.reviewH}>Review your vehicle listing:</Text>
            <View style={s.revCard}>
              {[['NAME',    form.name||'Not set'],
                ['TYPE',    form.vehicleType],
                ['BRAND',   form.brand],
                ['YEAR',    form.year],
                ['SPECS',   `${form.fuelType}, ${form.seating} seats`],
              ].map(([k,v])=><RevRow key={k} label={k} value={v}/>)}
            </View>
            <View style={[s.revCard,{marginTop:12}]}>
              {[['RENT/DAY', form.dailyRate?`₹${form.dailyRate}`:'Not set'],
                ['DEPOSIT',  form.deposit?`₹${form.deposit}`:'—'],
                ['MIN DAYS', form.minRental],
                ['PICKUP',   form.pickupLocation],
              ].map(([k,v])=><RevRow key={k} label={k} value={v}/>)}
            </View>
            <View style={[s.revCard,{marginTop:12}]}>
              {[['FEATURES', form.features.length?form.features.join(', '):'None'],
                ['WHATSAPP', form.whatsapp||'Not set'],
                ['PLAN',     `${form.plan.label} – ₹${form.plan.price}`],
              ].map(([k,v])=><RevRow key={k} label={k} value={v}/>)}
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
          style={[s.continueBtn,loading&&{opacity:0.7}]}
          onPress={step===TOTAL?submit:next} disabled={loading}>
          {loading
            ?<ActivityIndicator color="#fff"/>
            :<Text style={s.continueTxt}>{step===TOTAL?'Post Listing':'Continue'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
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
              <Text style={[s.ddItemTxt,o===value&&{color:PURPLE,fontWeight:'700'}]}>{o}</Text>
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
                 backgroundColor:PURPLE,paddingHorizontal:16,
                 paddingTop:Platform.OS==='ios'?50:14,paddingBottom:10},
  backBtn:     {width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,0.25)',
                 justifyContent:'center',alignItems:'center'},
  stepLbl:     {fontSize:13,fontWeight:'700',color:'rgba(255,255,255,0.9)'},
  dotsRow:     {flexDirection:'row',gap:6,paddingHorizontal:16,paddingVertical:8,backgroundColor:PURPLE},
  dot:         {flex:1,height:3,borderRadius:2,backgroundColor:'rgba(255,255,255,0.3)'},
  dotDone:     {backgroundColor:'rgba(255,255,255,0.65)'},
  dotCur:      {backgroundColor:'#fff'},
  banner:      {backgroundColor:PURPLE,paddingHorizontal:16,paddingBottom:20},
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
  chipOn:      {borderColor:PURPLE,backgroundColor:PURPLE+'15'},
  chipTxt:     {fontSize:13,fontWeight:'600',color:'#555'},
  chipTxtOn:   {color:PURPLE},
  uploadBox:   {borderWidth:1.5,borderColor:'#ccc',borderStyle:'dashed',borderRadius:12,
                 padding:24,alignItems:'center',gap:6,backgroundColor:'#fff'},
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
  continueBtn: {flex:2,backgroundColor:PURPLE,borderRadius:12,
                 paddingVertical:14,alignItems:'center'},
  continueTxt: {color:'#fff',fontSize:15,fontWeight:'800'},
});
