import { useState, useEffect, useRef } from "react";
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const TODAY = new Date().toISOString().split("T")[0];
const MEALS = ["Café da manhã","Pré-treino","Pós-treino","Almoço","Café da tarde","Jantar","Ceia","Outro"];
const MACRO_FIELDS = [
  { key:"protein100", label:"Proteína",           unit:"g",    color:"#c8a96e", required:true  },
  { key:"kcal100",    label:"Calorias",            unit:"kcal", color:"#8ec8c8", required:true  },
  { key:"carbs100",   label:"Carboidratos",        unit:"g",    color:"#a96ec8", required:false },
  { key:"sugars100",  label:"dos quais açúcares",  unit:"g",    color:"#a96ec8", required:false, sub:true },
  { key:"fat100",     label:"Gorduras",            unit:"g",    color:"#c86e8e", required:false },
  { key:"satfat100",  label:"das quais saturadas", unit:"g",    color:"#c86e8e", required:false, sub:true },
  { key:"fiber100",   label:"Fibra",               unit:"g",    color:"#3a9a7a", required:false },
  { key:"salt100",    label:"Sal",                 unit:"g",    color:"var(--muted2)",    required:false },
];
const MICRO_FIELDS = [
  { key:"b12_100",       label:"Vitamina B12", unit:"µg" },
  { key:"niacin100",     label:"Niacina",      unit:"mg" },
  { key:"phosphorus100", label:"Fósforo",      unit:"mg" },
  { key:"vitd100",       label:"Vitamina D",   unit:"µg" },
  { key:"calcium100",    label:"Cálcio",       unit:"mg" },
  { key:"iron100",       label:"Ferro",        unit:"mg" },
  { key:"potassium100",  label:"Potássio",     unit:"mg" },
  { key:"magnesium100",  label:"Magnésio",     unit:"mg" },
  { key:"zinc100",       label:"Zinco",        unit:"mg" },
  { key:"vitc100",       label:"Vitamina C",   unit:"mg" },
];
const ALL_FIELDS = [...MACRO_FIELDS, ...MICRO_FIELDS];

function computeGoals(weight, train) {
  if (!weight) return train
    ? { protein:160, kcal:3100, carbs:330, fat:75, fiber:30, salt:5 }
    : { protein:130, kcal:2700, carbs:230, fat:65, fiber:30, salt:5 };
  return train
    ? { protein:Math.round(weight*2.2), kcal:Math.round(weight*42), carbs:Math.round(weight*4.5), fat:Math.round(weight*1.0), fiber:30, salt:5 }
    : { protein:Math.round(weight*1.8), kcal:Math.round(weight*37), carbs:Math.round(weight*3.1), fat:Math.round(weight*0.9), fiber:30, salt:5 };
}
function getWeightForDate(history, date) {
  return [...history].filter(e=>e.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}
function emptyFood() {
  const f={name:"",unit:"g"}; ALL_FIELDS.forEach(ff=>{f[ff.key]="";}); return f;
}
function downloadFile(content, filename, mime) {
  try {
    const url = "data:" + mime + ";charset=utf-8," + encodeURIComponent(content);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  } catch(_) {
    const blob = new Blob([content],{type:mime});
    const url2 = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url2; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url2), 1000);
  }
}
function downloadText(content,filename,type) { downloadFile(content,filename,type); }
function quickQtys(unit) {
  if(unit==="ml") return [100,150,200,250,300,500];
  if(unit==="un") return [1,2,3,4];
  return [50,100,150,200,250,300];
}
function divisor(unit) { return unit==="un" ? 1 : 100; }
function portionLabel(unit) { return unit==="un" ? "por 1 unidade" : `por 100${unit}`; }
function dateLabel(date) {
  if(date===TODAY) return "Hoje";
  const d=new Date(date+"T12:00:00");
  const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
  if(d.toDateString()===yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"});
}
function addDays(date,n) {
  const d=new Date(date+"T12:00:00"); d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
}

function Ring({value,max,color,size=76,stroke=7}) {
  const r=(size-stroke)/2,circ=2*Math.PI*r,offset=circ*(1-Math.min(value/max,1));
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={value>max?"#ff4d4d":color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 0.5s ease"}}/>
    </svg>
  );
}
function Bar({value,max,color,label,unit,sub}) {
  if(!max) return null; const over=value>max;
  return (
    <div style={{marginBottom:sub?4:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:sub?10:11,color:sub?"#555":"#777",paddingLeft:sub?10:0}}>{sub?"↳ ":""}{label}</span>
        <span style={{fontSize:11,color:over?"#ff4d4d":color}}>
          {value%1===0?value:value.toFixed(1)}{unit}
          <span style={{color:"var(--dim)",fontSize:10}}> / {max}{unit}</span>
        </span>
      </div>
      <div style={{height:sub?3:5,background:"var(--track)",borderRadius:4}}>
        <div style={{height:"100%",width:Math.min(value/max*100,100)+"%",borderRadius:4,background:over?"#ff4d4d":color,transition:"width 0.4s ease"}}/>
      </div>
    </div>
  );
}


export default function NutritionTracker() {
  const [darkMode,setDarkMode]       = useState(true);
  const [pantry,setPantry]           = useState([]);
  const [log,setLog]                 = useState({});
  const [tab,setTab]                 = useState("diario");
  const [trainingByDate,setTrainingByDate] = useState({});
  const [form,setForm]               = useState(emptyFood());
  const [showMicroForm,setShowMicroForm] = useState(false);
  const [editingId,setEditingId]     = useState(null);
  const [editForm,setEditForm]       = useState(null);
  const [addEntry,setAddEntry]       = useState({foodId:"",qty:"",meal:"Café da manhã"});
  const [batchMode,setBatchMode]     = useState(false);
  const [staged,setStaged]           = useState({meal:"Café da manhã",items:[]});
  const [mealTemplates,setMealTemplates] = useState([]);
  const [templateName,setTemplateName]   = useState("");
  const [describeMode,setDescribeMode]   = useState(false);
  const [mealDescription,setMealDescription] = useState("");
  const [describeMeal,setDescribeMeal]   = useState("Almoço");
  const [describeResult,setDescribeResult] = useState(null);
  const [describeLoading,setDescribeLoading] = useState(false);
  const [feedbackLoading,setFeedbackLoading] = useState(false);
  const [feedbackText,setFeedbackText]   = useState("");
  const [feedbackPeriod,setFeedbackPeriod] = useState(null);
  const [feedbackSaved,setFeedbackSaved] = useState(false);
  const [showExportPanel,setShowExportPanel] = useState(null);
  const [exportResult,setExportResult]       = useState(null);
  const [backupJson,setBackupJson]           = useState(null);
  const [backupLoading,setBackupLoading]     = useState(false);
  const [patternsLoading,setPatternsLoading] = useState(false);
  const [patternsText,setPatternsText]       = useState("");
  const [patternsSaved,setPatternsSaved]     = useState(false);
  const [suggestLoading,setSuggestLoading]   = useState(false);
  const [suggestions,setSuggestions]         = useState(null); // {content, filename, copied}
  const [loaded,setLoaded]           = useState(false);
  const [syncing,setSyncing]         = useState(false);
  const [autoFillLoading,setAutoFillLoading] = useState(false);
  const [notification,setNotification] = useState("");
  const [expandMicros,setExpandMicros] = useState(false);
  const [detailFood,setDetailFood]   = useState(null);
  const [weightHistory,setWeightHistory] = useState([]);
  const [weightForm,setWeightForm]   = useState({weight:"",height:""});
  const [editingWeightId,setEditingWeightId] = useState(null);
  const [editWeightForm,setEditWeightForm]   = useState({weight:"",height:"",date:""});
  const [viewDate,setViewDate]       = useState(TODAY);
  const [historyLog,setHistoryLog]   = useState({});
  const [todayNote,setTodayNote]     = useState("");
  const [historyNote,setHistoryNote] = useState("");
  const [weekData,setWeekData]       = useState([]);
  const [mealAverages,setMealAverages] = useState({});
  const [recentMeals,setRecentMeals]   = useState([]);
  const [showRecentMeals,setShowRecentMeals] = useState(false);
  const [editStagedIdx,setEditStagedIdx]     = useState(null);
  const [editStagedQty,setEditStagedQty]     = useState("");
  // Water
  const [waterIntake,setWaterIntake] = useState([]);
  const [waterInput,setWaterInput]   = useState("");
  const [waterGoal,setWaterGoal]     = useState(2500);
  const [waterGoalInput,setWaterGoalInput] = useState("");
  const [editWaterGoal,setEditWaterGoal] = useState(false);
  // Supplements
  const [suppPantry,setSuppPantry]   = useState([]);
  const [suppLog,setSuppLog]         = useState([]);
  const [suppForm,setSuppForm]       = useState({name:"",dose:"",unit:"un",notes:""});
  const [showSuppForm,setShowSuppForm] = useState(false);
  const [showSuppAdd,setShowSuppAdd]   = useState(false);
  const [suppAddId,setSuppAddId]       = useState("");
  const [suppAddDose,setSuppAddDose]   = useState("");
  // Custom goals
  const [customGoals,setCustomGoals] = useState({});
  const [editingGoals,setEditingGoals] = useState(false);
  const [goalDraft,setGoalDraft]     = useState({});
  const [pantrySearch,setPantrySearch] = useState("");
  const [editEntryId,setEditEntryId] = useState(null);
  const [editEntryQty,setEditEntryQty] = useState("");

  const saveTimeout = useRef({});

  async function loadAll() {
    setSyncing(true);
    try {
      const [p,l,t,w,mt,n,wg,wi,sp,sl,cg] = await Promise.all([
        window.storage.get("pantry_v2").catch(()=>null),
        window.storage.get("log_v2_"+TODAY).catch(()=>null),
        window.storage.get("trainingByDate").catch(()=>null),
        window.storage.get("weightHistory").catch(()=>null),
        window.storage.get("mealTemplates").catch(()=>null),
        window.storage.get("notes_"+TODAY).catch(()=>null),
        window.storage.get("waterGoal").catch(()=>null),
        window.storage.get("waterIntake_"+TODAY).catch(()=>null),
        window.storage.get("suppPantry").catch(()=>null),
        window.storage.get("suppLog_"+TODAY).catch(()=>null),
        window.storage.get("customGoals").catch(()=>null),
      ]);
      if(p) setPantry(JSON.parse(p.value));
      if(l) setLog(JSON.parse(l.value));
      if(t) setTrainingByDate(JSON.parse(t.value));
      if(w) setWeightHistory(JSON.parse(w.value));
      if(mt) setMealTemplates(JSON.parse(mt.value));
      if(n) setTodayNote(n.value||"");
      if(wg) setWaterGoal(JSON.parse(wg.value));
      if(wi) setWaterIntake(JSON.parse(wi.value));
      if(sp) setSuppPantry(JSON.parse(sp.value));
      if(sl) setSuppLog(JSON.parse(sl.value));
      if(cg) setCustomGoals(JSON.parse(cg.value));
    } catch(_){}
    setSyncing(false);
    setLoaded(true);
  }

  useEffect(()=>{loadAll();},[]);

  function scheduleSave(key,value,delay=800) {
    if(saveTimeout.current[key]) clearTimeout(saveTimeout.current[key]);
    saveTimeout.current[key]=setTimeout(()=>window.storage.set(key,typeof value==="string"?value:JSON.stringify(value)).catch(()=>{}),delay);
  }

  useEffect(()=>{if(loaded) scheduleSave("pantry_v2",pantry);},[pantry,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("log_v2_"+TODAY,log);},[log,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("trainingByDate",trainingByDate);},[trainingByDate,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("weightHistory",weightHistory);},[weightHistory,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("mealTemplates",mealTemplates);},[mealTemplates,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("notes_"+TODAY,todayNote,1500);},[todayNote,loaded]);
  useEffect(()=>{if(loaded&&viewDate!==TODAY) scheduleSave("notes_"+viewDate,historyNote,1500);},[historyNote,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("waterGoal",waterGoal);},[waterGoal,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("waterIntake_"+TODAY,waterIntake);},[waterIntake,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("suppPantry",suppPantry);},[suppPantry,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("suppLog_"+TODAY,suppLog);},[suppLog,loaded]);
  useEffect(()=>{if(loaded) scheduleSave("customGoals",customGoals);},[customGoals,loaded]);

  async function changeViewDate(date) {
    setViewDate(date);
    setEditEntryId(null);
    setDetailFood(null);
    if(date!==TODAY){
      const [l,n]=await Promise.all([
        window.storage.get("log_v2_"+date).catch(()=>null),
        window.storage.get("notes_"+date).catch(()=>null),
      ]);
      setHistoryLog(l?JSON.parse(l.value):{});
      setHistoryNote(n?n.value||"":"");
    }
  }

  useEffect(()=>{
    if(tab==="semana"&&loaded) { loadWeekData(); loadMealAnalysis(); }
    if(tab==="adicionar"&&loaded) loadRecentMeals();
  },[tab,loaded,log]);

  async function loadWeekData() {
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const date=d.toISOString().split("T")[0];
      let dayLog=date===TODAY?log:{};
      if(date!==TODAY){
        const l=await window.storage.get("log_v2_"+date).catch(()=>null);
        if(l) dayLog=JSON.parse(l.value);
      }
      const entries=Object.values(dayLog).flat();
      const we=getWeightForDate(weightHistory,date);
      const dayIsTraining = trainingByDate[date] ?? true;
      const g=computeGoals(we?.weight||currentWeight,dayIsTraining);
      const protein=entries.reduce((s,e)=>s+(e.protein??0),0);
      const kcal=entries.reduce((s,e)=>s+(e.kcal??0),0);
      days.push({
        date,label:d.toLocaleDateString("pt-BR",{weekday:"short"}),
        day:d.getDate(),protein:Math.round(protein),kcal:Math.round(kcal),
        proteinGoal:g.protein,kcalGoal:g.kcal,
        metProtein:protein>=g.protein,
        metKcal:kcal>=g.kcal*0.85&&kcal<=g.kcal*1.15,
        hasData:entries.length>0,
        isToday:date===TODAY,
      });
    }
    setWeekData(days);
  }

  async function loadMealAnalysis() {
    const acc = {};
    for(let i=1;i<=30;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const date=d.toISOString().split("T")[0];
      const l=await window.storage.get("log_v2_"+date).catch(()=>null);
      if(!l) continue;
      const dayLog=JSON.parse(l.value);
      MEALS.forEach(meal=>{
        const entries=dayLog[meal]||[];
        if(!entries.length) return;
        if(!acc[meal]) acc[meal]={count:0,protein:0,kcal:0,carbs:0};
        acc[meal].count++;
        acc[meal].protein+=entries.reduce((s,e)=>s+(e.protein??0),0);
        acc[meal].kcal+=entries.reduce((s,e)=>s+(e.kcal??0),0);
        acc[meal].carbs+=entries.reduce((s,e)=>s+(e.carbs??0),0);
      });
    }
    const avgs={};
    Object.entries(acc).forEach(([meal,d])=>{
      avgs[meal]={
        count:d.count,
        avgProtein:Math.round(d.protein/d.count),
        avgKcal:Math.round(d.kcal/d.count),
        avgCarbs:Math.round(d.carbs/d.count),
      };
    });
    setMealAverages(avgs);
  }

  async function loadRecentMeals() {
    const results=[];
    for(let i=0;i<=14;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const date=d.toISOString().split("T")[0];
      const dayLog=date===TODAY?log:(()=>{return null;})();
      let parsed=dayLog;
      if(!parsed){
        const l=await window.storage.get("log_v2_"+date).catch(()=>null);
        if(!l) continue;
        parsed=JSON.parse(l.value);
      }
      MEALS.forEach(meal=>{
        const entries=parsed[meal]||[];
        if(!entries.length) return;
        const protein=entries.reduce((s,e)=>s+(e.protein??0),0);
        const kcal=entries.reduce((s,e)=>s+(e.kcal??0),0);
        results.push({date,meal,entries,protein:Math.round(protein),kcal:Math.round(kcal)});
      });
    }
    setRecentMeals(results.slice(0,30));
  }

  function notify(msg,duration=3000){setNotification(msg);setTimeout(()=>setNotification(""),duration);}

  async function autoFillNutrition() {
    if(!form.name.trim()){notify("Escreve o nome do alimento primeiro.");return;}
    setAutoFillLoading(true);
    const unit = form.unit;
    const foodName = form.name.trim();
    const prompt = unit==="un"
      ? "O utilizador quer registar \"" + foodName + "\" com unidade \"un\".\n\n"
        + "IMPORTANTE: Como a unidade é \"un\", deves:\n"
        + "1. Verificar se faz sentido medir este alimento por unidade individual (1 ovo, 1 banana, 1 morango, etc.)\n"
        + "2. Se sim, fornecer os valores nutricionais por 100g E o peso médio em gramas de 1 unidade típica.\n"
        + "   Os valores finais por unidade serão calculados como: valor_100g x peso_unidade / 100\n"
        + "3. Se não fizer sentido (ex: leite, azeite, farinha), recusa e explica.\n\n"
        + "Responde APENAS com JSON sem markdown:\n"
        + "- Se válido: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n"
        + "- Se inválido: {\"ok\":false,\"reason\":\"explicação curta em português\"}"
      : "O utilizador quer registar \"" + foodName + "\" com unidade \"" + unit + "\".\n\n"
        + "Verifica se a unidade \"" + unit + "\" faz sentido para este alimento.\n"
        + "Se sim, fornece valores por 100" + unit + " baseados em tabelas nutricionais de referência (USDA, INSA, tabelas europeias).\n"
        + "Se não (ex: atum em ml, leite em un), recusa e explica.\n\n"
        + "Responde APENAS com JSON sem markdown:\n"
        + "- Se válido: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n"
        + "- Se inválido: {\"ok\":false,\"reason\":\"explicação curta em português\"}\n"
        + "Usa null para campos desconhecidos.";
    try {
      const text = await callAI(prompt, 600);
      const clean = text.replace(/```json|```/g,"").trim();
      const vals = JSON.parse(clean);
      if(!vals.ok){
        notify(`⚠ ${vals.reason}`, 7000);
      } else if(unit==="un" && vals.per100 && vals.unitWeightG) {
        // Calculate per-unit values proportionally from 100g values
        const w = vals.unitWeightG;
        const p = vals.per100;
        const scale = v => v!=null ? Math.round(v * w / 100 * 100) / 100 : null;
        setForm(f=>({
          ...f,
          protein100: scale(p.protein100)!=null ? String(scale(p.protein100)) : f.protein100,
          kcal100:    scale(p.kcal100)!=null    ? String(scale(p.kcal100))    : f.kcal100,
          carbs100:   scale(p.carbs100)!=null   ? String(scale(p.carbs100))   : f.carbs100,
          sugars100:  scale(p.sugars100)!=null  ? String(scale(p.sugars100))  : f.sugars100,
          fat100:     scale(p.fat100)!=null     ? String(scale(p.fat100))     : f.fat100,
          satfat100:  scale(p.satfat100)!=null  ? String(scale(p.satfat100))  : f.satfat100,
          fiber100:   scale(p.fiber100)!=null   ? String(scale(p.fiber100))   : f.fiber100,
          salt100:    scale(p.salt100)!=null    ? String(scale(p.salt100))    : f.salt100,
        }));
        notify(`Campos preenchidos com base em ${w}g por unidade. Verifica se o peso está correcto.`);
      } else {
        setForm(f=>({
          ...f,
          protein100: vals.protein100!=null?String(vals.protein100):f.protein100,
          kcal100:    vals.kcal100!=null?String(vals.kcal100):f.kcal100,
          carbs100:   vals.carbs100!=null?String(vals.carbs100):f.carbs100,
          sugars100:  vals.sugars100!=null?String(vals.sugars100):f.sugars100,
          fat100:     vals.fat100!=null?String(vals.fat100):f.fat100,
          satfat100:  vals.satfat100!=null?String(vals.satfat100):f.satfat100,
          fiber100:   vals.fiber100!=null?String(vals.fiber100):f.fiber100,
          salt100:    vals.salt100!=null?String(vals.salt100):f.salt100,
        }));
        notify("Campos preenchidos. Verifica e ajusta se necessário.");
      }
    } catch(_){ notify("Não foi possível obter os valores. Tenta novamente."); }
    setAutoFillLoading(false);
  }

  async function estimateMealDescription() {
    if(!mealDescription.trim()){notify("Descreve o prato primeiro.");return;}
    setDescribeLoading(true);
    setDescribeResult(null);
    const prompt = "O utilizador comeu o seguinte prato e quer estimar os valores nutricionais:\n\n"
      + "\"" + mealDescription.trim() + "\"\n\n"
      + "Com base na descrição e nas quantidades indicadas (ou em porções típicas se não foram especificadas), "
      + "estima os valores nutricionais totais do prato completo.\n\n"
      + "Considera porções realistas de refeitório/restaurante quando não há quantidade exacta.\n\n"
      + "Responde APENAS com JSON sem markdown:\n"
      + "{\"name\":\"nome curto para o prato\",\"protein\":X,\"kcal\":X,\"carbs\":X,\"fat\":X,\"fiber\":X,\"salt\":X,\"confidence\":\"alta|media|baixa\",\"note\":\"observação curta sobre a estimativa em português\"}";
    try {
      const text = await callAI(prompt, 400);
      const clean = text.replace(/```json|```/g,"").trim();
      const vals = JSON.parse(clean);
      setDescribeResult(vals);
    } catch(_){ notify("Não foi possível estimar. Tenta novamente."); }
    setDescribeLoading(false);
  }

  function addDescribedToLog() {
    if(!describeResult) return;
    const entry = {
      id: Date.now().toString()+Math.random(),
      foodId: null,
      name: describeResult.name || "Prato estimado",
      qty: 1, unit:"un",
      protein: describeResult.protein||0,
      kcal: describeResult.kcal||0,
      carbs: describeResult.carbs||0,
      fat: describeResult.fat||0,
      fiber: describeResult.fiber||0,
      salt: describeResult.salt||0,
      sugars: null, satfat: null,
      _estimated: true,
      _description: mealDescription.trim(),
    };
    setActiveLog({...activeLog,[describeMeal]:[...(activeLog[describeMeal]||[]),entry]});
    setDescribeResult(null);
    setMealDescription("");
    notify(describeResult.name + " adicionado ao diário.");
  }

  // Water
  const totalWater = waterIntake.reduce((s,e)=>s+e.ml,0);
  function addWater(ml) {
    const n=parseFloat(ml||waterInput);
    if(isNaN(n)||n<=0) return;
    setWaterIntake(w=>[...w,{id:Date.now().toString(),ml:n,time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}]);
    setWaterInput("");
  }
  function removeWater(id){setWaterIntake(w=>w.filter(e=>e.id!==id));}

  // Supplements
  function addSuppToPantry() {
    if(!suppForm.name||!suppForm.dose) return;
    setSuppPantry(p=>[...p,{id:Date.now().toString(),...suppForm,dose:parseFloat(suppForm.dose)}]);
    setSuppForm({name:"",dose:"",unit:"un",notes:""});
    setShowSuppForm(false);
    notify("Suplemento guardado.");
  }
  function logSupp() {
    const supp=suppPantry.find(s=>s.id===suppAddId);
    if(!supp) return;
    const dose=parseFloat(suppAddDose)||supp.dose;
    setSuppLog(l=>[...l,{id:Date.now().toString(),suppId:supp.id,name:supp.name,dose,unit:supp.unit,time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}]);
    setSuppAddId(""); setSuppAddDose(""); setShowSuppAdd(false);
    notify(supp.name+" registado.");
  }
  function removeSuppLog(id){setSuppLog(l=>l.filter(e=>e.id!==id));}
  function removeSuppPantry(id){setSuppPantry(p=>p.filter(s=>s.id!==id));}

  // Custom goals
  function startEditGoals() {
    setGoalDraft({
      protein: customGoals.protein||"",
      kcal:    customGoals.kcal||"",
      carbs:   customGoals.carbs||"",
      fat:     customGoals.fat||"",
      fiber:   customGoals.fiber||"",
      salt:    customGoals.salt||"",
      water:   customGoals.water||"",
    });
    setEditingGoals(true);
  }
  function saveGoals() {
    const cg={};
    Object.entries(goalDraft).forEach(([k,v])=>{if(v!=="") cg[k]=parseFloat(v);});
    setCustomGoals(cg);
    setEditingGoals(false);
    notify("Metas actualizadas.");
  }

  async function generateFoodPatterns() {
    setPatternsLoading(true); setPatternsText(""); setPatternsSaved(false);
    try {
      const acc = {};
      const dayData = [];
      for(let i=1;i<=30;i++){
        const d=new Date(); d.setDate(d.getDate()-i);
        const date=d.toISOString().split("T")[0];
        const l=await window.storage.get("log_v2_"+date).catch(()=>null);
        if(!l) continue;
        const dayLog=JSON.parse(l.value);
        const entries=Object.values(dayLog).flat();
        if(!entries.length) continue;
        const p=Math.round(entries.reduce((s,e)=>s+(e.protein??0),0));
        const k=Math.round(entries.reduce((s,e)=>s+(e.kcal??0),0));
        const c=Math.round(entries.reduce((s,e)=>s+(e.carbs??0),0));
        const f=Math.round(entries.reduce((s,e)=>s+(e.fiber??0),0));
        const isTrain=trainingByDate[date]??true;
        const wE=getWeightForDate(weightHistory,date);
        const g=computeGoals(wE?.weight||currentWeight,isTrain);
        dayData.push({date,protein:p,kcal:k,carbs:c,fiber:f,isTraining:isTrain,metProtein:p>=g.protein,metKcal:k>=g.kcal*0.85&&k<=g.kcal*1.15});
        MEALS.forEach(meal=>{
          const items=dayLog[meal]||[];
          if(!items.length) return;
          if(!acc[meal]) acc[meal]={count:0,protein:0,kcal:0};
          acc[meal].count++; acc[meal].protein+=entries.filter(e=>dayLog[meal]?.find(m=>m.id===e.id)).reduce((s,e)=>s+(e.protein??0),0);
        });
      }
      if(!dayData.length){notify("Sem dados suficientes para analisar.");setPatternsLoading(false);return;}
      const avgProt=Math.round(dayData.reduce((s,d)=>s+d.protein,0)/dayData.length);
      const avgKcal=Math.round(dayData.reduce((s,d)=>s+d.kcal,0)/dayData.length);
      const daysMetProt=dayData.filter(d=>d.metProtein).length;
      const trainDays=dayData.filter(d=>d.isTraining);
      const restDays=dayData.filter(d=>!d.isTraining);
      const prompt = "Analisa os padrões alimentares dos últimos 30 dias e fornece insights detalhados em português.\n\n"
        + "DADOS (" + dayData.length + " dias registados de 30):\n"
        + "Média diária: " + avgProt + "g proteína, " + avgKcal + " kcal\n"
        + "Dias que atingiu meta de proteína: " + daysMetProt + "/" + dayData.length + "\n"
        + (trainDays.length?"Dias de treino ("+trainDays.length+"): média "+Math.round(trainDays.reduce((s,d)=>s+d.protein,0)/trainDays.length)+"g prot, "+Math.round(trainDays.reduce((s,d)=>s+d.kcal,0)/trainDays.length)+" kcal\n":"")
        + (restDays.length?"Dias de descanso ("+restDays.length+"): média "+Math.round(restDays.reduce((s,d)=>s+d.protein,0)/restDays.length)+"g prot, "+Math.round(restDays.reduce((s,d)=>s+d.kcal,0)/restDays.length)+" kcal\n":"")
        + "Variação de proteína: mín "+Math.min(...dayData.map(d=>d.protein))+"g, máx "+Math.max(...dayData.map(d=>d.protein))+"g\n\n"
        + (currentWeight?"Peso actual: "+currentWeight+"kg\n\n":"")
        + "Identifica padrões concretos como:\n"
        + "- Diferença entre dias de treino e descanso\n"
        + "- Consistência vs inconsistência ao longo do tempo\n"
        + "- Tendências preocupantes ou positivas\n"
        + "- Áreas de melhoria com sugestões específicas\n\n"
        + "Estrutura com secções claras: Padrões Positivos, Padrões a Melhorar, Tendências Identificadas, Recomendações.";
      const _pText=await callAI(prompt,1200);
      setPatternsText(_pText);
    } catch(_){notify("Não foi possível analisar. Tenta novamente.");}
    setPatternsLoading(false);
  }

  function savePatterns() {
    if(!patternsText) return;
    const sep="\n\n---\n📊 PADRÕES ALIMENTARES ("+new Date().toLocaleDateString("pt-BR")+"):\n";
    setTodayNote(n=>(n?n+sep:sep.trim()+"\n")+patternsText);
    setPatternsSaved(true);
    notify("Análise guardada nas notas.");
  }

  async function generateMealSuggestions() {
    if(!pantry.length){notify("Adiciona alimentos à despensa primeiro.");return;}
    setSuggestLoading(true); setSuggestions(null);
    const remainProt=Math.max(0,Math.round(goals.protein-tot.protein));
    const remainKcal=Math.max(0,Math.round(goals.kcal-tot.kcal));
    const remainCarbs=Math.max(0,Math.round(goals.carbs-tot.carbs));
    if(remainProt===0&&remainKcal===0){notify("Já atingiste as metas de hoje!");setSuggestLoading(false);return;}
    const pantryList=sortedAllPantry.map(f=>{
      const div=f.unit==="un"?1:100;
      return f.name+" ("+f.protein100+"g prot/"+(f.unit==="un"?"un":"100"+f.unit)+", "+f.kcal100+" kcal/"+(f.unit==="un"?"un":"100"+f.unit)+")";
    }).join(", ");
    const prompt = "O utilizador precisa de fechar as metas nutricionais do dia. Sugere 3 combinações práticas de alimentos da despensa dele.\n\n"
      + "O QUE AINDA FALTA HOJE:\n"
      + (remainProt>0?"Proteína: "+remainProt+"g\n":"")
      + (remainKcal>0?"Calorias: "+remainKcal+" kcal\n":"")
      + (remainCarbs>0?"Carbs: "+remainCarbs+"g\n":"")
      + "\nDESPENSA DISPONÍVEL:\n"+pantryList+"\n\n"
      + "Para cada sugestão indica:\n"
      + "- Nome da combinação\n"
      + "- Alimentos com quantidades específicas (em gramas/ml/unidades)\n"
      + "- Totais de proteína e calorias estimados\n\n"
      + "Responde APENAS com JSON sem markdown:\n"
      + "[{\"name\":\"nome\",\"items\":[{\"food\":\"nome exacto da despensa\",\"qty\":X,\"unit\":\"g\"}],\"protein\":X,\"kcal\":X}]";
    try {
      const text=await callAI(prompt,800);
      const clean=text.replace(/```json|```/g,"").trim();
      setSuggestions(JSON.parse(clean));
    } catch(_){notify("Não foi possível gerar sugestões.");}
    setSuggestLoading(false);
  }

  function loadSuggestionToStaged(sugg) {
    const items=sugg.items.map(item=>{
      const food=pantry.find(f=>f.name.toLowerCase()===item.food.toLowerCase())||pantry.find(f=>f.name.toLowerCase().includes(item.food.toLowerCase().split(" ")[0]));
      if(!food) return null;
      return buildEntry(food,item.qty);
    }).filter(Boolean);
    if(!items.length){notify("Nenhum alimento da sugestão encontrado na despensa.");return;}
    setStaged({meal:addEntry.meal||"Outro",items});
    setBatchMode(true);
    setTab("adicionar");
    notify("\""+sugg.name+"\" carregada — ajusta e regista.");
  }

  function buildDayTotals(log) {
    const entries = Object.values(log).flat();
    return {
      protein: rnd(entries.reduce((s,e)=>s+(e.protein??0),0)),
      kcal:    rnd(entries.reduce((s,e)=>s+(e.kcal??0),0)),
      carbs:   rnd(entries.reduce((s,e)=>s+(e.carbs??0),0)),
      fat:     rnd(entries.reduce((s,e)=>s+(e.fat??0),0)),
      fiber:   rnd(entries.reduce((s,e)=>s+(e.fiber??0),0)),
      salt:    rnd(entries.reduce((s,e)=>s+(e.salt??0),0)),
    };
  }

  async function runExport(period, format) {
    setShowExportPanel(null);
    let content = "";
    let filename = "";
    if(period==="day") {
      const date = viewDate;
      const dayLog = activeLog;
      const totals = buildDayTotals(dayLog);
      const note = isToday ? todayNote : historyNote;
      filename = "nutricao_" + date + "." + format;
      if(format==="json") {
        content = JSON.stringify({date,isTraining,goals,meals:dayLog,totals,note},null,2);
      } else if(format==="csv") {
        const rows = [["Refeição","Alimento","Quantidade","Unidade","Proteína(g)","Calorias(kcal)","Carbs(g)","Gordura(g)","Fibra(g)","Sal(g)"]];
        MEALS.forEach(meal=>{(dayLog[meal]||[]).forEach(e=>{rows.push([meal,'"'+e.name+'"',e.qty,e.unit,rnd(e.protein),rnd(e.kcal),rnd(e.carbs),rnd(e.fat),rnd(e.fiber),rnd(e.salt)]);});});
        rows.push([],[]);
        rows.push(["TOTAIS","","","",totals.protein,totals.kcal,totals.carbs,totals.fat,totals.fiber,totals.salt]);
        rows.push(["META","","","",goals.protein,goals.kcal,goals.carbs,goals.fat,goals.fiber,goals.salt]);
        content = rows.map(r=>r.join(",")).join("\n");
      } else if(format==="html") {
        const mealRows = MEALS.map(meal=>{
          const items = dayLog[meal]||[];
          if(!items.length) return "";
          const itemRows = items.map(e=>"<tr><td>"+e.name+"</td><td>"+e.qty+e.unit+"</td><td>"+rnd(e.protein)+"g</td><td>"+rnd(e.kcal)+"</td><td>"+rnd(e.carbs)+"g</td><td>"+rnd(e.fat)+"g</td></tr>").join("");
          return "<h3>"+meal+"</h3><table border='1' cellpadding='6' style='border-collapse:collapse;width:100%;margin-bottom:16px'><tr><th>Alimento</th><th>Qtd</th><th>Proteína</th><th>Kcal</th><th>Carbs</th><th>Gordura</th></tr>"+itemRows+"</table>";
        }).join("");
        content = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Nutrição "+date+"</title>"
          + "<style>body{font-family:sans-serif;padding:24px;max-width:800px;margin:auto}h1,h3{color:#333}table{width:100%}td,th{padding:6px 10px;text-align:left;border:1px solid #ddd}.box{background:#f5f5f5;padding:12px;border-radius:6px;margin-top:16px}</style></head><body>"
          + "<h1>Relatório Nutricional — "+date+"</h1><p><b>Tipo:</b> "+(isTraining?"Treino":"Descanso")+"</p>"
          + mealRows
          + "<div class='box'><h3>Totais</h3><p>Proteína: <b>"+totals.protein+"g</b> (meta: "+goals.protein+"g) &nbsp;|&nbsp; Calorias: <b>"+totals.kcal+"</b> (meta: "+goals.kcal+") &nbsp;|&nbsp; Carbs: "+totals.carbs+"g &nbsp;|&nbsp; Gordura: "+totals.fat+"g &nbsp;|&nbsp; Fibra: "+totals.fiber+"g &nbsp;|&nbsp; Sal: "+totals.salt+"g</p></div>"
          + (note?"<div class='box'><h3>Notas</h3><p>"+note.replace(/\n/g,"<br>")+"</p></div>":"")
          + "</body></html>";
      } else {
        let txt = "RELATÓRIO NUTRICIONAL — " + date + "\nTipo: " + (isTraining?"Treino":"Descanso") + "\n\n";
        MEALS.forEach(meal=>{
          const items = dayLog[meal]||[];
          if(!items.length) return;
          txt += meal.toUpperCase() + "\n";
          items.forEach(e=>{ txt += "  " + e.name + " " + e.qty + e.unit + " — " + rnd(e.protein) + "g prot, " + rnd(e.kcal) + " kcal\n"; });
          txt += "\n";
        });
        txt += "TOTAIS\nProteína: "+totals.protein+"g / "+goals.protein+"g\nCalorias: "+totals.kcal+" / "+goals.kcal+"\nCarbs: "+totals.carbs+"g | Gordura: "+totals.fat+"g | Fibra: "+totals.fiber+"g | Sal: "+totals.salt+"g";
        if(note) txt += "\n\nNOTAS\n" + note;
        content = txt;
      }
    } else {
      // Week
      const days = [];
      for(let i=6;i>=0;i--) {
        const d=new Date(); d.setDate(d.getDate()-i);
        const date=d.toISOString().split("T")[0];
        let dayLog = date===TODAY ? log : {};
        if(date!==TODAY) {
          const l=await window.storage.get("log_v2_"+date).catch(()=>null);
          if(l) dayLog=JSON.parse(l.value);
        }
        const totals = buildDayTotals(dayLog);
        const wEntry = getWeightForDate(weightHistory,date);
        const g = computeGoals(wEntry?.weight||currentWeight, trainingByDate[date]??true);
        days.push({date, isTraining:trainingByDate[date]??true, goals:g, totals});
      }
      filename = "semana_" + TODAY + "." + format;
      if(format==="json") {
        content = JSON.stringify(days,null,2);
      } else if(format==="csv") {
        const rows = [["Data","Tipo","Proteína(g)","Meta Prot","Calorias","Meta Kcal","Carbs(g)","Gordura(g)","Fibra(g)","Sal(g)"]];
        days.forEach(d=>rows.push([d.date,d.isTraining?"Treino":"Descanso",d.totals.protein,d.goals.protein,d.totals.kcal,d.goals.kcal,d.totals.carbs,d.totals.fat,d.totals.fiber,d.totals.salt]));
        content = rows.map(r=>r.join(",")).join("\n");
      } else if(format==="html") {
        const rows = days.map(d=>"<tr><td>"+d.date+"</td><td>"+(d.isTraining?"Treino":"Descanso")+"</td><td>"+d.totals.protein+"g / "+d.goals.protein+"g</td><td>"+d.totals.kcal+" / "+d.goals.kcal+"</td><td>"+d.totals.carbs+"g</td><td>"+d.totals.fat+"g</td><td>"+d.totals.fiber+"g</td></tr>").join("");
        content = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Semana Nutricional</title><style>body{font-family:sans-serif;padding:24px;max-width:900px;margin:auto}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;border:1px solid #ddd}th{background:#f0f0f0}tr:nth-child(even){background:#fafafa}</style></head><body><h1>Relatório Semanal — "+TODAY+"</h1><table><tr><th>Data</th><th>Tipo</th><th>Proteína</th><th>Calorias</th><th>Carbs</th><th>Gordura</th><th>Fibra</th></tr>"+rows+"</table></body></html>";
      } else {
        let txt = "RELATÓRIO SEMANAL — " + TODAY + "\n\n";
        days.forEach(d=>{ txt += d.date+" ("+(d.isTraining?"Treino":"Descanso")+")\n  Proteína: "+d.totals.protein+"g / "+d.goals.protein+"g | Calorias: "+d.totals.kcal+" / "+d.goals.kcal+"\n\n"; });
        content = txt;
      }
    }
    setExportResult({ content, filename, copied:false });
  }

  async function generateFeedback(type) {
    setFeedbackLoading(true);
    setFeedbackText("");
    setFeedbackPeriod(type);
    setFeedbackSaved(false);
    try {
      let prompt = "";
      if(type==="day") {
        const entries = Object.values(activeLog).flat();
        const mealSummary = MEALS.map(meal=>{
          const items = activeLog[meal]||[];
          if(!items.length) return null;
          return meal + ": " + items.map(e=>e.name+" "+e.qty+e.unit).join(", ");
        }).filter(Boolean).join("\n");
        const p = entries.reduce((s,e)=>s+(e.protein??0),0);
        const k = entries.reduce((s,e)=>s+(e.kcal??0),0);
        const c = entries.reduce((s,e)=>s+(e.carbs??0),0);
        const f = entries.reduce((s,e)=>s+(e.fat??0),0);
        const fi = entries.reduce((s,e)=>s+(e.fiber??0),0);
        const sa = entries.reduce((s,e)=>s+(e.salt??0),0);
        prompt = "Analisa a alimentação deste dia e dá um feedback detalhado em português.\n\n"
          + "DATA: " + viewDate + " (" + (isTraining?"dia de treino":"dia de descanso") + ")\n\n"
          + "METAS DO DIA:\n"
          + "Proteína: " + goals.protein + "g | Calorias: " + goals.kcal + " kcal | Carbs: " + goals.carbs + "g | Gordura: " + goals.fat + "g | Fibra: " + goals.fiber + "g\n\n"
          + "O QUE COMEU:\n" + (mealSummary||"Nenhum alimento registado") + "\n\n"
          + "TOTAIS DO DIA:\n"
          + "Proteína: " + Math.round(p) + "g | Calorias: " + Math.round(k) + " kcal | Carbs: " + Math.round(c) + "g | Gordura: " + Math.round(f) + "g | Fibra: " + Math.round(fi) + "g | Sal: " + Math.round(sa*10)/10 + "g\n\n"
          + (currentWeight?"Peso actual: "+currentWeight+"kg\n\n":"")
          + "Estrutura o feedback com estas secções:\n"
          + "✅ PONTOS POSITIVOS (o que correu bem)\n"
          + "⚠️ O QUE MELHORAR (excessos, défices, desequilíbrios)\n"
          + "💡 SUGESTÕES CONCRETAS (substituições ou adições específicas)\n"
          + "📊 RESUMO GERAL (avaliação curta do dia)\n\n"
          + "Sê honesto, específico e prático. Evita ser demasiado genérico.";
      } else {
        const days = weekData.filter(d=>d.hasData);
        if(!days.length){notify("Sem dados suficientes para a semana.");setFeedbackLoading(false);return;}
        const avg = {
          protein: Math.round(days.reduce((s,d)=>s+d.protein,0)/days.length),
          kcal: Math.round(days.reduce((s,d)=>s+d.kcal,0)/days.length),
        };
        const daySummary = days.map(d=>d.date+" — prot: "+d.protein+"g, kcal: "+d.kcal+" (meta: "+d.proteinGoal+"g/"+d.kcalGoal+"kcal) "+(d.metProtein?"✓":"✗")).join("\n");
        const daysMetProt = days.filter(d=>d.metProtein).length;
        prompt = "Analisa a alimentação desta semana e dá um feedback detalhado em português.\n\n"
          + "RESUMO DA SEMANA (" + days.length + " dias registados):\n"
          + daySummary + "\n\n"
          + "MÉDIAS:\nProteína: " + avg.protein + "g/dia | Calorias: " + avg.kcal + " kcal/dia\n"
          + "Dias que atingiu a meta de proteína: " + daysMetProt + "/" + days.length + "\n\n"
          + (currentWeight?"Peso actual: "+currentWeight+"kg\n\n":"")
          + "Estrutura o feedback com estas secções:\n"
          + "✅ PONTOS POSITIVOS (consistência, dias bons, tendências positivas)\n"
          + "⚠️ O QUE MELHORAR (padrões negativos, dias fracos, desequilíbrios recorrentes)\n"
          + "💡 SUGESTÕES CONCRETAS (como ajustar os próximos dias)\n"
          + "📊 AVALIAÇÃO DA SEMANA (nota geral e contexto)\n\n"
          + "Sê honesto, específico e prático. Foca em padrões da semana, não só num dia.";
      }
      const text = await callAI(prompt, 1000);
      setFeedbackText(text);
    } catch(_){ notify("Não foi possível gerar o feedback. Tenta novamente."); }
    setFeedbackLoading(false);
  }

  function saveFeedbackAsNote() {
    if(!feedbackText) return;
    const separator = "\n\n---\n📋 FEEDBACK " + (feedbackPeriod==="day"?"DO DIA":"DA SEMANA") + " (" + new Date().toLocaleDateString("pt-BR") + "):\n";
    if(feedbackPeriod==="day") {
      if(isToday) setTodayNote(n=>(n?n+separator:separator.trim()+"\n")+feedbackText);
      else setHistoryNote(n=>(n?n+separator:separator.trim()+"\n")+feedbackText);
    } else {
      setTodayNote(n=>(n?n+separator:separator.trim()+"\n")+feedbackText);
    }
    notify("Feedback guardado nas notas.");
    setFeedbackSaved(true);
  }

  const currentEntry=getWeightForDate(weightHistory,TODAY);
  const currentWeight=currentEntry?.weight||null;
  const currentHeight=currentEntry?.height||null;
  const isTraining = trainingByDate[viewDate] ?? true;
  const viewEntry=getWeightForDate(weightHistory,viewDate);
  const viewWeight=viewEntry?.weight||currentWeight;
  const baseWaterGoal = viewWeight ? Math.round(viewWeight*(isTraining?40:35)/50)*50 : 2500;
  const baseGoals=computeGoals(viewWeight,isTraining);
  const goals={
    protein: customGoals.protein||baseGoals.protein,
    kcal:    customGoals.kcal||baseGoals.kcal,
    carbs:   customGoals.carbs||baseGoals.carbs,
    fat:     customGoals.fat||baseGoals.fat,
    fiber:   customGoals.fiber||baseGoals.fiber,
    salt:    customGoals.salt||baseGoals.salt,
    water:   customGoals.water||baseWaterGoal,
  };
  const bmiNum=currentWeight&&currentHeight?currentWeight/((currentHeight/100)**2):null;
  const bmi=bmiNum?bmiNum.toFixed(1):null;

  const isToday=viewDate===TODAY;
  const activeLog=isToday?log:historyLog;
  function setActiveLog(newLog) {
    if(isToday){ setLog(newLog); }
    else{ setHistoryLog(newLog); scheduleSave("log_v2_"+viewDate,newLog); }
  }

  // Pantry
  function addFood(){
    if(!form.name||!form.protein100||!form.kcal100) return;
    const food={id:Date.now().toString(),name:form.name.trim(),unit:form.unit};
    ALL_FIELDS.forEach(f=>{food[f.key]=form[f.key]===""?null:parseFloat(form[f.key]);});
    setPantry(p=>[...p,food]); setForm(emptyFood()); notify("Alimento guardado.");
  }
  function removeFood(id){
    setPantry(p=>p.filter(f=>f.id!==id));
    const nl={};Object.keys(log).forEach(m=>{nl[m]=(log[m]||[]).filter(e=>e.foodId!==id);});setLog(nl);
  }
  function startEdit(food){
    const f={...food};ALL_FIELDS.forEach(ff=>{if(f[ff.key]==null)f[ff.key]="";});
    setEditingId(food.id);setEditForm(f);
  }
  function saveEdit(){
    const u={...editForm};ALL_FIELDS.forEach(f=>{u[f.key]=editForm[f.key]===""?null:parseFloat(editForm[f.key]);});
    u.name=editForm.name.trim();
    setPantry(p=>p.map(food=>food.id===editingId?u:food));
    setEditingId(null);setEditForm(null);notify("Alimento atualizado.");
  }

  function buildEntry(food,qty){
    const e={id:Date.now().toString()+Math.random(),foodId:food.id,name:food.name,qty,unit:food.unit};
    const div=divisor(food.unit);
    ALL_FIELDS.forEach(f=>{e[f.key.replace("100","")]=food[f.key]!=null?(food[f.key]*qty)/div:null;});
    return e;
  }

  // Diary entry edit
  function startEditEntry(entry){setEditEntryId(entry.id);setEditEntryQty(String(entry.qty));}
  function saveEntryEdit(meal){
    const qty=parseFloat(editEntryQty);
    if(isNaN(qty)||qty<=0){setEditEntryId(null);return;}
    setActiveLog({...activeLog,[meal]:activeLog[meal].map(e=>{
      if(e.id!==editEntryId) return e;
      const food=pantry.find(f=>f.id===e.foodId);
      if(food){const ne=buildEntry(food,qty);ne.id=e.id;return ne;}
      const ratio=qty/e.qty;const upd={...e,qty};
      ALL_FIELDS.forEach(f=>{const k=f.key.replace("100","");if(e[k]!=null)upd[k]=e[k]*ratio;});
      return upd;
    })});
    setEditEntryId(null);notify("Quantidade actualizada.");
  }

  function addToLog(){
    if(!addEntry.foodId||!addEntry.qty) return;
    const food=pantry.find(f=>f.id===addEntry.foodId);if(!food) return;
    const entry=buildEntry(food,parseFloat(addEntry.qty));
    setActiveLog({...activeLog,[addEntry.meal]:[...(activeLog[addEntry.meal]||[]),entry]});
    setAddEntry(e=>({...e,qty:""}));notify(`${food.name} adicionado.`);
  }
  function addToStaged(){
    if(!addEntry.foodId||!addEntry.qty) return;
    const food=pantry.find(f=>f.id===addEntry.foodId);if(!food) return;
    setStaged(s=>({...s,items:[...s.items,buildEntry(food,parseFloat(addEntry.qty))]}));
    setAddEntry(e=>({...e,foodId:"",qty:""}));
  }
  function removeFromStaged(idx){setStaged(s=>({...s,items:s.items.filter((_,i)=>i!==idx)}));}
  function commitStaged(){
    if(!staged.items.length) return;
    const meal=staged.meal,items=[...staged.items];
    setActiveLog({...activeLog,[meal]:[...(activeLog[meal]||[]),...items]});
    setStaged(s=>({...s,items:[]}));notify(`${items.length} item(ns) registado(s) em ${meal}.`);
  }
  function removeEntry(meal,id){setActiveLog({...activeLog,[meal]:activeLog[meal].filter(e=>e.id!==id)});}

  // Templates
  function saveTemplate(){
    if(!templateName.trim()||!staged.items.length) return;
    const t={id:Date.now().toString(),name:templateName.trim(),meal:staged.meal,
      items:staged.items.map(e=>({foodId:e.foodId,name:e.name,qty:e.qty,unit:e.unit}))};
    setMealTemplates(mt=>[...mt,t]);setTemplateName("");notify("Template guardado.");
  }
  function loadTemplate(t){
    const items=t.items.map(item=>{
      const food=pantry.find(f=>f.id===item.foodId);
      return food?buildEntry(food,item.qty):null;
    }).filter(Boolean);
    setStaged({meal:t.meal,items});setBatchMode(true);notify(`"${t.name}" carregado.`);
  }
  function loadRecentMealToStaged(recentMeal) {
    const items = recentMeal.entries.map(e=>({...e, id:Date.now().toString()+Math.random()}));
    setStaged({meal:recentMeal.meal, items});
    setBatchMode(true);
    setShowRecentMeals(false);
    notify(`"${recentMeal.meal}" de ${recentMeal.date} carregada. Ajusta e regista.`);
  }

  function saveEditStaged() {
    const qty=parseFloat(editStagedQty);
    if(isNaN(qty)||qty<=0){setEditStagedIdx(null);return;}
    setStaged(s=>({...s,items:s.items.map((item,i)=>{
      if(i!==editStagedIdx) return item;
      const food=pantry.find(f=>f.id===item.foodId);
      if(food){const ne=buildEntry(food,qty);ne.id=item.id;return ne;}
      const ratio=qty/item.qty;
      const upd={...item,qty};
      ALL_FIELDS.forEach(f=>{const k=f.key.replace("100","");if(item[k]!=null)upd[k]=item[k]*ratio;});
      return upd;
    })}));
    setEditStagedIdx(null);
  }

  // Weight
  function saveWeight(){
    if(!weightForm.weight) return;
    const entry={id:Date.now().toString(),date:TODAY,weight:parseFloat(weightForm.weight),
      height:weightForm.height?parseFloat(weightForm.height):(currentHeight||null)};
    setWeightHistory(h=>[...h.filter(e=>e.date!==TODAY),entry].sort((a,b)=>a.date.localeCompare(b.date)));
    setWeightForm({weight:"",height:""});notify("Peso actualizado.");
  }
  function startEditWeight(e){setEditingWeightId(e.id);setEditWeightForm({weight:String(e.weight),height:e.height?String(e.height):"",date:e.date});}
  function saveWeightEdit(){
    if(!editWeightForm.weight) return;
    setWeightHistory(h=>h.map(e=>e.id===editingWeightId
      ?{...e,weight:parseFloat(editWeightForm.weight),height:editWeightForm.height?parseFloat(editWeightForm.height):e.height,date:editWeightForm.date}
      :e).sort((a,b)=>a.date.localeCompare(b.date)));
    setEditingWeightId(null);notify("Registo actualizado.");
  }

  // Export/Import
  // ── Gemini AI helper ─────────────────────────────────────────
  async function callAI(prompt, maxTokens) {
    const key = localStorage.getItem('gemini_key') || '';
    if (!key) throw new Error('Chave API Gemini não configurada. Abre as Configurações (⚙).');
    const proxy = localStorage.getItem('cors_proxy') || '';
    const url = proxy + 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key;
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        contents: [{parts: [{text: prompt}]}],
        generationConfig: {maxOutputTokens: maxTokens || 800, temperature: 0.3}
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Erro na API Gemini');
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async function importFullBackup(e) {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const data = parsed.data || parsed;
        const keys = Object.keys(data);
        if (!keys.length) { notify("Ficheiro vazio ou inválido."); return; }
        if (!window.confirm(`Importar ${keys.length} registos? Os dados existentes com as mesmas chaves serão substituídos.`)) return;
        notify("A importar...");
        let count = 0;
        for (let i = 0; i < keys.length; i += 10) {
          await Promise.all(keys.slice(i, i+10).map(async k => {
            try { await window.storage.set(k, data[k]); count++; } catch(_) {}
          }));
        }
        notify(`✓ ${count} registos importados. Recarrega a página para ver tudo.`);
      } catch(err) { notify("Erro ao ler ficheiro: " + err.message); }
    };
    reader.readAsText(file);
  }

  async function exportFullBackup() {
    setBackupLoading(true);
    setBackupJson(null);
    try {
      const result = {};
      // List all existing keys first (one call only)
      const listed = await window.storage.list();
      const allKeys = listed?.keys || [];
      // Also always try static keys
      const staticKeys = ['pantry_v2','suppPantry','waterGoal','customGoals','mealTemplates','weightHistory','trainingByDate'];
      const toFetch = [...new Set([...staticKeys, ...allKeys])];
      // Fetch in parallel batches of 20
      for (let i = 0; i < toFetch.length; i += 20) {
        const batch = toFetch.slice(i, i + 20);
        await Promise.all(batch.map(async key => {
          try { const r = await window.storage.get(key); if (r && r.value) result[key] = r.value; } catch(_) {}
        }));
      }
      const json = JSON.stringify({exportedAt: new Date().toISOString(), version: 2, data: result}, null, 2);
      setBackupJson(json);
      notify("Backup gerado! Copia o JSON abaixo.");
    } catch(e) {
      notify("Erro ao exportar: " + e.message);
    }
    setBackupLoading(false);
  }

  function exportCSV(){
    const headers=["name","unit",...ALL_FIELDS.map(f=>f.key)];
    const rows=pantry.map(food=>headers.map(h=>{const v=food[h];if(v==null||v==="")return "";if(typeof v==="string"&&v.includes(","))return`"${v}"`;return v;}).join(","));
    const csv=[headers.join(","),...rows].join("\n");
    navigator.clipboard.writeText(csv).then(()=>notify("CSV da despensa copiado para a área de transferência!")).catch(()=>{setBackupJson(csv);notify("Copia o texto que apareceu em baixo.");});
  }
  function importCSV(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=evt=>{
      try{
        const lines=evt.target.result.split("\n").filter(l=>l.trim());
        const headers=lines[0].split(",").map(h=>h.trim());
        const imported=lines.slice(1).map(line=>{
          const vals=line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
          const food={id:Date.now().toString()+Math.random()};
          headers.forEach((h,i)=>{const v=vals[i];if(h==="name"||h==="unit")food[h]=v||"";else food[h]=v===""||v==null?null:parseFloat(v);});
          return food;
        }).filter(f=>f.name);
        if(!imported.length){notify("Nenhum alimento encontrado.");return;}
        setPantry(p=>{const ex=new Set(p.map(f=>f.name.toLowerCase()));const news=imported.filter(f=>!ex.has(f.name.toLowerCase()));notify(`${news.length} importado(s).`);return[...p,...news];});
      }catch(_){notify("Erro ao ler ficheiro.");}
    };
    reader.readAsText(file);e.target.value="";
  }
  function exportMeals(){
    const meals={};Object.entries(activeLog).forEach(([m,en])=>{if(en?.length)meals[m]=en;});
    const json=JSON.stringify({date:viewDate,meals},null,2);
    setBackupJson(json);notify("JSON gerado — copia a partir da secção Backup.");
  }
  function importMeals(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=evt=>{
      try{
        const data=JSON.parse(evt.target.result);const meals=data.meals||data;let count=0;
        const newLog={...activeLog};
        Object.entries(meals).forEach(([meal,entries])=>{const wi=entries.map(en=>({...en,id:Date.now().toString()+Math.random()}));newLog[meal]=[...(newLog[meal]||[]),...wi];count+=entries.length;});
        setActiveLog(newLog);notify(`${count} item(ns) importado(s).`);
      }catch(_){notify("Erro ao importar.");}
    };
    reader.readAsText(file);e.target.value="";
  }
  function exportDayLog(){
    const json=JSON.stringify({date:viewDate,isTraining,goals,log:activeLog},null,2);
    setBackupJson(json);notify("JSON do dia gerado — copia a partir da secção Backup.");
  }
  function importDayLog(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=evt=>{
      try{
        const data=JSON.parse(evt.target.result);
        if(!data.log){notify("Formato inválido.");return;}
        if(window.confirm("Substituir o registo actual pelo ficheiro importado?")){setActiveLog(data.log);notify("Registo importado.");}
      }catch(_){notify("Erro ao importar.");}
    };
    reader.readAsText(file);e.target.value="";
  }

  const allEntries=Object.values(activeLog).flat();
  function total(key){const k=key.replace("100","");return allEntries.reduce((s,e)=>s+(e[k]??0),0);}
  const tot={protein:total("protein"),kcal:total("kcal"),carbs:total("carbs"),fat:total("fat"),fiber:total("fiber"),salt:total("salt"),sugars:total("sugars"),satfat:total("satfat")};
  const stagedTot={protein:staged.items.reduce((s,e)=>s+(e.protein??0),0),kcal:staged.items.reduce((s,e)=>s+(e.kcal??0),0),carbs:staged.items.reduce((s,e)=>s+(e.carbs??0),0)};
  const hasMicros=MICRO_FIELDS.some(f=>allEntries.some(e=>e[f.key.replace("100","")]));
  const selectedFood=addEntry.foodId?pantry.find(f=>f.id===addEntry.foodId):null;
  const filteredPantry=pantrySearch?pantry.filter(f=>f.name.toLowerCase().includes(pantrySearch.toLowerCase())):pantry;
  const sortedPantry=[...filteredPantry].sort((a,b)=>a.name.localeCompare(b.name,"pt"));
  const sortedAllPantry=[...pantry].sort((a,b)=>a.name.localeCompare(b.name,"pt"));
  const remainProtein=Math.max(0,Math.round(goals.protein-tot.protein));
  const remainKcal=Math.max(0,Math.round(goals.kcal-tot.kcal));
  const dateStr=new Date(viewDate+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const weightChartData=weightHistory.map(e=>({date:e.date.slice(5),weight:e.weight}));
  const daysWithData=weekData.filter(d=>d.hasData);
  const avgProtein=daysWithData.length?Math.round(daysWithData.reduce((s,d)=>s+d.protein,0)/daysWithData.length):0;
  const avgKcal=daysWithData.length?Math.round(daysWithData.reduce((s,d)=>s+d.kcal,0)/daysWithData.length):0;
  const daysMetProtein=daysWithData.filter(d=>d.metProtein).length;

  const THEME = darkMode ? {
    "--bg":"#111","--surface":"#161616","--surface3":"#141414",
    "--input":"var(--btn-inactive)","--track":"#1c1c1c","--row":"#181818",
    "--border":"#222","--border2":"#2a2a2a","--border3":"#1e1e1e",
    "--border-info":"#2a2a4a",
    "--text":"#e8e0d5","--text2":"#d5cfc8","--text3":"#c9bfb0",
    "--muted":"#8a8a8a","--muted2":"#7a7a7a","--dim":"#444","--faint":"#333",
    "--btn-ok":"#1e2e1e","--btn-info":"#1a1e2a","--tab-active":"var(--btn-inactive)","--btn-inactive":"var(--btn-inactive)","--btn-inactive-border":"#252525",
    "--btn-warn":"#2a1a1a","--btn-teal":"#1a2a2a",
    "--btn-ok-border":"#3a5a3a","--btn-ok-text":"var(--btn-ok-text)",
    "--btn-info-border":"#3a3a6a","--btn-info-text":"var(--btn-info-text)",
    "--btn-warn-border":"#5a3a3a","--btn-warn-text":"var(--btn-warn-text)",
    "--btn-teal-border":"#3a6a6a","--btn-teal-text":"var(--btn-teal-text)",
    "--toggle-train-bg":"#1e2e1e","--toggle-train-border":"#3a6a3a","--toggle-train-text":"var(--btn-ok-text)",
    "--toggle-rest-bg":"var(--btn-info)","--toggle-rest-border":"#3a3a6a","--toggle-rest-text":"var(--btn-info-text)",
    "--notif-ok-bg":"#1e2e1e","--notif-ok-border":"#3a5a3a","--notif-ok-text":"var(--btn-ok-text)",
    "--notif-err-bg":"#2e1a1a","--notif-err-border":"#6a3a3a","--notif-err-text":"var(--btn-warn-text)",
        "--chart-bg":"var(--btn-inactive)","--chart-tick":"#888","--chart-border":"#2a2a2a",
    "--chart-label":"#aaa",
  } : {
    "--bg":"#f2f1ed","--surface":"#ffffff","--surface3":"#f0eeea",
    "--input":"#f5f3ef","--track":"#dedad4","--row":"#f8f7f3",
    "--border":"#ccc8c0","--border2":"#b8b4ac","--border3":"#d8d4cc",
    "--border-info":"#c8c8e0",
    "--text":"#252220","--text2":"#2e2b28","--text3":"#3a3733",
    "--muted":"#6a6662","--muted2":"#7a7672","--dim":"#8a8680","--faint":"#aaa8a0",
    "--btn-ok":"#e8f4e8","--btn-info":"#e8eaf4",
    "--btn-warn":"#f4e8e8","--btn-teal":"#e8f4f4",
  };

  const CT = {
    bg: darkMode?"#1a1a1a":"#ffffff",
    tick: darkMode?"#888":"#555",
    border: darkMode?"#2a2a2a":"#e0dbd3",
    label: darkMode?"#aaa":"#777",
  };

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,color:"var(--muted)",fontFamily:"system-ui,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"}}>
      <div style={{fontSize:22}}>⟳</div>
      <div style={{fontSize:13,letterSpacing:2}}>A sincronizar...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"system-ui,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",paddingBottom:60,...THEME}}>

      {/* Header */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"14px 20px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,letterSpacing:3,color:"var(--muted)",textTransform:"uppercase",marginBottom:2}}>Diário Nutricional</div>
            <div style={{fontSize:15,color:"var(--text3)",fontStyle:"italic"}}>{dateStr}</div>
          </div>
          <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Modo claro":"Modo escuro"} style={{background:"none",border:"1px solid var(--border2)",color:"var(--muted)",borderRadius:4,padding:"5px 8px",fontSize:12,cursor:"pointer"}}>{darkMode?"☀":"🌙"}</button>
          <button onClick={loadAll} style={{background:"none",border:"1px solid var(--border2)",color:syncing?"#3a6a3a":"#555",borderRadius:4,padding:"5px 10px",fontSize:10,cursor:"pointer",letterSpacing:1}}>
            {syncing?"↻ sync...":"↻ atualizar"}
          </button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
          <span style={{fontSize:11,color:"var(--muted)"}}>Dia de</span>
          <button onClick={()=>setTrainingByDate(t=>({...t,[viewDate]:!isTraining}))} style={{
            background:isTraining?(darkMode?"#1e2e1e":"#c8eec8"):(darkMode?"#1e1e2e":"#c8c8ee"),
            border:`1px solid ${isTraining?(darkMode?"#3a6a3a":"#5a9a5a"):(darkMode?"#3a3a6a":"#5a5a9a")}`,
            color:isTraining?(darkMode?"#7ec87e":"#1a4a1a"):(darkMode?"#7e7ec8":"#28288a"),
            borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:"600",cursor:"pointer",letterSpacing:1
          }}>{isTraining?"TREINO":"DESCANSO"}</button>
          {currentWeight&&<span style={{fontSize:11,color:"var(--muted)",marginLeft:"auto"}}>{currentWeight}kg{bmi?` · IMC ${bmi}`:""}</span>}
        </div>
      </div>

      {/* Rings — show for all dates */}
      <>
          <div style={{display:"flex",background:"var(--surface)",borderBottom:"1px solid var(--border)"}}>
            {[{label:"Proteína",val:tot.protein,goal:goals.protein,color:"#c8a96e",unit:"g"},{label:"Calorias",val:tot.kcal,goal:goals.kcal,color:"#8ec8c8",unit:"kcal"}].map(({label,val,goal,color,unit})=>(
              <div key={label} style={{flex:1,padding:"14px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,borderRight:"1px solid var(--border)"}}>
                <div style={{position:"relative",width:76,height:76}}>
                  <Ring value={val} max={goal} color={color}/>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:14,fontWeight:"bold",color:val>goal?"#ff4d4d":color}}>{Math.round(val)}</span>
                    <span style={{fontSize:9,color:"var(--dim)"}}>{unit}</span>
                  </div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>{label}</div>
                  <div style={{fontSize:10,color:"var(--faint)"}}>meta {goal}{unit}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Remaining indicator — only for today */}
          {isToday&&(remainProtein>0||remainKcal>0)&&(
            <div style={{background:"var(--surface3)",borderBottom:"1px solid var(--border3)",padding:"7px 20px"}}>
              <div style={{display:"flex",gap:20,fontSize:11,marginBottom:6}}>
                {remainProtein>0&&<span style={{color:"#c8a96e"}}>Faltam <b>{remainProtein}g</b> proteína</span>}
                {remainKcal>0&&<span style={{color:"#8ec8c8"}}>Faltam <b>{remainKcal}</b> kcal</span>}
              </div>
              <button onClick={generateMealSuggestions} disabled={suggestLoading} style={{
                width:"100%",background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:suggestLoading?"#555":"var(--btn-ok-text)",
                padding:"7px",borderRadius:6,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",cursor:suggestLoading?"default":"pointer",fontFamily:"inherit"
              }}>
                {suggestLoading?"⟳ A calcular...":"✦ Sugerir o que comer"}
              </button>
              {suggestions&&(
                <div style={{marginTop:10}}>
                  {suggestions.map((s,i)=>(
                    <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"10px 12px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                        <span style={{fontSize:13,color:"var(--text3)"}}>{s.name}</span>
                        <span style={{fontSize:11,color:"var(--muted)"}}>{s.protein}g · {s.kcal} kcal</span>
                      </div>
                      {s.items.map((item,j)=>(
                        <div key={j} style={{fontSize:11,color:"var(--muted)",marginBottom:2}}>· {item.food} — {item.qty}{item.unit}</div>
                      ))}
                      <button onClick={()=>loadSuggestionToStaged(s)} style={{
                        marginTop:8,background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",
                        borderRadius:4,padding:"5px 12px",fontSize:10,cursor:"pointer",letterSpacing:1,width:"100%"
                      }}>+ Adicionar esta refeição</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Macro bars */}
          <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"12px 20px"}}>
            <Bar value={Math.round(tot.carbs*10)/10}  max={goals.carbs}  color="#a96ec8" label="Carboidratos"        unit="g"/>
            {tot.sugars>0&&<Bar value={Math.round(tot.sugars*10)/10} max={0} color="#a96ec8" label="dos quais açúcares" unit="g" sub/>}
            <Bar value={Math.round(tot.fat*10)/10}    max={goals.fat}    color="#c86e8e" label="Gorduras"             unit="g"/>
            {tot.satfat>0&&<Bar value={Math.round(tot.satfat*10)/10} max={20} color="#c86e8e" label="das quais saturadas" unit="g" sub/>}
            <Bar value={Math.round(tot.fiber*10)/10}  max={goals.fiber}  color="#6ec8a9" label="Fibra"                unit="g"/>
            <Bar value={Math.round(tot.salt*100)/100} max={goals.salt}   color="#888"    label="Sal"                  unit="g"/>
          </div>

          {hasMicros&&(
            <div style={{background:"var(--surface3)",borderBottom:"1px solid var(--border3)"}}>
              <button onClick={()=>setExpandMicros(e=>!e)} style={{width:"100%",background:"none",border:"none",color:"var(--muted)",padding:"8px 20px",fontSize:10,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                <span>Micronutrientes</span><span>{expandMicros?"▲":"▼"}</span>
              </button>
              {expandMicros&&(
                <div style={{padding:"0 20px 12px"}}>
                  {MICRO_FIELDS.map(f=>{
                    const val=allEntries.reduce((s,e)=>s+(e[f.key.replace("100","")]??0),0);
                    if(!val) return null;
                    return <div key={f.key} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--border3)",fontSize:12}}><span style={{color:"var(--muted)"}}>{f.label}</span><span style={{color:"var(--muted2)"}}>{val%1===0?val:val.toFixed(2)} {f.unit}</span></div>;
                  })}
                </div>
              )}
            </div>
          )}
        </>

      {notification&&<div style={{margin:"8px 16px 0",background:notification.startsWith("⚠")?"var(--notif-err-bg)":"var(--notif-ok-bg)",border:`1px solid ${notification.startsWith("⚠")?"var(--notif-err-border)":"var(--notif-ok-border)"}`,color:notification.startsWith("⚠")?"var(--notif-err-text)":"var(--notif-ok-text)",padding:"7px 14px",borderRadius:6,fontSize:12,textAlign:"center"}}>{notification}</div>}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",marginTop:10}}>
        {[["diario","Diário"],["adicionar","+"],["despensa","Despensa"],["semana","Semana"],["metricas","Métricas"]].map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 0",background:tab===t?"var(--tab-active)":"transparent",border:"none",borderBottom:tab===t?"2px solid #c8a96e":"2px solid transparent",color:tab===t?"#c8a96e":"#444",fontSize:9,letterSpacing:1,textTransform:"uppercase",cursor:"pointer"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"16px"}}>

        {/* ── DIÁRIO ── */}
        {tab==="diario"&&(
          <div>
            {/* Date navigation */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,background:"var(--surface)",borderRadius:8,padding:"8px 12px"}}>
              <button onClick={()=>changeViewDate(addDays(viewDate,-1))} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:"0 8px"}}>‹</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:13,color:isToday?"#c8a96e":"#c9bfb0"}}>{dateLabel(viewDate)}</div>
                {!isToday&&<div style={{fontSize:10,color:"var(--muted)"}}>{viewDate}</div>}
              </div>
              <button onClick={()=>{if(viewDate<TODAY)changeViewDate(addDays(viewDate,1));}} style={{background:"none",border:"none",color:viewDate>=TODAY?"#2a2a2a":"#666",cursor:viewDate>=TODAY?"default":"pointer",fontSize:18,padding:"0 8px"}}>›</button>
            </div>

            {/* History stats banner */}
            {!isToday&&(()=>{
              const entries=Object.values(activeLog).flat();
              const p=entries.reduce((s,e)=>s+(e.protein??0),0);
              const k=entries.reduce((s,e)=>s+(e.kcal??0),0);
              if(!entries.length) return <div style={{textAlign:"center",color:"var(--faint)",fontSize:12,fontStyle:"italic",marginBottom:12}}>Sem registos para este dia.</div>;
              return (
                <div style={{background:"var(--surface)",borderRadius:6,padding:"10px 14px",marginBottom:14,display:"flex",gap:20,fontSize:12}}>
                  <span style={{color:"#c8a96e"}}>{Math.round(p)}g proteína</span>
                  <span style={{color:"#8ec8c8"}}>{Math.round(k)} kcal</span>
                </div>
              );
            })()}

            {/* Water widget */}
            {isToday&&(
              <div style={{background:"var(--surface)",border:"1px solid var(--btn-teal-border)",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:10,letterSpacing:2,color:darkMode?"#3ab88a":"#1a8a6a",textTransform:"uppercase"}}>💧 Água</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,color:totalWater>=goals.water?"#6ec8a9":"#8ec8c8"}}>{totalWater}ml</span>
                    <span style={{fontSize:10,color:"var(--dim)"}}>/ {goals.water}ml</span>
                    <span style={{fontSize:9,color:"var(--faint)"}}>({viewWeight?`${isTraining?40:35}ml/kg`:"padrão"})</span>
                    <button onClick={()=>setEditWaterGoal(e=>!e)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:11}}>⚙</button>
                  </div>
                </div>
                <div style={{height:4,background:"var(--track)",borderRadius:4,marginBottom:10}}>
                  <div style={{height:"100%",width:Math.min(totalWater/goals.water*100,100)+"%",borderRadius:4,background:totalWater>=goals.water?"#6ec8a9":"#3a8a7a",transition:"width 0.4s ease"}}/>
                </div>
                {editWaterGoal&&(
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    <input type="number" value={waterGoalInput} onChange={e=>setWaterGoalInput(e.target.value)}
                      placeholder={"Meta actual: "+goals.water+"ml"} style={{...inp,flex:1,marginTop:0,padding:"6px 10px",fontSize:12}}/>
                    <button onClick={()=>{const v=parseFloat(waterGoalInput);if(!isNaN(v)&&v>0){setWaterGoal(v);setWaterGoalInput("");setEditWaterGoal(false);}}} style={{background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>ok</button>
                  </div>
                )}
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                  {[150,200,250,330,500].map(ml=>(
                    <button key={ml} onClick={()=>addWater(ml)} style={{background:"var(--btn-teal)",border:"1px solid var(--btn-teal-border)",color:darkMode?"#3ab88a":"#1a8a6a",borderRadius:4,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>{ml}ml</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input type="number" value={waterInput} onChange={e=>setWaterInput(e.target.value)}
                    placeholder="outro valor em ml" style={{...inp,flex:1,marginTop:0,padding:"6px 10px",fontSize:12}}/>
                  <button onClick={()=>addWater()} style={{background:"var(--btn-teal)",border:"1px solid var(--btn-teal-border)",color:darkMode?"#3ab88a":"#1a8a6a",borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>+</button>
                </div>
                {waterIntake.length>0&&(
                  <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                    {waterIntake.map(e=>(
                      <div key={e.id} style={{background:"var(--btn-teal)",border:"1px solid var(--btn-teal-border)",borderRadius:4,padding:"3px 8px",fontSize:10,color:darkMode?"#3ab88a":"#1a8a6a",display:"flex",gap:5,alignItems:"center"}}>
                        <span>{e.ml}ml {e.time}</span>
                        <button onClick={()=>removeWater(e.id)} style={{background:"none",border:"none",color:"#3a6a6a",cursor:"pointer",fontSize:12,padding:0}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Supplements log */}
            {suppLog.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",borderBottom:"1px solid var(--border3)",paddingBottom:5,marginBottom:7}}>
                  <span style={{fontSize:11,letterSpacing:2,color:"var(--muted2)",textTransform:"uppercase"}}>💊 Suplementos</span>
                </div>
                {suppLog.map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #181818"}}>
                    <div>
                      <span style={{fontSize:14,color:"var(--text2)"}}>{e.name}</span>
                      <span style={{fontSize:11,color:"var(--dim)",marginLeft:8}}>{e.dose}{e.unit}</span>
                      <span style={{fontSize:10,color:"var(--faint)",marginLeft:8}}>{e.time}</span>
                    </div>
                    <button onClick={()=>removeSuppLog(e.id)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:16}}>×</button>
                  </div>
                ))}
              </div>
            )}

            {MEALS.map(meal=>{
              const entries=activeLog[meal]||[];
              if(!entries.length) return null;
              const mp=entries.reduce((s,e)=>s+(e.protein??0),0);
              const mk=entries.reduce((s,e)=>s+(e.kcal??0),0);
              return (
                <div key={meal} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",borderBottom:"1px solid var(--border3)",paddingBottom:5,marginBottom:7}}>
                    <span style={{fontSize:11,letterSpacing:2,color:"var(--muted2)",textTransform:"uppercase"}}>{meal}</span>
                    <span style={{fontSize:11,color:"var(--dim)"}}>{Math.round(mp)}g · {Math.round(mk)} kcal</span>
                  </div>
                  {entries.map(e=>(
                    <div key={e.id}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #181818"}}>
                        <div style={{flex:1}}>
                          {editEntryId===e.id?(
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              <input type="number" value={editEntryQty} onChange={ev=>setEditEntryQty(ev.target.value)}
                                style={{...inp,width:80,marginTop:0,padding:"4px 8px",fontSize:13}} autoFocus/>
                              <span style={{fontSize:11,color:"var(--muted)"}}>{e.unit}</span>
                              <button onClick={()=>saveEntryEdit(meal)} style={{background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>✓</button>
                              <button onClick={()=>setEditEntryId(null)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13}}>✕</button>
                            </div>
                          ):(
                            <span>
                              <span style={{fontSize:14,color:"var(--text2)"}}>{e.name}</span>
                              <span style={{fontSize:11,color:"var(--dim)",marginLeft:8}}>{e.qty}{e.unit}</span>
                            </span>
                          )}
                        </div>
                        {editEntryId!==e.id&&(
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:12,color:"#c8a96e"}}>{Math.round(e.protein??0)}g</span>
                            <span style={{fontSize:12,color:"#8ec8c8"}}>{Math.round(e.kcal??0)}kcal</span>
                            <button onClick={()=>setDetailFood(detailFood===e.id?null:e.id)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:13}}>···</button>
                            <button onClick={()=>startEditEntry(e)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14}}>✏</button>
                            <button onClick={()=>removeEntry(meal,e.id)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:16}}>×</button>
                          </div>
                        )}
                      </div>
                      {detailFood===e.id&&(
                        <div style={{background:"var(--row)",borderRadius:4,padding:"8px 12px",marginBottom:3,display:"flex",flexWrap:"wrap",gap:"5px 16px"}}>
                          {[{l:"Carbs",v:e.carbs,u:"g",c:"#a96ec8"},{l:"Açúcares",v:e.sugars,u:"g",c:"#a96ec8"},{l:"Gordura",v:e.fat,u:"g",c:"#c86e8e"},{l:"Sat.",v:e.satfat,u:"g",c:"#c86e8e"},{l:"Fibra",v:e.fiber,u:"g",c:"#6ec8a9"},{l:"Sal",v:e.salt,u:"g",c:"#888"},{l:"B12",v:e.b12,u:"µg",c:"#c8c8a9"},{l:"Niacina",v:e.niacin,u:"mg",c:"#c8c8a9"},{l:"Fósforo",v:e.phosphorus,u:"mg",c:"#c8c8a9"},{l:"Cálcio",v:e.calcium,u:"mg",c:"#c8c8a9"},{l:"Ferro",v:e.iron,u:"mg",c:"#c8c8a9"},{l:"Potássio",v:e.potassium,u:"mg",c:"#c8c8a9"},{l:"Magnésio",v:e.magnesium,u:"mg",c:"#c8c8a9"},{l:"Zinco",v:e.zinc,u:"mg",c:"#c8c8a9"},{l:"Vit C",v:e.vitc,u:"mg",c:"#c8c8a9"},{l:"Vit D",v:e.vitd,u:"µg",c:"#c8c8a9"}].filter(x=>x.v!=null&&x.v!==0).map(x=>(
                            <div key={x.l} style={{fontSize:11}}><span style={{color:"var(--muted)"}}>{x.l} </span><span style={{color:x.c}}>{x.v%1===0?x.v:x.v.toFixed(2)}{x.u}</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            {allEntries.length===0&&isToday&&<div style={{textAlign:"center",color:"var(--faint)",fontSize:13,marginTop:30,fontStyle:"italic"}}>Nenhum alimento registado hoje.</div>}

            {/* Notes */}
            <div style={{marginTop:20}}>
              <label style={lbl}>Notas do dia</label>
              <textarea value={isToday?todayNote:historyNote}
                onChange={e=>isToday?setTodayNote(e.target.value):setHistoryNote(e.target.value)}
                placeholder="Observações, contexto do dia, como te sentiste..."
                style={{...inp,height:72,resize:"vertical",marginTop:4}}/>
            </div>

            {/* Quick supplement log */}
            {suppPantry.length>0&&isToday&&(
              <div style={{marginTop:12}}>
                <button onClick={()=>setShowSuppAdd(s=>!s)} style={{...btn,background:"var(--btn-info)",border:"1px solid var(--border-info)",color:"var(--btn-info-text)",fontSize:10,letterSpacing:2,marginTop:0}}>
                  💊 Registar suplemento
                </button>
                {showSuppAdd&&(
                  <div style={{marginTop:8,display:"flex",gap:6}}>
                    <select value={suppAddId} onChange={e=>setSuppAddId(e.target.value)} style={{...inp,flex:2,marginTop:0,padding:"8px 10px"}}>
                      <option value="">— seleciona —</option>
                      {suppPantry.map(s=><option key={s.id} value={s.id}>{s.name} ({s.dose}{s.unit})</option>)}
                    </select>
                    <input type="number" value={suppAddDose} onChange={e=>setSuppAddDose(e.target.value)}
                      placeholder="dose" style={{...inp,flex:1,marginTop:0,padding:"8px 10px"}}/>
                    <button onClick={logSupp} style={{background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",borderRadius:6,padding:"0 12px",fontSize:11,cursor:"pointer"}}>✓</button>
                  </div>
                )}
              </div>
            )}
            <div style={{marginTop:14}}>
              <button onClick={()=>generateFeedback("day")} disabled={feedbackLoading&&feedbackPeriod==="day"} style={{
                width:"100%",background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:(feedbackLoading&&feedbackPeriod==="day")?"#555":"#c8a0e8",
                padding:"10px",borderRadius:6,fontSize:11,letterSpacing:1.5,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"
              }}>
                {feedbackLoading&&feedbackPeriod==="day"?"⟳ A analisar...":"✦ Analisar alimentação do dia"}
              </button>
            </div>

            {feedbackText&&feedbackPeriod==="day"&&(
              <div style={{marginTop:12,background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:8,padding:"14px"}}>
                <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Feedback — {viewDate}</div>
                <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{feedbackText}</div>
                {feedbackSaved?(
                  <div style={{marginTop:10,fontSize:11,color:"#3a6a3a",textAlign:"center",padding:"8px",background:"var(--btn-ok)",borderRadius:6,border:"1px solid var(--btn-ok-border)"}}>
                    ✓ Já guardado nas notas
                  </div>
                ):(
                  <button onClick={saveFeedbackAsNote} style={{...btn,marginTop:12,background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:"#7e9ec8",fontSize:10,letterSpacing:2}}>
                    💾 Guardar nas notas
                  </button>
                )}
              </div>
            )}

            {/* Backup Completo - no Diário */}
            <div style={{marginTop:24,borderTop:"1px solid var(--border3)",paddingTop:14}}>
              <div style={{fontSize:10,letterSpacing:2,color:"var(--dim)",textTransform:"uppercase",marginBottom:10}}>Backup / Restaurar dados</div>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:10}}>Exporta ou importa TODOS os dados: dispensa, registos diários, peso, água, suplementos.</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <button onClick={exportFullBackup} disabled={backupLoading} style={{flex:1,background:"#1a2a1a",border:"1px solid #3a5a3a",color:"#7ec87e",borderRadius:6,padding:"10px",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer"}}>
                  {backupLoading?"⟳ A exportar...":"↓ Exportar backup"}
                </button>
                <label style={{flex:1,background:"#1a1a2a",border:"1px solid #3a3a5a",color:"#8e8ec8",borderRadius:6,padding:"10px",fontSize:11,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ↑ Importar backup
                  <input type="file" accept=".json" onChange={importFullBackup} style={{display:"none"}}/>
                </label>
              </div>
              {backupJson&&(
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"10px"}}>
                  <div style={{fontSize:10,color:"var(--muted)",marginBottom:6}}>Copia este JSON e guarda como <code>backup.json</code>:</div>
                  <textarea readOnly value={backupJson} style={{width:"100%",height:120,fontFamily:"monospace",fontSize:10,background:"#0a0a0a",border:"1px solid var(--border2)",color:"var(--muted2)",borderRadius:4,padding:8,boxSizing:"border-box",resize:"vertical",marginBottom:6}}/>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{
                      navigator.clipboard.writeText(backupJson)
                        .then(()=>notify("JSON copiado!"))
                        .catch(()=>notify("Seleciona o texto acima e copia manualmente."));
                    }} style={{flex:1,background:"#1a2a2a",border:"1px solid #3a5a5a",color:"#7ec8c8",borderRadius:6,padding:"8px",fontSize:11,cursor:"pointer",letterSpacing:1,textTransform:"uppercase"}}>
                      Copiar
                    </button>
                    <button onClick={()=>setBackupJson(null)} style={{background:"none",border:"1px solid var(--border3)",color:"var(--muted)",borderRadius:6,padding:"8px 12px",fontSize:11,cursor:"pointer"}}>
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── ADICIONAR ── */}
        {tab==="adicionar"&&(
          <div>
            {/* Templates */}
            {mealTemplates.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>Templates rápidos</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {mealTemplates.map(t=>(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:0,background:"var(--btn-info)",border:"1px solid var(--border-info)",borderRadius:20}}>
                      <button onClick={()=>loadTemplate(t)} style={{background:"none",border:"none",color:"#8ec8c8",padding:"5px 12px 5px 14px",fontSize:11,cursor:"pointer"}}>{t.name}</button>
                      <button onClick={()=>deleteTemplate(t.id)} style={{background:"none",border:"none",color:"var(--faint)",padding:"5px 10px 5px 0",fontSize:13,cursor:"pointer"}}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent meals to repeat */}
            <div style={{marginBottom:14}}>
              <button onClick={()=>setShowRecentMeals(s=>!s)} style={{
                width:"100%",background:"var(--btn-inactive)",border:"1px solid var(--btn-inactive-border)",color:"var(--muted)",
                padding:"8px 12px",borderRadius:6,fontSize:11,letterSpacing:1.5,
                textTransform:"uppercase",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between"
              }}>
                <span>↻ Repetir refeição recente</span><span>{showRecentMeals?"▲":"▼"}</span>
              </button>
              {showRecentMeals&&(
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 6px 6px",maxHeight:280,overflowY:"auto"}}>
                  {recentMeals.length===0?(
                    <div style={{padding:"12px",color:"var(--dim)",fontSize:12,fontStyle:"italic",textAlign:"center"}}>Sem refeições recentes.</div>
                  ):MEALS.map(meal=>{
                    const byMeal=recentMeals.filter(r=>r.meal===meal);
                    if(!byMeal.length) return null;
                    return (
                      <div key={meal}>
                        <div style={{padding:"6px 12px",fontSize:9,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",borderBottom:"1px solid var(--border3)",background:"var(--surface3)"}}>{meal}</div>
                        {byMeal.map((r,i)=>(
                          <div key={i} onClick={()=>loadRecentMealToStaged(r)} style={{
                            padding:"9px 12px",borderBottom:"1px solid var(--border3)",cursor:"pointer",
                            display:"flex",justifyContent:"space-between",alignItems:"center",
                          }}
                          onMouseEnter={e=>e.currentTarget.style.background="var(--btn-inactive)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div>
                              <div style={{fontSize:12,color:"var(--text3)"}}>{r.date===TODAY?"Hoje":r.date}</div>
                              <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{r.entries.length} item{r.entries.length!==1?"s":""}: {r.entries.map(e=>e.name).join(", ").slice(0,50)}{r.entries.map(e=>e.name).join(", ").length>50?"...":""}</div>
                            </div>
                            <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                              <div style={{fontSize:12,color:"#c8a96e"}}>{r.protein}g</div>
                              <div style={{fontSize:11,color:"#8ec8c8"}}>{r.kcal} kcal</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mode toggle */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["single","Um por um"],["batch","Montar refeição"],["describe","Descrever prato"]].map(([m,l])=>{
                const active = m==="describe" ? describeMode : !describeMode&&(m==="batch"?batchMode:!batchMode);
                return <button key={m} onClick={()=>{
                  if(m==="describe"){setDescribeMode(true);}
                  else{setDescribeMode(false);setBatchMode(m==="batch");}
                }} style={{flex:1,padding:"7px 0",background:active?"var(--btn-ok)":"var(--btn-inactive)",border:"1px solid "+(active?"var(--btn-ok-border)":"var(--btn-inactive-border)"),color:active?"var(--btn-ok-text)":"var(--muted)",borderRadius:6,fontSize:10,cursor:"pointer",letterSpacing:0.5}}>{l}</button>;
              })}
            </div>

            {/* Describe mode */}
            {describeMode&&(
              <div>
                <div style={{marginBottom:8}}>
                  <label style={lbl}>Refeição</label>
                  <select value={describeMeal} onChange={e=>setDescribeMeal(e.target.value)} style={inp}>
                    {MEALS.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={lbl}>Descreve o prato</label>
                  <textarea value={mealDescription} onChange={e=>setMealDescription(e.target.value)}
                    placeholder={"Ex: Frango grelhado com arroz branco e feijão, porção normal de refeitório. Tinha salada de alface com tomate e um fio de azeite. Sobremesa: uma laranja."}
                    style={{...inp,height:100,resize:"vertical",marginTop:4,fontSize:13}}/>
                  <div style={{fontSize:10,color:"var(--dim)",marginTop:4}}>
                    Descreve o que comeste e, se souberes, as quantidades aproximadas. Caso contrário, indica apenas o contexto (refeitório, restaurante, caseiro, etc.).
                  </div>
                </div>
                <button onClick={estimateMealDescription} disabled={describeLoading} style={{
                  ...btn, background:"var(--btn-info)", border:"1px solid var(--btn-info-border)", color:describeLoading?"var(--muted)":"var(--btn-info-text)"
                }}>
                  {describeLoading?"⟳ A estimar...":"✦ Estimar valores nutricionais"}
                </button>

                {describeResult&&(
                  <div style={{marginTop:14,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                      <span style={{fontSize:13,color:"var(--text3)"}}>{describeResult.name}</span>
                      <span style={{fontSize:10,color:describeResult.confidence==="alta"?"#6ec8a9":describeResult.confidence==="media"?"#c8a96e":"#c86e8e",letterSpacing:1}}>
                        confiança {describeResult.confidence}
                      </span>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px 20px",marginBottom:10}}>
                      {[
                        {l:"Proteína",v:describeResult.protein,u:"g",c:"#c8a96e"},
                        {l:"Calorias",v:describeResult.kcal,u:"kcal",c:"#8ec8c8"},
                        {l:"Carbs",v:describeResult.carbs,u:"g",c:"#a96ec8"},
                        {l:"Gordura",v:describeResult.fat,u:"g",c:"#c86e8e"},
                        {l:"Fibra",v:describeResult.fiber,u:"g",c:"#6ec8a9"},
                        {l:"Sal",v:describeResult.salt,u:"g",c:"#888"},
                      ].filter(x=>x.v!=null).map(x=>(
                        <div key={x.l} style={{fontSize:12}}>
                          <span style={{color:"var(--muted)"}}>{x.l} </span>
                          <span style={{color:x.c,fontWeight:"bold"}}>{x.v}{x.u}</span>
                        </div>
                      ))}
                    </div>
                    {describeResult.note&&(
                      <div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic",marginBottom:10,padding:"6px 10px",background:"var(--input)",borderRadius:4}}>
                        {describeResult.note}
                      </div>
                    )}
                    <button onClick={addDescribedToLog} style={btn}>
                      + Adicionar ao diário ({describeMeal})
                    </button>
                  </div>
                )}
              </div>
            )}

            {!describeMode&&(<div>
            <div style={{marginBottom:8}}>
              <label style={lbl}>Refeição</label>
              <select value={batchMode?staged.meal:addEntry.meal}
                onChange={e=>batchMode?setStaged(s=>({...s,meal:e.target.value})):setAddEntry(a=>({...a,meal:e.target.value}))} style={inp}>
                {MEALS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{marginBottom:8}}>
              <label style={lbl}>Alimento</label>
              <input value={addEntry.foodSearch||""} onChange={e=>setAddEntry(a=>({...a,foodSearch:e.target.value,foodId:""}))}
                placeholder="🔍 Pesquisar alimento..." style={inp}/>
              {addEntry.foodSearch&&(()=>{
                const results=sortedAllPantry.filter(f=>f.name.toLowerCase().includes(addEntry.foodSearch.toLowerCase()));
                if(!results.length) return <div style={{fontSize:12,color:"var(--dim)",padding:"8px 12px",background:"var(--input)",borderRadius:"0 0 6px 6px",marginTop:-3}}>Nenhum resultado.</div>;
                return (
                  <div style={{background:"var(--input)",border:"1px solid var(--border2)",borderTop:"none",borderRadius:"0 0 6px 6px",marginTop:-3,maxHeight:200,overflowY:"auto"}}>
                    {results.map(f=>(
                      <div key={f.id} onClick={()=>setAddEntry(a=>({...a,foodId:f.id,foodSearch:f.name}))}
                        style={{padding:"9px 12px",cursor:"pointer",borderBottom:"1px solid var(--border3)",fontSize:13,
                          color:addEntry.foodId===f.id?"#c8a96e":"#d5cfc8",
                          background:addEntry.foodId===f.id?"#1e2a1e":"transparent"}}>
                        {f.name}
                        <span style={{fontSize:10,color:"var(--muted)",marginLeft:8}}>{f.protein100}{f.unit==="un"?"g/un":"g"} prot · {f.kcal100}{f.unit==="un"?"kcal/un":"kcal"}/100{f.unit==="un"?"un":f.unit}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {!addEntry.foodSearch&&(
                <select value={addEntry.foodId} onChange={e=>setAddEntry(a=>({...a,foodId:e.target.value}))} style={{...inp,marginTop:4}}>
                  <option value="">— ou seleciona da lista —</option>
                  {sortedAllPantry.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
            </div>
            {selectedFood&&(
              <div style={{marginBottom:8}}>
                <label style={lbl}>Quantidade em {selectedFood.unit}</label>
                <input type="number" value={addEntry.qty} onChange={e=>setAddEntry(a=>({...a,qty:e.target.value}))}
                  placeholder={`ex: 250 ${selectedFood.unit}`} style={inp}/>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                  {quickQtys(selectedFood.unit).map(q=>(
                    <button key={q} onClick={()=>setAddEntry(a=>({...a,qty:String(q)}))} style={{
                      background:addEntry.qty===String(q)?"var(--btn-ok)":"var(--btn-inactive)",
                      border:`1px solid ${addEntry.qty===String(q)?"#3a6a3a":"#252525"}`,
                      color:addEntry.qty===String(q)?"#7ec87e":"#555",
                      borderRadius:4,padding:"3px 10px",fontSize:11,cursor:"pointer"
                    }}>{q}{selectedFood.unit}</button>
                  ))}
                </div>
              </div>
            )}
            {selectedFood&&addEntry.qty&&(()=>{
              const q=parseFloat(addEntry.qty);if(isNaN(q)) return null;
              const preview=ALL_FIELDS.filter(f=>selectedFood[f.key]!=null).map(f=>({label:f.label,val:(selectedFood[f.key]*q)/divisor(selectedFood.unit),unit:f.unit,color:f.color||"#888"}));
              return <div style={{background:"var(--input)",borderRadius:6,padding:"9px 12px",marginBottom:10,display:"flex",flexWrap:"wrap",gap:"5px 16px"}}>
                {preview.map(x=><div key={x.label} style={{fontSize:12}}><span style={{color:"var(--muted)"}}>{x.label} </span><span style={{color:x.color}}>{x.val%1===0?Math.round(x.val):x.val.toFixed(1)}{x.unit}</span></div>)}
              </div>;
            })()}
            {!batchMode?(
              <button onClick={addToLog} style={btn}>Registar no diário</button>
            ):(
              <button onClick={addToStaged} style={{...btn,background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:"var(--btn-info-text)"}}>+ Adicionar à refeição</button>
            )}

            {batchMode&&(
              <div style={{marginTop:14}}>
                {staged.items.length===0?(
                  <div style={{color:"var(--faint)",fontSize:12,fontStyle:"italic",textAlign:"center",marginTop:8}}>Seleciona alimentos e vai adicionando.</div>
                ):(
                  <>
                    <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>Na refeição — {staged.meal}</div>
                    {staged.items.map((item,idx)=>(
                      <div key={item.id} style={{padding:"6px 0",borderBottom:"1px solid var(--border3)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:13,color:"var(--text2)",flex:1}}>{item.name}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            {editStagedIdx===idx?(
                              <>
                                <input type="number" value={editStagedQty} onChange={e=>setEditStagedQty(e.target.value)}
                                  style={{...inp,width:70,marginTop:0,padding:"3px 8px",fontSize:12}} autoFocus/>
                                <span style={{fontSize:11,color:"var(--muted)"}}>{item.unit}</span>
                                <button onClick={saveEditStaged} style={{background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",borderRadius:4,padding:"2px 7px",fontSize:11,cursor:"pointer"}}>✓</button>
                                <button onClick={()=>setEditStagedIdx(null)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13}}>✕</button>
                              </>
                            ):(
                              <>
                                <span onClick={()=>{setEditStagedIdx(idx);setEditStagedQty(String(item.qty));}}
                                  style={{fontSize:11,color:"var(--muted)",cursor:"pointer",borderBottom:"1px dashed #333"}}>{item.qty}{item.unit}</span>
                                <span style={{fontSize:11,color:"#c8a96e"}}>{Math.round(item.protein??0)}g</span>
                                <span style={{fontSize:11,color:"#8ec8c8"}}>{Math.round(item.kcal??0)}kcal</span>
                                <button onClick={()=>removeFromStaged(idx)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:16}}>×</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:16,padding:"7px 0",borderTop:"1px solid var(--border2)",fontSize:12}}>
                      <span style={{color:"var(--muted)"}}>Total:</span>
                      <span style={{color:"#c8a96e"}}>{Math.round(stagedTot.protein)}g prot</span>
                      <span style={{color:"#8ec8c8"}}>{Math.round(stagedTot.kcal)} kcal</span>
                      {stagedTot.carbs>0&&<span style={{color:"#a96ec8"}}>{Math.round(stagedTot.carbs)}g carbs</span>}
                    </div>
                    <button onClick={commitStaged} style={{...btn,marginTop:8}}>✓ Registar refeição ({staged.items.length} item{staged.items.length!==1?"s":""})</button>

                    {/* Save as template */}
                    <div style={{display:"flex",gap:6,marginTop:8}}>
                      <input value={templateName} onChange={e=>setTemplateName(e.target.value)}
                        placeholder="Nome do template..." style={{...inp,flex:1,marginTop:0,padding:"8px 10px",fontSize:12}}/>
                      <button onClick={saveTemplate} style={{background:"var(--btn-info)",border:"1px solid var(--border-info)",color:"#8ec8c8",borderRadius:6,padding:"0 12px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>Guardar template</button>
                    </div>
                  </>
                )}
              </div>
            )}
            {pantry.length===0&&<div style={{marginTop:16,color:"var(--faint)",fontSize:12,textAlign:"center",fontStyle:"italic"}}>A despensa está vazia.</div>}
            </div>)}

            <div style={{marginTop:28,borderTop:"1px solid var(--border3)",paddingTop:14}}>
              <div style={{fontSize:10,letterSpacing:2,color:"var(--dim)",textTransform:"uppercase",marginBottom:10}}>Exportar / Importar</div>
              <div style={{background:"var(--surface)",border:"1px solid #2a3a2a",borderRadius:6,padding:"10px 12px",marginBottom:10}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:"#7ec87e",textTransform:"uppercase",marginBottom:6}}>Backup Completo</div>
                <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Exporta todos os dados para migrar para o site do GitHub.</div>
                <button onClick={exportFullBackup} disabled={backupLoading} style={{...sBtn("var(--btn-ok)","var(--btn-ok-border)","#7ec87e"),marginBottom:0}}>
                  {backupLoading?"A exportar...":"↓ Gerar Backup Completo"}
                </button>
                {backupJson&&(
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>Copia este JSON:</div>
                    <textarea readOnly value={backupJson} style={{...inp,height:100,fontSize:10,fontFamily:"monospace",resize:"vertical",marginTop:0,color:"var(--muted2)"}}/>
                    <button onClick={()=>{
                      navigator.clipboard.writeText(backupJson)
                        .then(()=>notify("JSON copiado!"))
                        .catch(()=>notify("Seleciona o texto e copia manualmente."));
                    }} style={{...sBtn("var(--btn-teal)","var(--btn-teal-border)","#7ec8c8"),marginTop:4,width:"100%"}}>
                      Copiar JSON
                    </button>
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                <button onClick={()=>setShowExportPanel(showExportPanel==="day"?null:"day")} style={sBtn("var(--btn-ok)","var(--btn-ok-border)","#7ec87e")}>↓ Exportar dia</button>
                <button onClick={()=>setShowExportPanel(showExportPanel==="week"?null:"week")} style={sBtn("var(--btn-info)","var(--btn-info-border)","#7e7ec8")}>↓ Exportar semana</button>
                <label style={sBtnLbl("var(--btn-teal)","var(--btn-teal-border)","var(--btn-teal-text)")}>↑ Importar refeições<input type="file" accept=".json" onChange={importMeals} style={{display:"none"}}/></label>
                <label style={sBtnLbl("var(--btn-warn)","var(--btn-warn-border)","#c87e7e")}>↑ Importar dia<input type="file" accept=".json" onChange={importDayLog} style={{display:"none"}}/></label>
              </div>
              {showExportPanel&&(
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"12px",marginBottom:8}}>
                  <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
                    Formato — {showExportPanel==="day"?"dia "+viewDate:"últimos 7 dias"}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[["json","JSON","dados completos"],["csv","CSV","para Excel"],["html","HTML","relatório web"],["txt","TXT","texto simples"]].map(([fmt,label,desc])=>(
                      <button key={fmt} onClick={()=>runExport(showExportPanel,fmt)} style={{background:"var(--input)",border:"1px solid var(--border2)",borderRadius:6,padding:"8px 10px",cursor:"pointer",textAlign:"left"}}>
                        <div style={{fontSize:12,color:"var(--text3)",fontWeight:"bold"}}>{label}</div>
                        <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {exportResult&&(
                <div style={{background:"var(--surface)",border:"1px solid #2a3a2a",borderRadius:6,padding:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:11,color:"var(--btn-ok-text)"}}>✓ {exportResult.filename}</span>
                    <button onClick={()=>setExportResult(null)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14}}>×</button>
                  </div>
                  <textarea readOnly value={exportResult.content}
                    style={{...inp,height:120,fontSize:11,fontFamily:"monospace",resize:"vertical",marginTop:0,color:"var(--muted2)"}}/>
                  <button onClick={()=>{
                    navigator.clipboard.writeText(exportResult.content).then(()=>{
                      setExportResult(r=>({...r,copied:true}));
                      setTimeout(()=>setExportResult(r=>r?({...r,copied:false}):r),3000);
                    }).catch(()=>notify("Seleciona o texto e copia manualmente."));
                  }} style={{...btn,marginTop:8,background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",fontSize:10,letterSpacing:2}}>
                    {exportResult.copied?"✓ Copiado!":"📋 Copiar para área de transferência"}
                  </button>
                  <div style={{fontSize:10,color:"var(--dim)",marginTop:6,textAlign:"center"}}>
                    Cola num editor de texto e guarda como <b style={{color:"var(--muted)"}}>{exportResult.filename}</b>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DESPENSA ── */}
        {tab==="despensa"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={{flex:1}}><label style={lbl}>Nome do alimento</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="ex: Banana, Frango grelhado..." style={inp}/></div>
              <div style={{width:90}}><label style={lbl}>Unidade</label><select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} style={inp}><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select></div>
            </div>
            <button onClick={autoFillNutrition} disabled={autoFillLoading} style={{
              width:"100%",background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",
              color:autoFillLoading?"var(--muted)":"var(--btn-info-text)",padding:"9px",borderRadius:6,
              fontSize:11,letterSpacing:1.5,textTransform:"uppercase",cursor:autoFillLoading?"default":"pointer",
              fontFamily:"inherit",marginBottom:10
            }}>
              {autoFillLoading?"⟳ A pesquisar...":"✦ Preencher automaticamente"}
            </button>
            <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8,marginTop:12}}>Macronutrientes ({portionLabel(form.unit)})</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
              {MACRO_FIELDS.filter(f=>!f.sub).map(f=>(
                <div key={f.key} style={{flex:"1 1 calc(50% - 4px)",minWidth:120}}>
                  <label style={{...lbl,color:f.required?"#888":"#555"}}>{f.label}{f.required?" *":""}</label>
                  <input type="number" value={form[f.key]} onChange={e=>setForm(ff=>({...ff,[f.key]:e.target.value}))} placeholder={f.unit} style={inp}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
              {MACRO_FIELDS.filter(f=>f.sub).map(f=>(
                <div key={f.key} style={{flex:"1 1 calc(50% - 4px)",minWidth:120}}>
                  <label style={{...lbl,color:"var(--dim)"}}>{f.label}</label>
                  <input type="number" value={form[f.key]} onChange={e=>setForm(ff=>({...ff,[f.key]:e.target.value}))} placeholder={f.unit} style={inp}/>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowMicroForm(m=>!m)} style={{background:"none",border:"1px solid var(--border2)",color:"var(--muted)",width:"100%",padding:"7px",borderRadius:6,fontSize:10,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",marginBottom:8}}>
              {showMicroForm?"▲ Ocultar micronutrientes":"▼ Micronutrientes (opcional)"}
            </button>
            {showMicroForm&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {MICRO_FIELDS.map(f=>(
                  <div key={f.key} style={{flex:"1 1 calc(50% - 4px)",minWidth:120}}>
                    <label style={{...lbl,color:"var(--dim)"}}>{f.label} ({f.unit})</label>
                    <input type="number" value={form[f.key]} onChange={e=>setForm(ff=>({...ff,[f.key]:e.target.value}))} placeholder={f.unit} style={inp}/>
                  </div>
                ))}
              </div>
            )}
            <button onClick={addFood} style={btn}>Guardar na despensa</button>

            <div style={{marginTop:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,letterSpacing:3,color:"var(--dim)",textTransform:"uppercase"}}>Guardados ({pantry.length})</div>
                <div style={{display:"flex",gap:6}}>
                  <label style={sBtnLbl("var(--btn-info)","var(--btn-info-border)","#7e7ec8")}>↑ Importar<input type="file" accept=".csv" onChange={importCSV} style={{display:"none"}}/></label>
                  {pantry.length>0&&<button onClick={exportCSV} style={sBtn("var(--btn-teal)","var(--btn-teal-border)","#7ec8c8")}>↓ Exportar</button>}
                </div>
              </div>
              {/* Search */}
              <input value={pantrySearch} onChange={e=>setPantrySearch(e.target.value)}
                placeholder="🔍 Pesquisar na despensa..." style={{...inp,marginBottom:10}}/>
              {filteredPantry.length===0&&<div style={{color:"var(--faint)",fontSize:12,fontStyle:"italic",textAlign:"center",marginTop:12}}>{pantrySearch?"Nenhum resultado.":"Despensa vazia."}</div>}
              {sortedPantry.map(f=>(
                <div key={f.id} style={{borderBottom:"1px solid var(--border3)"}}>
                  {editingId===f.id?(
                    <div style={{padding:"12px 0"}}>
                      <div style={{display:"flex",gap:8,marginBottom:6}}>
                        <div style={{flex:1}}><label style={lbl}>Nome</label><input value={editForm.name} onChange={e=>setEditForm(ef=>({...ef,name:e.target.value}))} style={inp}/></div>
                        <div style={{width:90}}><label style={lbl}>Unidade</label><select value={editForm.unit} onChange={e=>setEditForm(ef=>({...ef,unit:e.target.value}))} style={inp}><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select></div>
                      </div>
                      <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:6}}>Macronutrientes ({portionLabel(editForm.unit)})</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
                        {MACRO_FIELDS.filter(ff=>!ff.sub).map(ff=>(
                          <div key={ff.key} style={{flex:"1 1 calc(50% - 4px)",minWidth:110}}><label style={{...lbl,color:ff.required?"#888":"#555"}}>{ff.label}</label><input type="number" value={editForm[ff.key]} onChange={e=>setEditForm(ef=>({...ef,[ff.key]:e.target.value}))} style={inp}/></div>
                        ))}
                        {MACRO_FIELDS.filter(ff=>ff.sub).map(ff=>(
                          <div key={ff.key} style={{flex:"1 1 calc(50% - 4px)",minWidth:110}}><label style={{...lbl,color:"var(--dim)"}}>{ff.label}</label><input type="number" value={editForm[ff.key]} onChange={e=>setEditForm(ef=>({...ef,[ff.key]:e.target.value}))} style={inp}/></div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveEdit} style={{...btn,flex:1,marginTop:0}}>Guardar</button>
                        <button onClick={()=>{setEditingId(null);setEditForm(null);}} style={{flex:1,background:"none",border:"1px solid var(--border2)",color:"var(--muted)",padding:"10px",borderRadius:6,fontSize:11,textTransform:"uppercase",cursor:"pointer"}}>Cancelar</button>
                      </div>
                    </div>
                  ):(
                    <div style={{padding:"9px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,color:"var(--text2)",marginBottom:2}}>{f.name}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {ALL_FIELDS.filter(ff=>f[ff.key]!=null).map(ff=>(
                            <span key={ff.key} style={{fontSize:10,color:"var(--muted)"}}>{ff.label.replace("dos quais ","").replace("das quais ","")} {f[ff.key]}{ff.unit}</span>
                          ))}
                          <span style={{fontSize:10,color:"var(--dim)"}}>por 100{f.unit}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0,marginLeft:8}}>
                        <button onClick={()=>startEdit(f)} style={{background:"none",border:"1px solid var(--border2)",color:"var(--muted)",borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>editar</button>
                        <button onClick={()=>removeFood(f.id)} style={{background:"none",border:"1px solid var(--border3)",color:"var(--dim)",borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Supplement pantry section */}
            <div style={{marginTop:28,borderTop:"1px solid var(--border3)",paddingTop:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,letterSpacing:3,color:"var(--muted)",textTransform:"uppercase"}}>💊 Suplementos ({suppPantry.length})</div>
                <button onClick={()=>setShowSuppForm(s=>!s)} style={sBtn("var(--btn-info)","var(--btn-info-border)","#9090c8")}>{showSuppForm?"▲ fechar":"+ adicionar"}</button>
              </div>
              {showSuppForm&&(
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"12px",marginBottom:10}}>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    <div style={{flex:2}}><label style={lbl}>Nome</label><input value={suppForm.name} onChange={e=>setSuppForm(f=>({...f,name:e.target.value}))} placeholder="ex: Creatina" style={inp}/></div>
                    <div style={{flex:1}}><label style={lbl}>Dose padrão</label><input type="number" value={suppForm.dose} onChange={e=>setSuppForm(f=>({...f,dose:e.target.value}))} placeholder="5" style={inp}/></div>
                    <div style={{width:80}}><label style={lbl}>Unidade</label>
                      <select value={suppForm.unit} onChange={e=>setSuppForm(f=>({...f,unit:e.target.value}))} style={inp}>
                        <option value="g">g</option><option value="mg">mg</option><option value="µg">µg</option><option value="ml">ml</option><option value="un">un</option><option value="cáps">cáps</option>
                      </select>
                    </div>
                  </div>
                  <div style={{marginBottom:6}}><label style={lbl}>Notas (opcional)</label><input value={suppForm.notes} onChange={e=>setSuppForm(f=>({...f,notes:e.target.value}))} placeholder="ex: tomar com água, em jejum..." style={inp}/></div>
                  <button onClick={addSuppToPantry} style={btn}>Guardar suplemento</button>
                </div>
              )}
              {suppPantry.length===0&&<div style={{color:"var(--faint)",fontSize:12,fontStyle:"italic",textAlign:"center",padding:"10px 0"}}>Nenhum suplemento adicionado.</div>}
              {suppPantry.map(s=>(
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border3)"}}>
                  <div>
                    <div style={{fontSize:13,color:"var(--text2)"}}>{s.name}</div>
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>dose padrão: {s.dose}{s.unit}{s.notes?" · "+s.notes:""}</div>
                  </div>
                  <button onClick={()=>removeSuppPantry(s.id)} style={{background:"none",border:"1px solid var(--border3)",color:"var(--dim)",borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="semana"&&(
          <div>
            {weekData.length===0?(
              <div style={{textAlign:"center",color:"var(--faint)",fontSize:13,marginTop:40,fontStyle:"italic"}}>A carregar...</div>
            ):(
              <>
                {/* Summary stats */}
                <div style={{display:"flex",gap:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,marginBottom:16,overflow:"hidden"}}>
                  {[
                    {l:"Média proteína",v:`${avgProtein}g`,c:"#c8a96e"},
                    {l:"Média calorias",v:String(avgKcal),c:"#8ec8c8"},
                    {l:"Dias meta prot.",v:`${daysMetProtein}/${daysWithData.length}`,c:"var(--btn-ok-text)"},
                  ].map((x,i)=>(
                    <div key={x.l} style={{flex:1,padding:"12px 8px",textAlign:"center",borderRight:i<2?"1px solid var(--border)":"none"}}>
                      <div style={{fontSize:18,color:x.c}}>{x.v}</div>
                      <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,marginTop:3,textTransform:"uppercase"}}>{x.l}</div>
                    </div>
                  ))}
                </div>

                {/* Day cards */}
                <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:16}}>
                  {weekData.map(d=>(
                    <div key={d.date} onClick={()=>{setTab("diario");changeViewDate(d.date);}} style={{
                      minWidth:68,background:d.isToday?"var(--btn-ok)":"var(--surface3)",
                      border:`1px solid ${d.isToday?"var(--btn-ok-border)":"var(--border)"}`,
                      borderRadius:8,padding:"10px 6px",textAlign:"center",cursor:"pointer",flexShrink:0
                    }}>
                      <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase"}}>{d.label}</div>
                      <div style={{fontSize:13,color:d.hasData?(d.metProtein?"var(--btn-ok-text)":"#c8a96e"):"var(--dim)",marginTop:6,fontWeight:"bold"}}>
                        {d.hasData?`${d.protein}g`:"—"}
                      </div>
                      <div style={{fontSize:11,color:d.hasData?"#8ec8c8":"var(--dim)",marginTop:2}}>{d.hasData?d.kcal:""}</div>
                      {d.hasData&&<div style={{width:6,height:6,borderRadius:"50%",background:d.metProtein?"var(--btn-ok-text)":"var(--muted)",margin:"6px auto 0"}}/>}
                    </div>
                  ))}
                </div>

                {/* Protein chart */}
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"14px",marginBottom:12}}>
                  <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Proteína (g) — 7 dias</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={weekData}>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:CT.tick}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:CT.tick}} axisLine={false} tickLine={false} domain={[0,"auto"]} width={30}/>
                      <Tooltip contentStyle={{background:CT.bg,border:"1px solid "+CT.border,borderRadius:4,fontSize:11,color:CT.label}} labelStyle={{color:CT.label}} itemStyle={{color:"#c8a96e"}} formatter={(v)=>[`${v}g`,"Proteína"]}/>
                      {weekData[0]&&<ReferenceLine y={weekData[0].proteinGoal} stroke="#c8a96e" strokeDasharray="3 3" strokeOpacity={0.3}/>}
                      <Line type="monotone" dataKey="protein" stroke="#c8a96e" strokeWidth={2} dot={{fill:"#c8a96e",r:3}} activeDot={{r:5}} connectNulls={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Kcal chart */}
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"14px"}}>
                  <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Calorias — 7 dias</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={weekData}>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:CT.tick}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:CT.tick}} axisLine={false} tickLine={false} domain={[0,"auto"]} width={35}/>
                      <Tooltip contentStyle={{background:CT.bg,border:"1px solid "+CT.border,borderRadius:4,fontSize:11,color:CT.label}} labelStyle={{color:CT.label}} itemStyle={{color:"#8ec8c8"}} formatter={(v)=>[`${v} kcal`,"Calorias"]}/>
                      {weekData[0]&&<ReferenceLine y={weekData[0].kcalGoal} stroke="#8ec8c8" strokeDasharray="3 3" strokeOpacity={0.3}/>}
                      <Line type="monotone" dataKey="kcal" stroke="#8ec8c8" strokeWidth={2} dot={{fill:"#8ec8c8",r:3}} activeDot={{r:5}} connectNulls={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{fontSize:10,color:"var(--faint)",textAlign:"center",marginTop:10,fontStyle:"italic"}}>
                  Clica num dia para ver o detalhe
                </div>

                {/* Meal averages */}
                {Object.keys(mealAverages).length>0&&(
                  <div style={{marginTop:20}}>
                    <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Médias por refeição (últimos 30 dias)</div>
                    {(() => {
                      const sorted = Object.entries(mealAverages).sort((a,b)=>b[1].avgProtein-a[1].avgProtein);
                      const maxProt = sorted[0]?.[1].avgProtein||1;
                      return sorted.map(([meal,d])=>(
                        <div key={meal} style={{marginBottom:12,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"10px 14px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                            <span style={{fontSize:12,color:"var(--text3)"}}>{meal}</span>
                            <span style={{fontSize:10,color:"var(--muted)"}}>{d.count} dia{d.count!==1?"s":""} registado{d.count!==1?"s":""}</span>
                          </div>
                          <div style={{display:"flex",gap:16,marginBottom:6,fontSize:11}}>
                            <span style={{color:"#c8a96e"}}>{d.avgProtein}g prot</span>
                            <span style={{color:"#8ec8c8"}}>{d.avgKcal} kcal</span>
                            {d.avgCarbs>0&&<span style={{color:"#a96ec8"}}>{d.avgCarbs}g carbs</span>}
                            <span style={{color:"var(--muted)",marginLeft:"auto"}}>{Math.round(d.avgProtein/goals.protein*100)}% meta prot</span>
                          </div>
                          <div style={{height:4,background:"var(--track)",borderRadius:4}}>
                            <div style={{height:"100%",width:Math.min(d.avgProtein/maxProt*100,100)+"%",borderRadius:4,background:"#c8a96e",transition:"width 0.4s ease"}}/>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </>
            )}

            {/* Week export */}
            {weekData.some(d=>d.hasData)&&(
              <div style={{marginTop:16,borderTop:"1px solid var(--border3)",paddingTop:14}}>
                <button onClick={()=>setShowExportPanel(showExportPanel==="week"?null:"week")} style={{...btn,background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:"var(--btn-info-text)",marginTop:0}}>
                  ↓ Exportar semana
                </button>
                {showExportPanel==="week"&&(
                  <div style={{marginTop:8,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"12px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Escolhe o formato</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {[["json","JSON","dados completos"],["csv","CSV","para Excel"],["html","HTML","relatório"],["txt","TXT","texto simples"]].map(([fmt,label,desc])=>(
                        <button key={fmt} onClick={()=>runExport("week",fmt)} style={{background:"var(--input)",border:"1px solid var(--border2)",borderRadius:6,padding:"8px 10px",cursor:"pointer",textAlign:"left"}}>
                          <div style={{fontSize:12,color:"var(--text3)",fontWeight:"bold"}}>{label}</div>
                          <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {exportResult&&(
                  <div style={{marginTop:8,background:"var(--surface)",border:"1px solid #2a3a2a",borderRadius:6,padding:"12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:11,color:"var(--btn-ok-text)"}}>✓ {exportResult.filename}</span>
                      <button onClick={()=>setExportResult(null)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14}}>×</button>
                    </div>
                    <textarea readOnly value={exportResult.content}
                      style={{...inp,height:100,fontSize:11,fontFamily:"monospace",resize:"vertical",marginTop:0,color:"var(--muted2)"}}/>
                    <button onClick={()=>{
                      navigator.clipboard.writeText(exportResult.content).then(()=>{
                        setExportResult(r=>({...r,copied:true}));
                        setTimeout(()=>setExportResult(r=>r?({...r,copied:false}):r),3000);
                      }).catch(()=>notify("Seleciona o texto e copia manualmente."));
                    }} style={{...btn,marginTop:8,background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",fontSize:10,letterSpacing:2}}>
                      {exportResult.copied?"✓ Copiado!":"📋 Copiar para área de transferência"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Food patterns analysis */}
            <div style={{marginTop:16,borderTop:"1px solid var(--border3)",paddingTop:14}}>
              <button onClick={generateFoodPatterns} disabled={patternsLoading} style={{
                width:"100%",background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:patternsLoading?"#555":"#c8a0e8",
                padding:"10px",borderRadius:6,fontSize:11,letterSpacing:1.5,textTransform:"uppercase",cursor:patternsLoading?"default":"pointer",fontFamily:"inherit"
              }}>
                {patternsLoading?"⟳ A analisar 30 dias...":"✦ Analisar padrões alimentares (30 dias)"}
              </button>
              {patternsText&&(
                <div style={{marginTop:12,background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:8,padding:"14px"}}>
                  <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Padrões — últimos 30 dias</div>
                  <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{patternsText}</div>
                  {patternsSaved?(
                    <div style={{marginTop:10,fontSize:11,color:"#3a6a3a",textAlign:"center",padding:"8px",background:"var(--btn-ok)",borderRadius:6,border:"1px solid var(--btn-ok-border)"}}>
                      ✓ Guardado nas notas
                    </div>
                  ):(
                    <button onClick={savePatterns} style={{...btn,marginTop:12,background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:"#7e9ec8",fontSize:10,letterSpacing:2}}>
                      💾 Guardar nas notas
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Week feedback */}
            {weekData.some(d=>d.hasData)&&(
              <div style={{marginTop:16}}>
                <button onClick={()=>generateFeedback("week")} disabled={feedbackLoading&&feedbackPeriod==="week"} style={{
                  width:"100%",background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:(feedbackLoading&&feedbackPeriod==="week")?"#555":"#c8a0e8",
                  padding:"10px",borderRadius:6,fontSize:11,letterSpacing:1.5,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit"
                }}>
                  {feedbackLoading&&feedbackPeriod==="week"?"⟳ A analisar...":"✦ Analisar alimentação da semana"}
                </button>
                {feedbackText&&feedbackPeriod==="week"&&(
                  <div style={{marginTop:12,background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:8,padding:"14px"}}>
                    <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Feedback semanal</div>
                    <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{feedbackText}</div>
                    {feedbackSaved?(
                      <div style={{marginTop:10,fontSize:11,color:"#3a6a3a",textAlign:"center",padding:"8px",background:"var(--btn-ok)",borderRadius:6,border:"1px solid var(--btn-ok-border)"}}>
                        ✓ Já guardado nas notas
                      </div>
                    ):(
                      <button onClick={saveFeedbackAsNote} style={{...btn,marginTop:12,background:"var(--btn-info)",border:"1px solid var(--btn-info-border)",color:"#7e9ec8",fontSize:10,letterSpacing:2}}>
                        💾 Guardar nas notas de hoje
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MÉTRICAS ── */}
        {tab==="metricas"&&(
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:10}}>Registar medidas de hoje</div>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{flex:1}}><label style={lbl}>Peso (kg)</label><input type="number" value={weightForm.weight} onChange={e=>setWeightForm(f=>({...f,weight:e.target.value}))} placeholder={currentWeight?String(currentWeight):"ex: 73.7"} style={inp}/></div>
                <div style={{flex:1}}><label style={lbl}>Altura (cm)</label><input type="number" value={weightForm.height} onChange={e=>setWeightForm(f=>({...f,height:e.target.value}))} placeholder={currentHeight?String(currentHeight):"ex: 175"} style={inp}/></div>
              </div>
              <button onClick={saveWeight} style={btn}>Registar hoje</button>
            </div>
            {currentWeight&&(
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"14px 16px",marginBottom:14}}>
                <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:12}}>Métricas actuais</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"12px 24px"}}>
                  {[
                    {l:"Peso",v:`${currentWeight} kg`,c:"#c8a96e"},{l:"Altura",v:currentHeight?`${currentHeight} cm`:"—",c:"#8ec8c8"},
                    {l:"IMC",v:bmi||"—",c:bmiNum<18.5?"#c86e8e":bmiNum<25?"#6ec8a9":bmiNum<30?"#c8a96e":"#c86e8e"},
                    {l:"Prot. treino",v:`${computeGoals(currentWeight,true).protein}g`,c:"#c8a96e"},
                    {l:"Prot. descanso",v:`${computeGoals(currentWeight,false).protein}g`,c:"#a9c8a9"},
                    {l:"Kcal treino",v:String(computeGoals(currentWeight,true).kcal),c:"#8ec8c8"},
                    {l:"Kcal descanso",v:String(computeGoals(currentWeight,false).kcal),c:"#8ec8a9"},
                  ].map(x=>(
                    <div key={x.l}><div style={{fontSize:10,color:"var(--muted)",letterSpacing:1}}>{x.l.toUpperCase()}</div><div style={{fontSize:16,color:x.c,marginTop:2}}>{x.v}</div></div>
                  ))}
                </div>
                {bmi&&<div style={{marginTop:10,fontSize:12,color:"var(--muted)"}}>IMC {bmi} — <span style={{color:bmiNum<18.5?"#c86e8e":bmiNum<25?"#6ec8a9":bmiNum<30?"#c8a96e":"#c86e8e"}}>{bmiNum<18.5?"Abaixo do peso":bmiNum<25?"Peso normal":bmiNum<30?"Sobrepeso":"Obesidade"}</span></div>}
              </div>
            )}
            {weightChartData.length>1&&(
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"14px",marginBottom:14}}>
                <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:12}}>Evolução do peso</div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={weightChartData}>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:CT.tick}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:CT.tick}} axisLine={false} tickLine={false} domain={["auto","auto"]} width={32}/>
                    <Tooltip contentStyle={{background:CT.bg,border:"1px solid "+CT.border,borderRadius:4,fontSize:11,color:CT.label}} labelStyle={{color:CT.label}} itemStyle={{color:"#c8a96e"}}/>
                    <Line type="monotone" dataKey="weight" stroke="#c8a96e" strokeWidth={2} dot={{fill:"#c8a96e",r:3}} activeDot={{r:5}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {weightHistory.length>0&&(
              <div>
                <div style={{fontSize:10,letterSpacing:2,color:"var(--dim)",textTransform:"uppercase",marginBottom:8}}>Histórico</div>
                {[...weightHistory].reverse().map(e=>{
                  const bE=e.height?(e.weight/((e.height/100)**2)).toFixed(1):null;
                  const isEd=editingWeightId===e.id;
                  return (
                    <div key={e.id} style={{borderBottom:"1px solid var(--border3)"}}>
                      {isEd?(
                        <div style={{padding:"10px 0"}}>
                          <div style={{display:"flex",gap:8,marginBottom:8}}>
                            <div style={{flex:1}}><label style={lbl}>Data</label><input type="date" value={editWeightForm.date} onChange={ev=>setEditWeightForm(f=>({...f,date:ev.target.value}))} style={{...inp,colorScheme:"dark"}}/></div>
                            <div style={{flex:1}}><label style={lbl}>Peso (kg)</label><input type="number" value={editWeightForm.weight} onChange={ev=>setEditWeightForm(f=>({...f,weight:ev.target.value}))} style={inp}/></div>
                            <div style={{flex:1}}><label style={lbl}>Altura (cm)</label><input type="number" value={editWeightForm.height} onChange={ev=>setEditWeightForm(f=>({...f,height:ev.target.value}))} style={inp}/></div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={saveWeightEdit} style={{...btn,flex:1,marginTop:0,padding:"8px"}}>Guardar</button>
                            <button onClick={()=>setEditingWeightId(null)} style={{flex:1,background:"none",border:"1px solid var(--border2)",color:"var(--muted)",padding:"8px",borderRadius:6,fontSize:11,textTransform:"uppercase",cursor:"pointer"}}>Cancelar</button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",fontSize:12}}>
                          <span style={{color:"var(--muted)"}}>{e.date}</span>
                          <span style={{color:"#c8a96e"}}>{e.weight} kg</span>
                          {bE&&<span style={{color:"var(--muted)"}}>IMC {bE}</span>}
                          <span style={{color:"var(--muted)"}}>prot {computeGoals(e.weight,true).protein}g</span>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>startEditWeight(e)} style={{background:"none",border:"1px solid var(--border2)",color:"var(--muted)",borderRadius:4,padding:"2px 7px",fontSize:10,cursor:"pointer"}}>editar</button>
                            <button onClick={()=>setWeightHistory(h=>h.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:"var(--faint)",cursor:"pointer",fontSize:14}}>×</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {weightHistory.length===0&&<div style={{color:"var(--faint)",fontSize:12,fontStyle:"italic",textAlign:"center",marginTop:20}}>Ainda sem registos de peso.</div>}

            {/* Custom goals */}
            <div style={{marginTop:24,borderTop:"1px solid var(--border3)",paddingTop:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase"}}>Metas personalizadas</div>
                <button onClick={editingGoals?saveGoals:startEditGoals} style={sBtn("var(--btn-ok)","var(--btn-ok-border)","#7ec87e")}>
                  {editingGoals?"✓ Guardar":"Editar metas"}
                </button>
              </div>
              <div style={{fontSize:10,color:"var(--dim)",marginBottom:12}}>
                Deixa em branco para usar o valor calculado automaticamente pelo peso. Os valores personalizados têm prioridade.
              </div>
              {editingGoals?(
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {[
                    {k:"protein",l:"Proteína",u:"g"},{k:"kcal",l:"Calorias",u:"kcal"},
                    {k:"carbs",l:"Carboidratos",u:"g"},{k:"fat",l:"Gorduras",u:"g"},
                    {k:"fiber",l:"Fibra",u:"g"},{k:"salt",l:"Sal",u:"g"},
                    {k:"water",l:"Água",u:"ml"},
                  ].map(({k,l,u})=>(
                    <div key={k} style={{flex:"1 1 calc(50% - 4px)",minWidth:120}}>
                      <label style={lbl}>{l} ({u})</label>
                      <input type="number" value={goalDraft[k]||""} onChange={e=>setGoalDraft(d=>({...d,[k]:e.target.value}))}
                        placeholder={"auto: "+baseGoals[k]||""} style={inp}/>
                    </div>
                  ))}
                </div>
              ):(
                <div style={{display:"flex",flexWrap:"wrap",gap:"8px 20px"}}>
                  {[
                    {k:"protein",l:"Proteína",u:"g",c:"#c8a96e"},{k:"kcal",l:"Calorias",u:"kcal",c:"#8ec8c8"},
                    {k:"carbs",l:"Carbs",u:"g",c:"#a96ec8"},{k:"fat",l:"Gordura",u:"g",c:"#c86e8e"},
                    {k:"fiber",l:"Fibra",u:"g",c:"#6ec8a9"},{k:"salt",l:"Sal",u:"g",c:"#888"},
                    {k:"water",l:"Água",u:"ml",c:"#6ec8a9"},
                  ].map(({k,l,u,c})=>(
                    <div key={k}>
                      <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1}}>{l.toUpperCase()}</div>
                      <div style={{fontSize:14,color:customGoals[k]?"#c8a96e":c,marginTop:2}}>
                        {goals[k]||baseGoals[k]||"—"}{u}
                        {customGoals[k]&&<span style={{fontSize:9,color:"var(--muted)",marginLeft:4}}>personalizada</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(customGoals).length>0&&!editingGoals&&(
                <button onClick={()=>{setCustomGoals({});notify("Metas repostas para os valores automáticos.");}} style={{...btn,marginTop:12,background:"var(--btn-warn)",border:"1px solid var(--btn-warn-border)",color:"var(--btn-warn-text)",fontSize:10,letterSpacing:1}}>
                  Repor metas automáticas
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inp={width:"100%",background:"var(--input)",border:"1px solid var(--border2)",color:"var(--text2)",padding:"9px 12px",borderRadius:6,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none",marginTop:3};
const lbl={fontSize:10,letterSpacing:1.5,color:"var(--muted)",textTransform:"uppercase",display:"block"};
const btn={width:"100%",background:"var(--btn-ok)",border:"1px solid var(--btn-ok-border)",color:"var(--btn-ok-text)",padding:"11px",borderRadius:6,fontSize:11,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",marginTop:4};
function sBtn(bg,border,color){return{background:bg,border:"1px solid "+border,color,borderRadius:4,padding:"6px 10px",fontSize:10,letterSpacing:1,textTransform:"uppercase",cursor:"pointer"};}
function sBtnLbl(bg,border,color){return{...sBtn(bg,border,color),display:"inline-block"};}
