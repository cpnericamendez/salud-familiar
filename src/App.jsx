import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

const COLORS = ["#E07A5F","#3D405B","#81B29A","#F2CC8F","#6A8EAE","#C9A96E","#7D6B8A","#5B8C5A","#D4878A","#4A90A4"];
const AVATARS = ["👩","👨","👦","👧","👶","🧒","🧓","👴","👵","🧑"];
const FREQ_OPTIONS = ["Cada 4 horas","Cada 6 horas","Cada 8 horas","Cada 12 horas","Una vez al día","Dos veces al día","Antes de las comidas","Con las comidas","Al acostarse","Según necesidad"];

// ── Calendario Nacional de Vacunación Argentina 2025 ──
const VACCINE_SCHEDULE = [
  { ageMonths:0,  vaccine:"BCG",                      desc:"Tuberculosis",                                     dosis:"Dosis única al nacer" },
  { ageMonths:0,  vaccine:"Hepatitis B",              desc:"Hepatitis B",                                      dosis:"1ª dosis — dentro de las 12hs de vida" },
  { ageMonths:2,  vaccine:"Pentavalente",             desc:"Difteria, Tétanos, Coqueluche, Hib, Hepatitis B",  dosis:"1ª dosis" },
  { ageMonths:2,  vaccine:"Salk (IPV)",               desc:"Poliomielitis",                                    dosis:"1ª dosis" },
  { ageMonths:2,  vaccine:"Neumococo conjugada",      desc:"Neumonía y meningitis",                            dosis:"1ª dosis" },
  { ageMonths:2,  vaccine:"Antirotavirus",            desc:"Rotavirus — previene diarrea grave",               dosis:"1ª dosis" },
  { ageMonths:2,  vaccine:"Meningococo B",            desc:"Meningitis meningocócica B",                       dosis:"1ª dosis" },
  { ageMonths:3,  vaccine:"Meningococo B",            desc:"Meningitis meningocócica B",                       dosis:"2ª dosis" },
  { ageMonths:4,  vaccine:"Pentavalente",             desc:"Difteria, Tétanos, Coqueluche, Hib, Hepatitis B",  dosis:"2ª dosis" },
  { ageMonths:4,  vaccine:"Salk (IPV)",               desc:"Poliomielitis",                                    dosis:"2ª dosis" },
  { ageMonths:4,  vaccine:"Neumococo conjugada",      desc:"Neumonía y meningitis",                            dosis:"2ª dosis" },
  { ageMonths:4,  vaccine:"Antirotavirus",            desc:"Rotavirus — previene diarrea grave",               dosis:"2ª dosis" },
  { ageMonths:4,  vaccine:"Meningococo tetravalente", desc:"Meningitis meningocócica ACYW",                    dosis:"1ª dosis" },
  { ageMonths:6,  vaccine:"Pentavalente",             desc:"Difteria, Tétanos, Coqueluche, Hib, Hepatitis B",  dosis:"3ª dosis" },
  { ageMonths:6,  vaccine:"Salk (IPV)",               desc:"Poliomielitis",                                    dosis:"3ª dosis" },
  { ageMonths:6,  vaccine:"Antigripal pediátrica",    desc:"Gripe — otoño, cada año desde los 6 meses",        dosis:"1ª dosis (+2ª a los 30 días en el primer año)" },
  { ageMonths:6,  vaccine:"Meningococo tetravalente", desc:"Meningitis meningocócica ACYW",                    dosis:"2ª dosis" },
  { ageMonths:12, vaccine:"Hepatitis A",              desc:"Hepatitis A",                                      dosis:"Dosis única" },
  { ageMonths:12, vaccine:"Neumococo conjugada",      desc:"Neumonía y meningitis",                            dosis:"Refuerzo" },
  { ageMonths:12, vaccine:"Triple Viral (SRP)",       desc:"Sarampión, Rubéola, Paperas",                      dosis:"1ª dosis" },
  { ageMonths:12, vaccine:"Meningococo B",            desc:"Meningitis meningocócica B",                       dosis:"Refuerzo" },
  { ageMonths:15, vaccine:"Varicela",                 desc:"Varicela",                                         dosis:"1ª dosis" },
  { ageMonths:15, vaccine:"Triple Viral (SRP)",       desc:"Sarampión, Rubéola, Paperas",                      dosis:"2ª dosis (nacidos desde jul/2024)" },
  { ageMonths:18, vaccine:"Pentavalente",             desc:"Difteria, Tétanos, Coqueluche, Hib, Hepatitis B",  dosis:"Refuerzo" },
  { ageMonths:18, vaccine:"Salk (IPV)",               desc:"Poliomielitis",                                    dosis:"Refuerzo" },
  { ageMonths:18, vaccine:"Meningococo tetravalente", desc:"Meningitis meningocócica ACYW",                    dosis:"Refuerzo" },
  { ageMonths:24, vaccine:"Varicela",                 desc:"Varicela",                                         dosis:"2ª dosis" },
  { ageMonths:60, vaccine:"Triple bacteriana (dTpa)", desc:"Difteria, Tétanos, Coqueluche",                    dosis:"Refuerzo — ingreso escolar" },
  { ageMonths:60, vaccine:"Sabin (OPV)",              desc:"Poliomielitis oral",                               dosis:"Refuerzo — ingreso escolar" },
  { ageMonths:60, vaccine:"Triple Viral (SRP)",       desc:"Sarampión, Rubéola, Paperas",                      dosis:"2ª dosis (nacidos antes de jul/2024)" },
  { ageMonths:132,vaccine:"VPH",                      desc:"Virus del Papiloma Humano — prevención de cáncer", dosis:"Dosis única (desde 2024)" },
  { ageMonths:132,vaccine:"Triple bacteriana (dTpa)", desc:"Difteria, Tétanos, Coqueluche",                    dosis:"Refuerzo — 11 años" },
  { ageMonths:132,vaccine:"Meningococo tetravalente", desc:"Meningitis meningocócica ACYW",                    dosis:"Refuerzo — 11 años (zonas de riesgo)" },
  { ageMonths:132,vaccine:"Hepatitis B",              desc:"Hepatitis B",                                      dosis:"Completar esquema si no lo recibió" },
];

// ── Helpers ──
const toISO  = d => d.toISOString().split("T")[0];
const fmt    = s => { if(!s) return ""; const[y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };
const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
};
const daysUntil = s => {
  if(!s) return null;
  const today = localToday();
  if(s === today) return 0;
  // Parse both as local midnight to avoid UTC offset issues
  const [ty,tm,td] = today.split("-").map(Number);
  const [sy,sm,sd] = s.split("-").map(Number);
  const t0 = new Date(ty,tm-1,td);
  const t1 = new Date(sy,sm-1,sd);
  return Math.round((t1-t0)/86400000);
};
const getAge = bd => { if(!bd) return null; return Math.floor((Date.now()-new Date(bd).getTime())/(86400000*365.25)); };
const addMonths = (date,m) => { const d=new Date(date); d.setMonth(d.getMonth()+m); return d; };
function ageMonthsAt(birthStr, measStr) {
  if(!birthStr || !measStr) return 0;
  const [by,bm,bd] = birthStr.split("-").map(Number);
  const [my,mm,md] = measStr.split("-").map(Number);
  const m = (my-by)*12 + (mm-bm) - (md<bd?1:0);
  return m < 0 ? 0 : m;
}
const vacKey = v => `${v.vaccine}||${v.dosis}`;

// ── IMC & Crecimiento ──
function calcIMC(peso, talla) {
  if (!peso || !talla) return null;
  const m = talla / 100;
  return (peso / (m * m)).toFixed(1);
}
function imcLabel(imc) {
  if (!imc) return null;
  const v = parseFloat(imc);
  if (v < 18.5) return { label:"Bajo peso", color:"#4A90A4" };
  if (v < 25)   return { label:"Normal",    color:"#5B8C5A" };
  if (v < 30)   return { label:"Sobrepeso", color:"#C9A96E" };
  return             { label:"Obesidad",   color:"#E07A5F" };
}
// OMS Percentiles peso (kg) por edad (meses) — niños 0-60m aproximado (p3,p15,p50,p85,p97)
const OMS_PESO_NINO = {
  0:[2.5,2.9,3.3,3.7,4.2], 3:[5.0,5.6,6.4,7.2,7.9], 6:[6.4,7.1,7.9,8.8,9.7],
  12:[8.1,8.9,9.6,10.8,11.8], 24:[10.2,11.5,12.2,13.5,15.0], 36:[12.0,13.5,14.3,16.0,17.5],
  48:[13.7,15.3,16.3,18.3,20.0], 60:[15.2,17.0,18.3,20.5,22.5]
};
const OMS_PESO_NINA = {
  0:[2.4,2.8,3.2,3.6,4.0], 3:[4.6,5.2,5.8,6.6,7.3], 6:[5.7,6.5,7.3,8.2,9.3],
  12:[7.3,8.1,8.9,10.1,11.5], 24:[9.8,11.1,11.5,13.2,14.8], 36:[11.5,13.0,13.9,15.7,17.5],
  48:[13.0,14.8,16.1,18.3,20.4], 60:[14.2,16.4,18.2,20.8,23.5]
};
function getPercentile(peso, ageMonths, sexo) {
  if (!peso || !ageMonths) return null;
  const table = sexo === "F" ? OMS_PESO_NINA : OMS_PESO_NINO;
  const keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  let closest = keys[0];
  for (const k of keys) { if (ageMonths >= k) closest = k; }
  const refs = table[closest];
  if (!refs) return null;
  const p = parseFloat(peso);
  if (p <= refs[0]) return { pct:"<p3",  label:"Muy bajo", color:"#E07A5F" };
  if (p <= refs[1]) return { pct:"p3-15", label:"Bajo",   color:"#C9A96E" };
  if (p <= refs[2]) return { pct:"p15-50",label:"Normal", color:"#5B8C5A" };
  if (p <= refs[3]) return { pct:"p50-85",label:"Normal", color:"#5B8C5A" };
  if (p <= refs[4]) return { pct:"p85-97",label:"Alto",   color:"#C9A96E" };
  return               { pct:">p97",  label:"Muy alto", color:"#E07A5F" };
}

// ── PDF Engine (uses jsPDF loaded via script tag) ──
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// PDF builder — returns jsPDF doc
async function buildPDF({ member, consultations, illnesses, appointments, appliedVaccines, mode, filterSpec, filterId }) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const PW = 210, PH = 297;
  const ML = 18, MR = 18, MT = 20;
  const CW = PW - ML - MR;
  let y = MT;
  const today = new Date().toLocaleDateString("es-AR");

  // ── colors (RGB)
  const C_DARK  = [61,64,91];
  const C_MED   = [100,105,130];
  const C_LIGHT = [180,183,200];
  const C_LINE  = [237,233,227];
  const C_ACC   = [224,122,95];
  const C_GRN   = [91,140,90];
  const C_YEL   = [201,169,110];

  function setColor(rgb) { doc.setTextColor(...rgb); }
  function setDraw(rgb)  { doc.setDrawColor(...rgb); }
  function setFill(rgb)  { doc.setFillColor(...rgb); }

  function checkPage(need=10) {
    if (y + need > PH - 18) { doc.addPage(); y = MT; drawPageHeader(); }
  }

  function hline(yy, r=C_LINE) {
    setDraw(r); doc.setLineWidth(0.2);
    doc.line(ML, yy, PW-MR, yy);
  }

  function drawPageHeader() {
    // thin top bar
    setFill(C_DARK); doc.rect(0, 0, PW, 8, "F");
    setFill(C_ACC);  doc.rect(0, 0, 40, 8, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7);
    setColor([255,255,255]);
    doc.text("SALUD FAMILIAR", 5, 5.5);
    setColor(C_LIGHT);
    doc.text(`${member.name.toUpperCase()}  ·  ${modeLabel}`, 44, 5.5);
    doc.text(`Generado: ${today}`, PW-MR, 5.5, {align:"right"});
  }

  const MODES = { all:"Historia Clínica Completa", consultas:"Consultas Médicas", illness:"Enfermedades y Tratamientos", one_consult:"Consulta", one_illness:"Enfermedad / Tratamiento" };
  const modeLabel = MODES[mode] || "Resumen";

  // ── COVER ──
  setFill(C_DARK); doc.rect(0,0,PW,52,"F");
  setFill(C_ACC);  doc.rect(0,48,PW,4,"F");

  // avatar circle
  setFill([255,255,255]); doc.circle(ML+16, 26, 16, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(22);
  setColor(C_DARK);
  doc.text(member.avatar||"👤", ML+8, 30);

  // name block
  doc.setFont("helvetica","bold"); doc.setFontSize(22);
  setColor([255,255,255]);
  doc.text(member.name, ML+38, 22);
  doc.setFont("helvetica","normal"); doc.setFontSize(11);
  setColor(C_LIGHT);
  const infoParts = [];
  if (member.birthdate) infoParts.push(`Nac. ${fmt(member.birthdate)}  ·  ${getAge(member.birthdate)} años`);
  if (member.bloodType) infoParts.push(`Grupo: ${member.bloodType}`);
  if (member.allergies) infoParts.push(`Alergias: ${member.allergies}`);
  infoParts.forEach((p,i) => doc.text(p, ML+38, 30+i*7));

  // document type label
  doc.setFont("helvetica","bold"); doc.setFontSize(13);
  setColor(C_ACC);
  doc.text(modeLabel.toUpperCase(), ML+38, 46);

  y = 62;
  drawPageHeader();

  // helper — section header
  function sectionHeader(title, icon="") {
    checkPage(14);
    setFill([245,243,239]); doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, "F");
    hline(y+9, C_LINE);
    doc.setFont("helvetica","bold"); doc.setFontSize(10);
    setColor(C_DARK);
    doc.text((icon+" "+title).trim(), ML+4, y+6.2);
    y += 13;
  }

  // helper — labeled field
  function field(label, value, opts={}) {
    if (!value) return;
    const lines = doc.splitTextToSize(String(value), CW - (opts.indent||0) - 2);
    const needH = 5 + lines.length * 5;
    checkPage(needH+3);
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
    setColor(C_MED);
    doc.text(label.toUpperCase(), ML+(opts.indent||0), y);
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
    setColor(C_DARK);
    doc.text(lines, ML+(opts.indent||0), y+5);
    y += needH + 2;
  }

  // helper — card wrapper
  function card(drawFn, estimateH=30) {
    checkPage(estimateH+6);
    const startY = y;
    y += 3;
    drawFn();
    y += 4;
    setDraw(C_LINE); doc.setLineWidth(0.3);
    doc.roundedRect(ML, startY, CW, y-startY, 1.5, 1.5);
    y += 4;
  }

  // ─────────────────────────────────
  //  SINGLE CONSULT
  // ─────────────────────────────────
  function renderConsult(c) {
    card(()=>{
      // header strip
      setFill([248,246,242]);
      const hh = 10;
      doc.roundedRect(ML, y-3, CW, hh, 1.5, 1.5, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(11);
      setColor(C_DARK);
      doc.text(c.specialist||"Médico", ML+4, y+4);
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      setColor(C_MED);
      if(c.specialty) doc.text(c.specialty, ML+4, y+9);
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      setColor(C_ACC);
      doc.text(fmt(c.date), PW-MR-2, y+4, {align:"right"});
      y += hh + 4;
      if(c.reason)       field("Motivo de consulta", c.reason);
      if(c.diagnosis)    field("Diagnóstico", c.diagnosis);
      if(c.medications)  field("Medicamentos recetados", c.medications);
      if(c.nextSteps)    field("Indicaciones / próximos pasos", c.nextSteps);
      if(c.notes)        field("Notas", c.notes);
      if(c.nextAppointment) field("Próximo turno", `${fmt(c.nextAppointment)}${c.nextAppointmentNote?" — "+c.nextAppointmentNote:""}`);
      if(c.studies?.length){
        checkPage(8);
        doc.setFont("helvetica","bold"); doc.setFontSize(8.5); setColor(C_MED);
        doc.text("ESTUDIOS REALIZADOS", ML, y); y+=5;
        c.studies.forEach(st=>{ doc.setFont("helvetica","normal"); doc.setFontSize(9); setColor(C_DARK); doc.text("• "+st, ML+3, y); y+=5; });
        y+=2;
      }
    }, 50);
  }

  // ─────────────────────────────────
  //  SINGLE ILLNESS
  // ─────────────────────────────────
  function renderIllness(il) {
    card(()=>{
      setFill(il.active?[255,240,240]:[240,251,244]);
      doc.roundedRect(ML, y-3, CW, 10, 1.5,1.5,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(11); setColor(C_DARK);
      doc.text(il.name||"Enfermedad", ML+4, y+4);
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setColor(il.active?C_ACC:C_GRN);
      doc.text(il.active?"● Activa":"✓ Recuperado", PW-MR-2, y+4, {align:"right"});
      doc.setFont("helvetica","normal"); doc.setFontSize(9); setColor(C_MED);
      const dateRange = `Desde ${fmt(il.startDate)}${il.endDate?" hasta "+fmt(il.endDate):""}`;
      doc.text(dateRange, ML+4, y+9);
      y += 14;
      if(il.doctor)    field("Médico", il.doctor);
      if(il.symptoms)  field("Síntomas", il.symptoms);
      if(il.treatment) field("Tratamiento", il.treatment);
      if(il.notes)     field("Notas", il.notes);
      if(il.medications?.length){
        checkPage(10);
        doc.setFont("helvetica","bold"); doc.setFontSize(9); setColor(C_DARK);
        doc.text("Medicamentos y horarios", ML, y); y+=6;
        il.medications.forEach(med=>{
          checkPage(20);
          setFill([250,248,245]); doc.roundedRect(ML+2, y-1, CW-4, 
            (med.times?.filter(t=>t).length?16:12)+(med.notes?6:0), 1,1,"F");
          doc.setFont("helvetica","bold"); doc.setFontSize(9.5); setColor(C_DARK);
          doc.text(med.name||"Medicamento", ML+5, y+4);
          if(med.dose){ doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setColor(C_MED); doc.text(med.dose, ML+5, y+9); }
          doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setColor(C_YEL);
          doc.text(med.frequency||"", PW-MR-5, y+4, {align:"right"});
          y+=12;
          if(med.times?.filter(t=>t).length){
            doc.setFont("helvetica","bold"); doc.setFontSize(8); setColor(C_MED);
            doc.text("Horarios: ", ML+5, y);
            doc.setFont("helvetica","normal"); setColor(C_DARK);
            doc.text(med.times.filter(t=>t).join("  ·  "), ML+22, y);
            y+=6;
          }
          if(med.notes){ doc.setFont("helvetica","italic"); doc.setFontSize(8); setColor(C_MED); doc.text(med.notes, ML+5, y); y+=6; }
          y+=4;
        });
      }
    }, 60);
  }

  // ─────────────────────────────────
  //  BUILD CONTENT BY MODE
  // ─────────────────────────────────
  if(mode==="one_consult") {
    const c = consultations.find(x=>x.id===filterId);
    if(c) renderConsult(c);

  } else if(mode==="one_illness") {
    const il = illnesses.find(x=>x.id===filterId);
    if(il) renderIllness(il);

  } else if(mode==="consultas") {
    let list = consultations;
    if(filterSpec) list = list.filter(c=>(c.specialist+c.specialty).toLowerCase().includes(filterSpec.toLowerCase()));
    list = list.sort((a,b)=>new Date(b.date)-new Date(a.date));
    sectionHeader(`Consultas médicas${filterSpec?" — "+filterSpec:""}`, "");
    if(!list.length){ setColor(C_MED); doc.setFontSize(9); doc.text("Sin consultas registradas.", ML, y); y+=8; }
    list.forEach(c=>renderConsult(c));

  } else if(mode==="illness") {
    const list = illnesses.sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
    sectionHeader("Enfermedades y tratamientos", "");
    if(!list.length){ setColor(C_MED); doc.setFontSize(9); doc.text("Sin enfermedades registradas.", ML, y); y+=8; }
    list.forEach(il=>renderIllness(il));

  } else if(mode==="all") {
    // 1. Resumen del paciente
    sectionHeader("Datos del paciente");
    if(member.birthdate) field("Fecha de nacimiento", `${fmt(member.birthdate)}  (${getAge(member.birthdate)} años)`);
    if(member.bloodType) field("Grupo sanguíneo", member.bloodType);
    if(member.allergies) field("Alergias conocidas", member.allergies);

    // 2. Turnos próximos
    const upAppts = appointments.filter(a=>{const d=daysUntil(a.date);return d!==null&&d>=0;}).sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(upAppts.length){
      sectionHeader("Turnos y recordatorios");
      upAppts.forEach(a=>{
        checkPage(12);
        const days=daysUntil(a.date);
        setFill(days===0?[255,235,230]:days<=3?[255,251,235]:[240,251,244]);
        doc.roundedRect(ML, y, CW, 10, 1.5,1.5,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(9.5); setColor(C_DARK);
        doc.text(`${a.type==="recordatorio"?"[Rec.]":"[Turno]"} ${a.title}`, ML+4, y+4);
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setColor(C_MED);
        doc.text(`${a.specialist||""}  ·  ${fmt(a.date)}${a.time?" "+a.time:""}`, ML+4, y+8.5);
        doc.setFont("helvetica","bold"); doc.setFontSize(8); setColor(days<=3?C_ACC:C_GRN);
        doc.text(days===0?"HOY":days===1?"MAÑANA":`en ${days}d`, PW-MR-2, y+6, {align:"right"});
        y+=13;
      });
    }

    // 3. Consultas
    const consList = consultations.sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(consList.length){
      sectionHeader("Consultas médicas");
      consList.forEach(c=>renderConsult(c));
    }

    // 4. Enfermedades
    const illList = illnesses.sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
    if(illList.length){
      sectionHeader("Enfermedades y tratamientos");
      illList.forEach(il=>renderIllness(il));
    }

    // 5. Vacunas
    const applied = appliedVaccines || [];
    const allV = allVaccinesForMember(member);
    const appV = allV.filter(v=>applied.includes(v.key));
    const pendV = allV.filter(v=>!applied.includes(v.key));
    sectionHeader("Vacunación — Calendario Nacional Argentina");
    if(appV.length){
      checkPage(8); doc.setFont("helvetica","bold"); doc.setFontSize(9); setColor(C_GRN);
      doc.text(`Vacunas aplicadas: ${appV.length}/${allV.length}`, ML, y); y+=7;
      appV.forEach(v=>{
        checkPage(7);
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setColor(C_DARK);
        doc.text(`✓  ${v.vaccine}  —  ${v.dosis}`, ML+3, y); y+=5.5;
      });
      y+=3;
    }
    if(pendV.length){
      checkPage(8); doc.setFont("helvetica","bold"); doc.setFontSize(9); setColor(C_ACC);
      doc.text(`Vacunas pendientes: ${pendV.length}`, ML, y); y+=7;
      pendV.forEach(v=>{
        checkPage(7);
        const late=v.days<0;
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5); setColor(late?C_ACC:C_DARK);
        doc.text(`${late?"⚠":"○"}  ${v.vaccine}  —  ${v.dosis}  (${fmt(v.dueDate)})`, ML+3, y); y+=5.5;
      });
    }
  }

  // ── FOOTER on all pages ──
  const totalPages = doc.getNumberOfPages();
  for(let i=1;i<=totalPages;i++){
    doc.setPage(i);
    setFill([245,243,239]); doc.rect(0, PH-10, PW, 10, "F");
    doc.setFont("helvetica","normal"); doc.setFontSize(7); setColor(C_MED);
    doc.text("Salud Familiar — Documento generado para uso personal. No reemplaza criterio médico profesional.", ML, PH-4);
    doc.text(`${i} / ${totalPages}`, PW-MR, PH-4, {align:"right"});
  }

  return doc;
}

// All vaccines for a member with applied filter
function allVaccinesForMember(member) {
  if(!member.birthdate) return [];
  const birth = new Date(member.birthdate);
  return VACCINE_SCHEDULE.map(v => {
    const dueDate = toISO(addMonths(birth, v.ageMonths));
    return { ...v, dueDate, days: daysUntil(dueDate), key: vacKey(v), memberId: member.id };
  });
}
// Pending vaccines (not applied, within 6 months or overdue)
function pendingVaccines(member, applied=[]) {
  return allVaccinesForMember(member)
    .filter(v => !applied.includes(v.key) && v.days <= 180)
    .sort((a,b) => a.days - b.days);
}

// ── Initial data ──
const INIT = {
  members: [
    { id:1, name:"Mamá",  avatar:"👩", color:"#E07A5F", birthdate:"1985-03-15" },
    { id:2, name:"Papá",  avatar:"👨", color:"#3D405B", birthdate:"1983-07-22" },
    { id:3, name:"Lucía", avatar:"👧", color:"#81B29A", birthdate:"2020-06-10" },
    { id:4, name:"Mateo", avatar:"👦", color:"#C9A96E", birthdate:"2022-11-05" },
  ],
  appointments:    [],
  consultations:   [],
  illnesses:       [],
  appliedVaccines: {},
};

const FIRESTORE_DOC = "familyData/shared";

// Compress image to max 200px and low quality to keep under Firestore limits
function compressPhoto(dataUrl) {
  return new Promise(resolve => {
    if (!dataUrl || dataUrl === "__HAS_PHOTO__") { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const MAX = 200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.55));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

// Save photos in SEPARATE Firestore docs (one per member) — avoids 1MB limit
async function savePhotosToFirestore(members) {
  for (const m of members) {
    if (!m.photo || m.photo === "__HAS_PHOTO__") continue;
    try {
      const compressed = await compressPhoto(m.photo);
      const photoRef = doc(db, "memberPhotos", String(m.id));
      await setDoc(photoRef, { photo: compressed, updatedAt: Date.now() });
      // Also cache locally as backup
      try {
        const cached = JSON.parse(localStorage.getItem("sfv_photos") || "{}");
        cached[m.id] = compressed;
        localStorage.setItem("sfv_photos", JSON.stringify(cached));
      } catch {}
    } catch {}
  }
}

// Load photos from Firestore (separate docs) and merge into data
async function loadPhotosFromFirestore(members) {
  const photos = {};
  // First try localStorage as quick cache
  try {
    const cached = JSON.parse(localStorage.getItem("sfv_photos") || "{}");
    Object.assign(photos, cached);
  } catch {}
  // Then fetch from Firestore for each member
  for (const m of members) {
    try {
      const photoRef = doc(db, "memberPhotos", String(m.id));
      const snap = await getDoc(photoRef);
      if (snap.exists() && snap.data().photo) {
        photos[m.id] = snap.data().photo;
        // Update local cache
        try {
          const cached = JSON.parse(localStorage.getItem("sfv_photos") || "{}");
          cached[m.id] = snap.data().photo;
          localStorage.setItem("sfv_photos", JSON.stringify(cached));
        } catch {}
      }
    } catch {}
  }
  return photos;
}

// Strip photos before saving main doc (photos go to separate docs)
function stripPhotos(data) {
  return {
    ...data,
    members: data.members.map(m => ({ ...m, photo: m.photo ? "__HAS_PHOTO__" : "" }))
  };
}

function applyPhotos(cloudData, photos) {
  return {
    ...cloudData,
    members: cloudData.members.map(m => ({
      ...m,
      photo: photos[m.id] || (m.photo !== "__HAS_PHOTO__" ? m.photo : "") || ""
    }))
  };
}

// ══════════════════════════════════════════
//  APP
// ══════════════════════════════════════════
export default function App() {
  const [data, setData]           = useState(INIT);
  const [synced, setSynced]       = useState(false);   // initial load done
  const [syncStatus, setSyncStatus] = useState("loading"); // loading | ok | error
  const [lastSync, setLastSync]   = useState(null);
  const [page, setPage]           = useState("home");
  const [memberId, setMemberId]   = useState(null);
  const [memberTab, setMemberTab] = useState("consultas");
  const [modal, setModal]         = useState(null);
  const [editItem, setEditItem]   = useState(null);
  const [pdfModal, setPdfModal]   = useState(false);
  const [toastMsg, setToastMsg]   = useState(null);
  const [search, setSearch]       = useState("");
  const [reminderMode, setReminderMode] = useState("lista");
  const [calMonth, setCalMonth]   = useState(()=>{ const n=new Date(); return {y:n.getFullYear(),m:n.getMonth()}; });

  // ── Firebase: realtime listener ──
  useEffect(() => {
    const ref = doc(db, "familyData", "shared");
    const unsub = onSnapshot(ref,
      async (snap) => {
        if (snap.exists()) {
          const cloud = snap.data();
          const photos = await loadPhotosFromFirestore(cloud.members || []);
          setData(prev => {
            if ((cloud._ts || 0) > (prev._ts || 0)) {
              return applyPhotos(cloud, photos);
            }
            return prev;
          });
        }
        setSynced(true);
        setSyncStatus("ok");
        setLastSync(new Date());
      },
      (err) => {
        console.error("Firestore error:", err);
        setSynced(true);
        setSyncStatus("error");
      }
    );
    return () => unsub();
  }, []);

  // ── Save to Firestore whenever data changes (debounced 600ms) ──
  useEffect(() => {
    if (!synced) return;
    const t = setTimeout(async () => {
      try {
        const ref = doc(db, "familyData", "shared");
        const membersWithPhotos = data.members.filter(m => m.photo && m.photo !== "__HAS_PHOTO__");
        if (membersWithPhotos.length > 0) await savePhotosToFirestore(membersWithPhotos);
        await setDoc(ref, stripPhotos(data));
        setSyncStatus("ok");
        setLastSync(new Date());
      } catch (e) {
        console.error("Save error:", e);
        setSyncStatus("error");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [data, synced]);

  // ── OneSignal Push Notifications ──
  useEffect(() => {
    if (!synced) return;
    // OneSignal SDK loaded via script tag in index.html
    // It handles permission request and subscription automatically
    if (typeof window.OneSignal === "undefined") return;
    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId: "REEMPLAZAR_CON_ONESIGNAL_APP_ID",
        safari_web_id: "web.onesignal.auto.REEMPLAZAR",
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });
      // Ask permission after first interaction
      window.OneSignal.showSlidedownPrompt();
    });
  }, [synced]);

  // ── Schedule notifications for today/tomorrow turnos via OneSignal ──
  useEffect(() => {
    if (!synced) return;
    async function scheduleReminders() {
      if (typeof window.OneSignal === "undefined") return;
      try {
        const userId = await new Promise(res => window.OneSignal.getUserId(res));
        if (!userId) return;
        // Store userId so Cloud-side can target this device
        await setDoc(doc(db, "pushTokens", userId), {
          userId,
          updatedAt: Date.now()
        }, { merge: true });
      } catch {}
    }
    scheduleReminders();
  }, [synced]);

  // ── Daily appointment reminder check ──
  useEffect(() => {
    if (!synced) return;
    const todayAppts = data.appointments.filter(a => daysUntil(a.date) === 0);
    const tmrwAppts  = data.appointments.filter(a => daysUntil(a.date) === 1);
    const vacAlerts  = data.members.flatMap(m =>
      pendingVaccines(m, data.appliedVaccines?.[m.id]||[]).filter(v => v.days === 0 || v.days === 1)
    );
    if (todayAppts.length || tmrwAppts.length || vacAlerts.length) {
      let msg = "";
      todayAppts.forEach(a => { const mb = data.members.find(m=>m.id===a.memberId); msg += `🔴 HOY: ${a.title} (${mb?.name}) · `; });
      tmrwAppts.forEach(a  => { const mb = data.members.find(m=>m.id===a.memberId); msg += `🟡 MAÑANA: ${a.title} (${mb?.name}) · `; });
      vacAlerts.forEach(v  => { msg += `💉 Vacuna ${v.days===0?"HOY":"MAÑANA"}: ${v.vaccine} (${v.memberName}) · `; });
      setToastMsg(msg.slice(0,-3));
    }
  }, [synced, data.appointments, data.appliedVaccines]);

  // ── Wrap setData to always stamp a timestamp ──
  function setDataTS(updater) {
    setData(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return { ...next, _ts: Date.now() };
    });
  }

  const member     = data.members.find(m=>m.id===memberId);
  const closeModal = ()=>{ setModal(null); setEditItem(null); };

  // Upcoming appointments
  const upcomingAppts = useMemo(()=>{
    const n=new Date(); n.setHours(0,0,0,0);
    return data.appointments.filter(a=>new Date(a.date)>=n).sort((a,b)=>new Date(a.date)-new Date(b.date));
  },[data.appointments]);

  // Urgent vaccines (all members)
  const urgentVac = useMemo(()=>
    data.members.flatMap(m=>pendingVaccines(m, data.appliedVaccines?.[m.id]||[]).filter(v=>v.days<=30))
  ,[data.members, data.appliedVaccines]);

  // Active illnesses (for home banner)
  const activeIllnesses = useMemo(()=>
    data.illnesses.filter(il=>il.active)
  ,[data.illnesses]);

  // Filtered consultations
  const filteredConsults = useMemo(()=>{
    let list = memberId ? data.consultations.filter(c=>c.memberId===memberId) : data.consultations;
    if(search) list=list.filter(c=>
      c.specialist.toLowerCase().includes(search.toLowerCase()) ||
      (c.specialty||"").toLowerCase().includes(search.toLowerCase())
    );
    return list.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[data.consultations, memberId, search]);

  const memberAppts = useMemo(()=>{
    const all = data.appointments.filter(a=>a.memberId===memberId);
    const upcoming = all.filter(a=>daysUntil(a.date)>=0).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const past     = all.filter(a=>daysUntil(a.date)<0).sort((a,b)=>new Date(b.date)-new Date(a.date));
    return [...upcoming, ...past];
  }
  ,[data.appointments, memberId]);

  const memberIllnesses = useMemo(()=>
    (data.illnesses||[]).filter(il=>il.memberId===memberId).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate))
  ,[data.illnesses, memberId]);

  // Calendar events
  const calEvents = useMemo(()=>{
    const map={};
    const ym=`${calMonth.y}-${String(calMonth.m+1).padStart(2,"0")}`;
    data.appointments.forEach(a=>{ if(a.date?.startsWith(ym)){(map[a.date]=map[a.date]||[]).push({...a,kind:"appt"});} });
    data.members.forEach(m=>{
      pendingVaccines(m,data.appliedVaccines?.[m.id]||[]).forEach(v=>{
        if(v.dueDate?.startsWith(ym)){(map[v.dueDate]=map[v.dueDate]||[]).push({...v,kind:"vaccine"});}
      });
    });
    return map;
  },[data.appointments, data.members, data.appliedVaccines, calMonth]);

  // ── CRUD ──
  const saveMember  = m => { if(m.id) setDataTS(d=>({...d,members:d.members.map(x=>x.id===m.id?m:x)})); else setDataTS(d=>({...d,members:[...d.members,{...m,id:Date.now()}]})); closeModal(); };
  const deleteMember= id => { if(!confirm("¿Eliminar integrante y todos sus registros?")) return; setDataTS(d=>({...d,members:d.members.filter(m=>m.id!==id),appointments:d.appointments.filter(a=>a.memberId!==id),consultations:d.consultations.filter(c=>c.memberId!==id),illnesses:(d.illnesses||[]).filter(il=>il.memberId!==id)})); setPage("home"); };
  const saveAppt    = a => { if(a.id) setDataTS(d=>({...d,appointments:d.appointments.map(x=>x.id===a.id?a:x)})); else setDataTS(d=>({...d,appointments:[...d.appointments,{...a,id:Date.now()}]})); closeModal(); };
  const delAppt     = id => setDataTS(d=>({...d,appointments:d.appointments.filter(a=>a.id!==id)}));
  const saveConsult = c => { if(c.id) setDataTS(d=>({...d,consultations:d.consultations.map(x=>x.id===c.id?c:x)})); else setDataTS(d=>({...d,consultations:[...d.consultations,{...c,id:Date.now()}]})); closeModal(); };
  const delConsult  = id => setDataTS(d=>({...d,consultations:d.consultations.filter(c=>c.id!==id)}));
  const saveIllness = il => {
    if(il.id) setDataTS(d=>({...d,illnesses:d.illnesses.map(x=>x.id===il.id?il:x)}));
    else setDataTS(d=>({...d,illnesses:[...(d.illnesses||[]),{...il,id:Date.now()}]}));
    closeModal();
  };
  const delIllness  = id => setDataTS(d=>({...d,illnesses:(d.illnesses||[]).filter(il=>il.id!==id)}));
  const toggleIllnessActive = id => setDataTS(d=>({...d,illnesses:(d.illnesses||[]).map(il=>il.id===id?{...il,active:!il.active}:il)}));

  // Measurements CRUD
  const saveMeasurement = (membId, meas) => {
    setDataTS(d => {
      const list = d.measurements?.[membId] || [];
      const exists = list.find(x => x.id === meas.id);
      const updated = exists ? list.map(x => x.id===meas.id?meas:x) : [...list, {...meas, id:Date.now()}];
      return { ...d, measurements: { ...d.measurements, [membId]: updated } };
    });
  };
  const delMeasurement = (membId, id) => setDataTS(d => ({
    ...d, measurements: { ...d.measurements, [membId]: (d.measurements?.[membId]||[]).filter(x=>x.id!==id) }
  }));

  // Antecedentes familiares CRUD
  const saveAntecedentes = (membId, ant) => {
    setDataTS(d => ({ ...d, antecedentes: { ...d.antecedentes, [membId]: ant } }));
  };
  const copyAntecedentes = (fromId, toId) => {
    setDataTS(d => ({
      ...d,
      antecedentes: { ...d.antecedentes, [toId]: { ...(d.antecedentes?.[fromId] || {}) } }
    }));
  };

  // Custom vaccines CRUD
  const saveCustomVaccine = (membId, vac) => {
    setDataTS(d => {
      const list = d.customVaccines?.[membId] || [];
      const exists = list.find(x => x.id === vac.id);
      const updated = exists ? list.map(x => x.id===vac.id?vac:x) : [...list, {...vac, id:Date.now()}];
      return { ...d, customVaccines: { ...d.customVaccines, [membId]: updated } };
    });
  };
  const delCustomVaccine = (membId, id) => setDataTS(d => ({
    ...d, customVaccines: { ...d.customVaccines, [membId]: (d.customVaccines?.[membId]||[]).filter(x=>x.id!==id) }
  }));

  // Vaccine helpers
  const markApplied   = (membId, key) => setDataTS(d=>({...d,appliedVaccines:{...d.appliedVaccines,[membId]:[...(d.appliedVaccines?.[membId]||[]),key]}}));
  const unmarkApplied = (membId, key) => setDataTS(d=>({...d,appliedVaccines:{...d.appliedVaccines,[membId]:(d.appliedVaccines?.[membId]||[]).filter(k=>k!==key)}}));
  const markAllApplied = membId => {
    const all = allVaccinesForMember(data.members.find(m=>m.id===membId)).map(v=>v.key);
    setDataTS(d=>({...d,appliedVaccines:{...d.appliedVaccines,[membId]:all}}));
  };

  // ── Calendar ──
  function CalGrid() {
    const {y,m}=calMonth;
    const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const days=new Date(y,m+1,0).getDate(), start=new Date(y,m,1).getDay();
    const tn=new Date(); const isCur=tn.getFullYear()===y&&tn.getMonth()===m;
    const cells=[...Array(start).fill(null),...Array.from({length:days},(_,i)=>i+1)];
    return (
      <div>
        <div style={S.calNav}>
          <button style={S.calBtn} onClick={()=>setCalMonth(p=>{const d=new Date(p.y,p.m-1,1);return{y:d.getFullYear(),m:d.getMonth()};})} >‹</button>
          <span style={S.calTitle}>{MONTHS[m]} {y}</span>
          <button style={S.calBtn} onClick={()=>setCalMonth(p=>{const d=new Date(p.y,p.m+1,1);return{y:d.getFullYear(),m:d.getMonth()};})}>›</button>
        </div>
        <div style={S.calGrid}>
          {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d=><div key={d} style={S.calHead}>{d}</div>)}
          {cells.map((d,i)=>{
            if(!d) return <div key={`x${i}`}/>;
            const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const evs=calEvents[ds]||[]; const isToday=isCur&&d===tn.getDate();
            return (
              <div key={d} style={{...S.calCell,background:isToday?"#E07A5F0D":"#fff",outline:isToday?"1.5px solid #E07A5F":"1px solid #EDE9E3"}}>
                <span style={{...S.calDay,color:isToday?"#E07A5F":"#3D405B",fontWeight:isToday?700:400}}>{d}</span>
                {evs.slice(0,2).map((e,ei)=>(
                  <div key={ei} style={{...S.calEv,background:e.kind==="vaccine"?"#F2CC8F44":"#81B29A33",borderLeft:`2px solid ${e.kind==="vaccine"?"#C9A96E":"#5B8C5A"}`}}>
                    {e.kind==="vaccine"?"💉":"📅"} <span style={{fontSize:8}}>{e.kind==="vaccine"?e.vaccine:e.title}</span>
                  </div>
                ))}
                {evs.length>2&&<div style={{fontSize:8,color:"#bbb",paddingLeft:2}}>+{evs.length-2}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function VBadge({days}) {
    const col=days<0?"#E07A5F":days===0?"#E07A5F":days<=7?"#D4878A":days<=30?"#C9A96E":"#81B29A";
    const txt=days<0?`Atrasada ${Math.abs(days)}d`:days===0?"HOY":days===1?"MAÑANA":`en ${days}d`;
    return <span style={{...S.badge,background:col}}>{txt}</span>;
  }

  // ══ RENDER ══
  // Loading screen while fetching cloud data
  if (!synced) return (
    <div style={{minHeight:"100vh",background:"#FAF8F5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <div style={{fontSize:40,marginBottom:16}}>🏥</div>
      <div style={{fontFamily:"'Lora',serif",fontSize:20,fontWeight:700,color:"#3D405B",marginBottom:8}}>Salud Familiar</div>
      <div style={{fontSize:13,color:"#aaa",marginBottom:24}}>Sincronizando datos...</div>
      <div style={{width:180,height:4,background:"#EDE9E3",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",background:"#81B29A",borderRadius:2,animation:"slide 1.2s infinite",width:"40%"}}/>
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(500%)}}`}</style>
    </div>
  );

  return (
    <div style={S.app}>
      <style>{`*{box-sizing:border-box}body{margin:0}button:hover{opacity:.83;transition:opacity .15s}input,select,textarea{font-family:'DM Sans',sans-serif}@keyframes slideDown{from{transform:translateY(-80px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>

      <header style={S.header}>
        <div style={S.hi}>
          {page!=="home"&&<button style={S.back} onClick={()=>{setPage("home");setMemberId(null);setSearch("");}}>←</button>}
          <div style={S.brand}>
            <span style={{fontSize:24}}>🏥</span>
            <div>
              <div style={S.brandName}>Salud Familiar</div>
              <div style={S.brandSub}>Argentina · Historial médico compartido</div>
            </div>
          </div>
          <div style={{...S.syncPill, background: syncStatus==="ok"?"#E8F5EC":syncStatus==="error"?"#FFF0F0":"#FFF7ED", color: syncStatus==="ok"?"#3D6B54":syncStatus==="error"?"#C0392B":"#7D5A30", border:`1px solid ${syncStatus==="ok"?"#81B29A":syncStatus==="error"?"#F8BCBC":"#F2CC8F"}`}}>
            {syncStatus==="ok"?"☁️ Sincronizado":syncStatus==="error"?"⚠️ Sin conexión":"⏳ Guardando..."}
          </div>
        </div>
      </header>

      {/* Toast notification banner */}
      {toastMsg&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:999,background:"#3D405B",color:"#fff",padding:"12px 16px",fontSize:13,lineHeight:1.5,animation:"slideDown .3s ease",display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>{toastMsg}</div>
          <button style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0,padding:0}} onClick={()=>setToastMsg(null)}>×</button>
        </div>
      )}

      <main style={S.main}>

        {/* ══ HOME ══ */}
        {page==="home"&&<>
          {/* Active illnesses banner */}
          {activeIllnesses.length>0&&(
            <div style={{...S.alertBox,background:"#FFF0F0",borderColor:"#F8BCBC"}}>
              <div style={{...S.alertHd,color:"#C0392B"}}>🤒 Enfermedades activas</div>
              {activeIllnesses.map(il=>{
                const mb=data.members.find(x=>x.id===il.memberId);
                return (
                  <div key={il.id} style={S.alertRow}>
                    <span style={{fontSize:18}}>{mb?.avatar}</span>
                    <div style={{flex:1}}>
                      <span style={{fontWeight:600,fontSize:13,color:"#C0392B"}}>{il.name}</span>
                      <span style={{fontSize:12,color:"#888"}}> · {mb?.name}</span>
                    </div>
                    {il.medications?.length>0&&<span style={{fontSize:11,color:"#888"}}>💊 {il.medications.length} medicamento{il.medications.length>1?"s":""}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Vaccine alerts */}
          {urgentVac.length>0&&(
            <div style={S.alertBox}>
              <div style={S.alertHd}>💉 Vacunas próximas o atrasadas</div>
              {urgentVac.slice(0,4).map((v,i)=>{
                const mb=data.members.find(x=>x.id===v.memberId);
                return (
                  <div key={i} style={S.alertRow}>
                    <span style={{fontSize:18}}>{mb?.avatar}</span>
                    <div style={{flex:1}}>
                      <span style={{fontWeight:600,fontSize:13}}>{v.vaccine}</span>
                      <span style={{fontSize:12,color:"#888"}}> · {mb?.name} · {v.dosis}</span>
                    </div>
                    <VBadge days={v.days}/>
                  </div>
                );
              })}
            </div>
          )}

          {/* Turnos */}
          <section style={S.sec}>
            <div style={S.secRow}>
              <h2 style={S.secT}>📅 Turnos y recordatorios</h2>
              <div style={S.togRow}>
                <button style={reminderMode==="lista"?S.togA:S.tog} onClick={()=>setReminderMode("lista")}>Lista</button>
                <button style={reminderMode==="calendario"?S.togA:S.tog} onClick={()=>setReminderMode("calendario")}>Calendario</button>
              </div>
            </div>
            {reminderMode==="lista"
              ? upcomingAppts.length===0
                  ? <p style={S.empty}>No hay turnos próximos.</p>
                  : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {upcomingAppts.slice(0,6).map(a=>{
                        const mb=data.members.find(x=>x.id===a.memberId);
                        const days=daysUntil(a.date);
                        const col=days===0?"#E07A5F":days<=3?"#C9A96E":"#81B29A";
                        return (
                          <div key={a.id} style={{...S.remCard,borderLeft:`3px solid ${col}`}}>
                            <span style={{fontSize:20}}>{mb?.avatar||"👤"}</span>
                            <div style={{flex:1}}>
                              <div style={S.remTitle}>{a.title}</div>
                              <div style={S.remMeta}>{mb?.name} · {a.specialist} · {fmt(a.date)}{a.time&&` · ${a.time}`}</div>
                            </div>
                            <span style={{...S.badge,background:col}}>{days===0?"HOY":days===1?"MAÑANA":`${days}d`}</span>
                          </div>
                        );
                      })}
                    </div>
              : <CalGrid/>
            }
          </section>

          {/* Members */}
          <section style={S.sec}>
            <div style={S.secRow}>
              <h2 style={S.secT}>👨‍👩‍👧‍👦 Integrantes</h2>
              <button style={S.addBtn} onClick={()=>{setEditItem(null);setModal("member");}}>+ Agregar</button>
            </div>
            <div style={S.mGrid}>
              {data.members.map(mb=>{
                const nc=data.consultations.filter(c=>c.memberId===mb.id).length;
                const na=data.appointments.filter(a=>a.memberId===mb.id&&daysUntil(a.date)>=0).length;
                const nv=pendingVaccines(mb,data.appliedVaccines?.[mb.id]||[]).filter(v=>v.days<=30).length;
                const ni=(data.illnesses||[]).filter(il=>il.memberId===mb.id&&il.active).length;
                return (
                  <div key={mb.id} style={{...S.mCard,borderTop:`3px solid ${mb.color}`}} onClick={()=>{setMemberId(mb.id);setPage("member");setMemberTab("consultas");setSearch("");}}>
                    {mb.photo
                      ? <img src={mb.photo} alt={mb.name} style={{width:52,height:52,borderRadius:26,objectFit:"cover",margin:"0 auto 8px",display:"block",border:`2px solid ${mb.color}`}}/>
                      : <div style={{...S.mAvatar,background:mb.color+"22"}}>{mb.avatar}</div>
                    }
                    <div style={S.mName}>{mb.name}</div>
                    {mb.birthdate&&<div style={S.mAge}>{getAge(mb.birthdate)} años</div>}
                    <div style={S.mStats}>
                      <span>📋 {nc}</span>
                      <span>📅 {na}</span>
                      {nv>0&&<span style={{color:"#C9A96E"}}>💉 {nv}</span>}
                      {ni>0&&<span style={{color:"#E07A5F"}}>🤒 {ni}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Global search */}
          <section style={S.sec}>
            <h2 style={S.secT}>🔍 Buscar consultas por especialista</h2>
            <input style={S.srch} placeholder="Ej: Pediatría, Dra. González..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&(filteredConsults.length===0
              ?<p style={S.empty}>Sin resultados.</p>
              :filteredConsults.map(c=>{const mb=data.members.find(x=>x.id===c.memberId); return <CCard key={c.id} c={c} member={mb} onEdit={()=>{setEditItem(c);setModal("consult");}} onDelete={()=>delConsult(c.id)}/>;})
            )}
          </section>
        </>}

        {/* ══ MEMBER PAGE ══ */}
        {page==="member"&&member&&(
          <div>
            <div style={{...S.hero,background:`linear-gradient(135deg,${member.color}18,${member.color}2E)`}}>
              {member.photo
                ? <img src={member.photo} alt={member.name} style={{width:72,height:72,borderRadius:36,objectFit:"cover",border:`3px solid ${member.color}`,flexShrink:0}}/>
                : <div style={{...S.heroAv,background:member.color+"33"}}>{member.avatar}</div>
              }
              <div style={{flex:1}}>
                <h1 style={S.heroName}>{member.name}</h1>
                {member.birthdate&&<p style={S.heroSub}>{fmt(member.birthdate)} · {getAge(member.birthdate)} años</p>}
                {member.bloodType&&<p style={{...S.heroSub,marginTop:2}}>🩸 {member.bloodType}{member.allergies?` · ⚠️ ${member.allergies}`:""}</p>}
                {member.sexo==="F"&&(member.embarazos||member.primeraMenstruacion)&&(
                  <p style={{...S.heroSub,marginTop:2}}>
                    🌸 {member.embarazos?`${member.embarazos} embarazo${member.embarazos>1?"s":""}`:""}{member.partosTermino?` · ${member.partosTermino} a término`:""}{member.tipoParto?` · ${member.tipoParto}`:""}
                  </p>
                )}
              </div>
              <button style={S.iBtn} onClick={()=>{setEditItem(member);setModal("member");}}>✏️</button>
              <button style={{...S.iBtn,color:"#E07A5F"}} onClick={()=>deleteMember(member.id)}>🗑️</button>
              <button style={{...S.iBtn,fontSize:16,background:"#F2CC8F33",border:"1px solid #C9A96E",borderRadius:8,padding:"4px 8px"}} title="Exportar PDF" onClick={()=>setPdfModal(true)}>📄</button>
            </div>

            {/* Alerta de turno HOY o MAÑANA */}
            {(()=>{
              const todayAppts = data.appointments.filter(a=>daysUntil(a.date)===0&&a.memberId===member.id);
              const tmrwAppts  = data.appointments.filter(a=>daysUntil(a.date)===1&&a.memberId===member.id);
              if(!todayAppts.length&&!tmrwAppts.length) return null;
              return (
                <div style={{background:"#FFE8E8",border:"1px solid #F8BCBC",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                  {todayAppts.map(a=>(
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:18}}>🔴</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#C0392B"}}>HOY — {a.title}</div>
                        <div style={{fontSize:11,color:"#888"}}>{a.specialist}{a.time?` · ${a.time}`:""}{a.location?` · ${a.location}`:""}</div>
                      </div>
                    </div>
                  ))}
                  {tmrwAppts.map(a=>(
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:18}}>🟡</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#7D5A30"}}>MAÑANA — {a.title}</div>
                        <div style={{fontSize:11,color:"#888"}}>{a.specialist}{a.time?` · ${a.time}`:""}{a.location?` · ${a.location}`:""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={S.tabs}>
              {[["consultas","📋"],["turnos","📅"],["vacunas","💉"],["crecimiento","📊"],["enfermedades","🤒"],["antecedentes","🧬"]].map(([k,ic])=>(
                <button key={k} style={memberTab===k?S.tabA:S.tabI} onClick={()=>setMemberTab(k)}>
                  {ic} <span style={{fontSize:10,display:"block"}}>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* CONSULTAS */}
            {memberTab==="consultas"&&<>
              <div style={S.toolbar}>
                <input style={{...S.srch,flex:1,marginBottom:0}} placeholder="Buscar por especialista..." value={search} onChange={e=>setSearch(e.target.value)}/>
                <button style={S.addBtn} onClick={()=>{setEditItem({memberId:member.id});setModal("consult");}}>+ Nueva</button>
              </div>
              {filteredConsults.length===0?<p style={S.empty}>Sin consultas cargadas.</p>
                :filteredConsults.map(c=><CCard key={c.id} c={c} onEdit={()=>{setEditItem(c);setModal("consult");}} onDelete={()=>delConsult(c.id)}/>)}
            </>}

            {/* TURNOS */}
            {memberTab==="turnos"&&<>
              <div style={S.toolbar}>
                <button style={S.addBtn} onClick={()=>{setEditItem({memberId:member.id});setModal("appt");}}>+ Agregar turno</button>
              </div>
              {memberAppts.length===0?<p style={S.empty}>Sin turnos cargados.</p>:memberAppts.map((a,idx)=>{
                const days=daysUntil(a.date); const past=days<0;
                const col=past?"#ccc":days===0?"#E07A5F":days<=3?"#C9A96E":"#81B29A";
                // Show separator before first past appointment
                const prevDays = idx>0 ? daysUntil(memberAppts[idx-1].date) : 0;
                const showSep = past && idx>0 && prevDays>=0;
                return (
                  <>
                  {showSep&&<div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 6px"}}>
                    <div style={{flex:1,height:1,background:"#EDE9E3"}}/>
                    <span style={{fontSize:11,color:"#bbb",fontWeight:600}}>TURNOS PASADOS</span>
                    <div style={{flex:1,height:1,background:"#EDE9E3"}}/>
                  </div>}
                  <div key={a.id} style={{...S.apptCard,opacity:past?.65:1}}>
                    <div style={{...S.apptDot,background:col}}/>
                    <div style={{flex:1}}>
                      <div style={S.apptTitle}>{a.type==="recordatorio"?"🔔":"📅"} {a.title}</div>
                      <div style={S.apptMeta}>{a.specialist}{a.location&&` · ${a.location}`}</div>
                      <div style={S.apptDate}>
                        {fmt(a.date)}{a.time&&` · ${a.time}`}
                        <span style={{...S.badge,background:col,marginLeft:6}}>{past?"Pasado":days===0?"HOY":days===1?"MAÑANA":`en ${days}d`}</span>
                      </div>
                      {a.notes&&<div style={S.apptNote}>{a.notes}</div>}
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {past&&<button style={{...S.iBtnSm,fontSize:12,background:"#F2CC8F33",border:"1px solid #C9A96E",borderRadius:6,padding:"2px 6px",color:"#7D5A30",whiteSpace:"nowrap"}}
                        title="Registrar lo que pasó en esta consulta"
                        onClick={()=>{
                          setEditItem({
                            memberId:a.memberId,
                            date:a.date,
                            specialist:a.specialist||"",
                            specialty:"",
                            reason:a.title||"",
                          });
                          setModal("consult");
                        }}>📋 Consulta</button>}
                      <button style={S.iBtnSm} onClick={()=>{setEditItem(a);setModal("appt");}}>✏️</button>
                      <button style={S.iBtnSm} onClick={()=>delAppt(a.id)}>🗑️</button>
                    </div>
                  </div>
                  </>
                );
              })}
            </>}

            {/* VACUNAS — quick-check por integrante */}
            {memberTab==="vacunas"&&(()=>{
              if(!member.birthdate) return <p style={S.empty}>Agregá la fecha de nacimiento para ver el calendario.</p>;
              const applied = data.appliedVaccines?.[member.id]||[];
              const all = allVaccinesForMember(member);
              const totalApplied = applied.length;
              const pct = Math.round((totalApplied/all.length)*100);
              return <>
                {/* Progress bar */}
                <div style={S.vacProgress}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#3D405B"}}>Esquema de vacunación</span>
                    <span style={{fontSize:13,color:"#81B29A",fontWeight:700}}>{totalApplied}/{all.length} aplicadas</span>
                  </div>
                  <div style={S.progressBar}>
                    <div style={{...S.progressFill,width:`${pct}%`,background:pct===100?"#5B8C5A":"#81B29A"}}/>
                  </div>
                  {pct===100&&<div style={{...S.allGood,marginTop:10}}>✅ ¡Todas las vacunas al día!</div>}
                </div>

                {/* Quick actions */}
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <button style={S.quickBtn} onClick={()=>markAllApplied(member.id)}>☑️ Marcar todas como aplicadas</button>
                  <button style={{...S.quickBtn,background:"#FFF0F0",color:"#C0392B",border:"1px solid #F8BCBC"}} onClick={()=>setDataTS(d=>({...d,appliedVaccines:{...d.appliedVaccines,[member.id]:[]}}))}>✕ Resetear</button>
                </div>

                <p style={{fontSize:11,color:"#bbb",margin:"0 0 10px"}}>Tildá las vacunas ya aplicadas. Las que no están aplicadas y corresponden por edad se muestran con alerta.</p>

                {/* Full vaccine list with checkboxes grouped by age */}
                {[
                  {label:"Recién nacido",   months:[0]},
                  {label:"2 meses",         months:[2]},
                  {label:"3 meses",         months:[3]},
                  {label:"4 meses",         months:[4]},
                  {label:"6 meses",         months:[6]},
                  {label:"12 meses",        months:[12]},
                  {label:"15 meses",        months:[15]},
                  {label:"18 meses",        months:[18]},
                  {label:"2 años",          months:[24]},
                  {label:"5 años",          months:[60]},
                  {label:"11 años",         months:[132]},
                ].map(group=>{
                  const groupVacs = all.filter(v=>group.months.includes(v.ageMonths));
                  if(!groupVacs.length) return null;
                  return (
                    <div key={group.label} style={S.vacGroup}>
                      <div style={S.vacGroupLabel}>{group.label}</div>
                      {groupVacs.map(v=>{
                        const isApplied = applied.includes(v.key);
                        const isDue = !isApplied && v.days<=30;
                        const isOverdue = !isApplied && v.days<0;
                        return (
                          <div key={v.key} style={{...S.vacCheckRow, background:isApplied?"#F0FBF4":isOverdue?"#FFF5F5":isDue?"#FFFBF0":"#fff", borderLeft:`3px solid ${isApplied?"#81B29A":isOverdue?"#E07A5F":isDue?"#C9A96E":"#EDE9E3"}`}}
                            onClick={()=>isApplied?unmarkApplied(member.id,v.key):markApplied(member.id,v.key)}>
                            <div style={{...S.checkbox, background:isApplied?"#81B29A":"#fff", border:`2px solid ${isApplied?"#81B29A":"#CCC"}`}}>
                              {isApplied&&<span style={{color:"#fff",fontSize:13,lineHeight:1}}>✓</span>}
                            </div>
                            <div style={{flex:1}}>
                              <span style={{fontSize:13,fontWeight:600,color:isApplied?"#5B8C5A":"#3D405B",textDecoration:isApplied?"line-through":"none"}}>{v.vaccine}</span>
                              <span style={{fontSize:11,color:"#aaa"}}> — {v.dosis}</span>
                              <div style={{fontSize:11,color:"#bbb"}}>{v.desc}</div>
                            </div>
                            {!isApplied&&v.days<=180&&(
                              <span style={{...S.badge,background:isOverdue?"#E07A5F":isDue?"#C9A96E":"#81B29A",fontSize:9}}>
                                {isOverdue?`${Math.abs(v.days)}d atrasada`:isDue?`en ${v.days}d`:``}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* ── VACUNAS EXTRA MANUALES ── */}
                <div style={{marginTop:20,paddingTop:16,borderTop:"2px solid #EDE9E3"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#3D405B"}}>💉 Vacunas extra</div>
                      <div style={{fontSize:11,color:"#aaa"}}>COVID, antigripal anual, refuerzos, viajes...</div>
                    </div>
                    <button style={{...S.addBtn,padding:"6px 14px",fontSize:12}} onClick={()=>setModal("customVac")}>+ Agregar</button>
                  </div>
                  {(data.customVaccines?.[member.id]||[]).length===0
                    ? <p style={{...S.empty,textAlign:"left",padding:"8px 0",fontSize:12}}>Sin vacunas extra cargadas.</p>
                    : (data.customVaccines?.[member.id]||[])
                        .sort((a,b)=>new Date(b.date)-new Date(a.date))
                        .map(v=>{
                          const nextDays = v.nextDate ? daysUntil(v.nextDate) : null;
                          const isOverdue = nextDays!==null && nextDays<0;
                          const isSoon = nextDays!==null && nextDays>=0 && nextDays<=30;
                          const boosterApplied = v.boosterDate; // date when booster was actually given
                          const showOverdue = isOverdue && !boosterApplied;
                          const showSoonFinal = isSoon && !boosterApplied;
                          return (
                            <div key={v.id} style={{background:"#fff",border:`1px solid ${showOverdue?"#F8BCBC":showSoonFinal?"#F2CC8F":"#EDE9E3"}`,borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"flex-start",gap:10}}>
                              <span style={{fontSize:20,flexShrink:0}}>💉</span>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:600,color:"#3D405B"}}>{v.name}</div>
                                <div style={{fontSize:11,color:"#888"}}>1ª dosis: {fmt(v.date)}</div>
                                {v.nextDate&&!boosterApplied&&(
                                  <div style={{fontSize:11,fontWeight:600,marginTop:2,color:showOverdue?"#E07A5F":showSoonFinal?"#C9A96E":"#5B8C5A"}}>
                                    {showOverdue?"⚠️ Refuerzo pendiente":"Refuerzo"}: {fmt(v.nextDate)}
                                    {nextDays===0?" — HOY":nextDays===1?" — MAÑANA":showOverdue?` (hace ${Math.abs(nextDays)} días)`:showSoonFinal?` — en ${nextDays} días`:""}
                                  </div>
                                )}
                                {boosterApplied&&(
                                  <div style={{fontSize:11,fontWeight:600,color:"#5B8C5A",marginTop:2}}>
                                    ✅ Refuerzo aplicado: {fmt(boosterApplied)}
                                  </div>
                                )}
                              </div>
                              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                                {v.nextDate&&!boosterApplied&&(
                                  <button style={{fontSize:10,background:"#E8F5EC",border:"1px solid #81B29A",color:"#3D6B54",borderRadius:12,padding:"3px 8px",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}
                                    onClick={()=>{
                                      const d = prompt("Fecha en que se aplicó el refuerzo (AAAA-MM-DD):", new Date().toISOString().split("T")[0]);
                                      if(d) saveCustomVaccine(member.id,{...v,boosterDate:d});
                                    }}>
                                    ✓ Refuerzo aplicado
                                  </button>
                                )}
                                <button style={{...S.iBtnSm,fontSize:12}} onClick={()=>{setEditItem(v);setModal("customVac");}}>✏️</button>
                                <button style={{...S.iBtnSm,color:"#E07A5F"}} onClick={()=>delCustomVaccine(member.id,v.id)}>🗑️</button>
                              </div>
                            </div>
                          );
                        })
                  }
                </div>
              </>;
            })()}

            {/* SALUD — Peso, talla, IMC, percentiles */}
            {memberTab==="crecimiento"&&(()=>{
              const isChild = member.birthdate && getAge(member.birthdate) < 18;
              const measurements = (data.measurements?.[member.id]||[]).sort((a,b)=>new Date(b.date)-new Date(a.date));
              const latest = measurements[0];
              const imc = latest ? calcIMC(latest.peso, latest.talla) : null;
              const imcInfo = imcLabel(imc);
              const ageMAtLatest = ageMonthsAt(member.birthdate, latest?.date);
              const pctInfo = (isChild && latest?.peso && ageMAtLatest>0) ?
                getPercentile(latest.peso, ageMAtLatest, member.sexo||"M") : null;
              return <>
                {/* Latest stats */}
                {latest && (
                  <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:100,background:"#fff",borderRadius:12,padding:"12px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.05)",textAlign:"center"}}>
                      <div style={{fontSize:22,fontWeight:700,color:"#3D405B"}}>{latest.peso}<span style={{fontSize:12}}> kg</span></div>
                      <div style={{fontSize:11,color:"#aaa"}}>Peso</div>
                    </div>
                    <div style={{flex:1,minWidth:100,background:"#fff",borderRadius:12,padding:"12px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.05)",textAlign:"center"}}>
                      <div style={{fontSize:22,fontWeight:700,color:"#3D405B"}}>{latest.talla}<span style={{fontSize:12}}> cm</span></div>
                      <div style={{fontSize:11,color:"#aaa"}}>Talla</div>
                    </div>
                    {imc && (
                      <div style={{flex:1,minWidth:100,background:imcInfo.color+"22",borderRadius:12,padding:"12px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.05)",textAlign:"center"}}>
                        <div style={{fontSize:22,fontWeight:700,color:imcInfo.color}}>{imc}</div>
                        <div style={{fontSize:11,color:imcInfo.color,fontWeight:600}}>{imcInfo.label}</div>
                        {!isChild&&<div style={{fontSize:9,color:"#aaa"}}>IMC</div>}
                      </div>
                    )}
                    {pctInfo && (
                      <div style={{flex:1,minWidth:100,background:pctInfo.color+"22",borderRadius:12,padding:"12px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.05)",textAlign:"center"}}>
                        <div style={{fontSize:16,fontWeight:700,color:pctInfo.color}}>{pctInfo.pct}</div>
                        <div style={{fontSize:11,color:pctInfo.color,fontWeight:600}}>{pctInfo.label}</div>
                        <div style={{fontSize:9,color:"#aaa"}}>Percentil peso</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Growth chart for children */}
                {isChild && measurements.length >= 2 && (
                  <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,.05)"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#3D405B",marginBottom:12}}>📈 Curva de crecimiento</div>
                    <div style={{overflowX:"auto"}}>
                      <svg viewBox={`0 0 400 200`} style={{width:"100%",minWidth:300,height:"auto"}}>
                        {/* Grid */}
                        {[0,25,50,75,100].map(y=>(
                          <g key={y}>
                            <line x1="40" y1={10+y*1.8} x2="390" y2={10+y*1.8} stroke="#f0ede8" strokeWidth="1"/>
                          </g>
                        ))}
                        {/* Y axis labels (peso kg) */}
                        {(()=>{
                          const weights = measurements.map(m=>parseFloat(m.peso)).filter(Boolean);
                          const minW = Math.max(0, Math.floor(Math.min(...weights)-2));
                          const maxW = Math.ceil(Math.max(...weights)+2);
                          const range = maxW-minW;
                          const sorted = [...measurements].filter(m=>m.peso&&m.talla).sort((a,b)=>new Date(a.date)-new Date(b.date));
                          if(sorted.length<2) return null;
                          const ages = sorted.map(m=>{
                            if(!m.date) return 0;
                            const [by,bm,bd]=member.birthdate.split("-").map(Number);
                            const [my,mm,md]=m.date.split("-").map(Number);
                            return (my-by)*12+(mm-bm)-(md<bd?1:0);
                          });
                          const minAge = Math.min(...ages); const maxAge = Math.max(...ages);
                          const ageRange = maxAge-minAge || 1;
                          const toX = age => 40 + ((age-minAge)/ageRange)*350;
                          const toY = w => 190 - ((parseFloat(w)-minW)/range)*180;
                          return (
                            <g>
                              {/* Peso line */}
                              <polyline
                                points={sorted.map((m,i)=>`${toX(ages[i])},${toY(m.peso)}`).join(" ")}
                                fill="none" stroke="#E07A5F" strokeWidth="2.5" strokeLinejoin="round"/>
                              {/* Talla line (scaled) */}
                              {sorted[0].talla&&(()=>{
                                const heights = sorted.map(m=>parseFloat(m.talla)).filter(Boolean);
                                const minH = Math.floor(Math.min(...heights)-5);
                                const maxH = Math.ceil(Math.max(...heights)+5);
                                const hRange = maxH-minH||1;
                                const toYh = h => 190 - ((parseFloat(h)-minH)/hRange)*180;
                                return (
                                  <polyline
                                    points={sorted.filter(m=>m.talla).map((m,i)=>`${toX(ages[i])},${toYh(m.talla)}`).join(" ")}
                                    fill="none" stroke="#4A90A4" strokeWidth="2.5" strokeDasharray="5,3" strokeLinejoin="round"/>
                                );
                              })()}
                              {/* Dots */}
                              {sorted.map((m,i)=>(
                                <circle key={i} cx={toX(ages[i])} cy={toY(m.peso)} r="4" fill="#E07A5F"/>
                              ))}
                              {/* Age labels */}
                              {sorted.map((m,i)=>(
                                <text key={i} x={toX(ages[i])} y="198" textAnchor="middle" fontSize="8" fill="#aaa">
                                  {ages[i]<24?`${ages[i]}m`:`${Math.round(ages[i]/12)}a`}
                                </text>
                              ))}
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                    <div style={{display:"flex",gap:16,marginTop:8,fontSize:11}}>
                      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:16,height:3,background:"#E07A5F",display:"inline-block",borderRadius:2}}/> Peso (kg)</span>
                      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:16,height:3,background:"#4A90A4",display:"inline-block",borderRadius:2,borderTop:"2px dashed #4A90A4"}}/> Talla (cm)</span>
                    </div>
                    <p style={{fontSize:10,color:"#bbb",marginTop:6}}>Cargá más mediciones para ver la evolución completa de la curva.</p>
                  </div>
                )}
                {isChild && measurements.length < 2 && measurements.length > 0 && (
                  <div style={{background:"#EEF7FF",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#2C5F8A"}}>
                    📈 Cargá al menos 2 mediciones para ver el gráfico de curva de crecimiento.
                  </div>
                )}

                {/* Add measurement button */}
                <div style={S.toolbar}>
                  <button style={S.addBtn} onClick={()=>setModal("measurement")}>+ Registrar medición</button>
                </div>

                {/* History */}
                {measurements.length===0
                  ?<p style={S.empty}>Sin mediciones registradas.</p>
                  :<div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {measurements.map((m,i)=>{
                      const ic = calcIMC(m.peso, m.talla);
                      const ii = imcLabel(ic);
                      const ageMHist = (()=>{
                        if(!member.birthdate||!m.date) return 0;
                        const [by,bm,bd]=member.birthdate.split("-").map(Number);
                        const [my,mm,md]=m.date.split("-").map(Number);
                        return (my-by)*12+(mm-bm)-(md<bd?1:0);
                      })();
                      const pc = (isChild&&m.peso&&ageMHist>0) ? getPercentile(m.peso, ageMHist, member.sexo||"M") : null;
                      return (
                        <div key={m.id||i} style={{background:"#fff",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 5px rgba(0,0,0,.05)"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:"#3D405B"}}>{fmt(m.date)}{m.ageLabel&&<span style={{fontSize:11,color:"#4A90A4",marginLeft:8}}>({m.ageLabel})</span>}</div>
                            <div style={{fontSize:12,color:"#888"}}>
                              {m.peso&&`${m.peso} kg`}{m.talla&&` · ${m.talla} cm`}
                              {ic&&<span style={{color:ii.color,marginLeft:6,fontWeight:600}}>IMC {ic} — {ii.label}</span>}
                              {pc&&<span style={{color:pc.color,marginLeft:6,fontWeight:600}}>{pc.pct}</span>}
                            </div>
                            {m.notes&&<div style={{fontSize:11,color:"#aaa",marginTop:2}}>{m.notes}</div>}
                          </div>
                          <button style={{...S.iBtnSm,color:"#E07A5F"}} onClick={()=>delMeasurement(member.id,m.id)}>🗑️</button>
                        </div>
                      );
                    })}
                  </div>
                }
              </>;
            })()}

            {/* ENFERMEDADES */}
            {memberTab==="enfermedades"&&<>
              <div style={S.toolbar}>
                <button style={S.addBtn} onClick={()=>{setEditItem({memberId:member.id,active:true});setModal("illness");}}>+ Registrar enfermedad</button>
              </div>
              {memberIllnesses.length===0?<p style={S.empty}>Sin enfermedades registradas.</p>
                :memberIllnesses.map(il=><IllnessCard key={il.id} il={il} onEdit={()=>{setEditItem(il);setModal("illness");}} onDelete={()=>delIllness(il.id)} onToggle={()=>toggleIllnessActive(il.id)}/>)}
            </>}

            {/* ANTECEDENTES FAMILIARES */}
            {memberTab==="antecedentes"&&(()=>{
              const ant = data.antecedentes?.[member.id] || {};
              const otherMembers = data.members.filter(m=>m.id!==member.id);
              const FAMILIARES = [
                { key:"madre",      label:"👩 Madre" },
                { key:"padre",      label:"👨 Padre" },
                { key:"hermanos",   label:"👦 Hermanos / Hermanas", multiple:true },
                { key:"abuelaMat",  label:"👵 Abuela materna" },
                { key:"abueloMat",  label:"👴 Abuelo materno" },
                { key:"tiosMat",    label:"🧑 Tíos / Tías maternos", multiple:true },
                { key:"abuelaPat",  label:"👵 Abuela paterna" },
                { key:"abueloPat",  label:"👴 Abuelo paterno" },
                { key:"tiosPat",    label:"🧑 Tíos / Tías paternos", multiple:true },
              ];
              return <>
                {/* Smart copy — with relationship mapping */}
                {otherMembers.length>0&&(
                  <SmartCopyPanel
                    currentMember={member}
                    otherMembers={otherMembers}
                    allAntecedentes={data.antecedentes||{}}
                    onCopy={(fromId, fieldMap)=>{
                      const fromAnt = data.antecedentes?.[fromId]||{};
                      const currentAnt = data.antecedentes?.[member.id]||{};
                      const merged = {...currentAnt};
                      Object.entries(fieldMap).forEach(([fromKey, toKey])=>{
                        if(fromAnt[fromKey]) merged[toKey] = fromAnt[fromKey];
                      });
                      saveAntecedentes(member.id, merged);
                    }}
                  />
                )}

                <p style={{fontSize:11,color:"#aaa",marginBottom:14}}>
                  Cargá los antecedentes médicos de cada familiar. Se guarda automáticamente al salir del campo.
                </p>

                {FAMILIARES.map((item)=>{
                  const {key,label} = item;
                  const datos = ant[key] || {};
                  return (
                    <AntecedentesCard
                      key={key}
                      label={label}
                      multiple={!!item.multiple}
                      datos={datos}
                      onSave={datos => saveAntecedentes(member.id, { ...ant, [key]: datos })}
                    />
                  );
                })}
              </>;
            })()}
          </div>
        )}
      </main>

      {/* MODALS */}
      {modal==="measurement"&&member&&<MeasurementModal
        member={member}
        onSave={m=>{ saveMeasurement(member.id,m); closeModal(); }}
        onClose={closeModal}/>}
      {modal==="customVac"&&member&&<CustomVaccineModal
        member={member}
        initial={editItem?.memberId?null:editItem}
        onSave={v=>{ saveCustomVaccine(member.id,v); closeModal(); }}
        onClose={closeModal}/>}
      {modal==="member"   &&<MemberModal   initial={editItem} onSave={saveMember}  onClose={closeModal}/>}
      {modal==="appt"     &&<ApptModal     initial={editItem} members={data.members} onSave={saveAppt} onClose={closeModal}/>}
      {modal==="consult"  &&<ConsultModal  initial={editItem} members={data.members} onSave={saveConsult} onClose={closeModal}/>}
      {modal==="illness"  &&<IllnessModal  initial={editItem} members={data.members} onSave={saveIllness} onClose={closeModal}/>}
      {pdfModal&&member&&<PDFExportModal
        member={member}
        consultations={data.consultations.filter(c=>c.memberId===member.id)}
        illnesses={(data.illnesses||[]).filter(il=>il.memberId===member.id)}
        appointments={data.appointments.filter(a=>a.memberId===member.id)}
        appliedVaccines={data.appliedVaccines?.[member.id]||[]}
        onClose={()=>setPdfModal(false)}
      />}
    </div>
  );
}

// ══════════════════════════════════════════
//  ILLNESS CARD
// ══════════════════════════════════════════
function IllnessCard({il, onEdit, onDelete, onToggle}) {
  const [open,setOpen]=useState(il.active||false);
  const daysSick = il.startDate ? Math.ceil((Date.now()-new Date(il.startDate).getTime())/86400000) : null;
  return (
    <div style={{...S.cCard,borderLeft:`4px solid ${il.active?"#E07A5F":"#ccc"}`}}>
      <div style={S.cHead} onClick={()=>setOpen(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
          <span style={{fontSize:20}}>{il.active?"🤒":"✅"}</span>
          <div>
            <div style={S.cTitle}>{il.name}</div>
            <div style={S.cMeta}>
              Desde {fmt(il.startDate)}{il.endDate?` · Hasta ${fmt(il.endDate)}`:""}
              {il.active&&daysSick&&<span style={{color:"#E07A5F",marginLeft:6}}>· Día {daysSick}</span>}
              {!il.active&&<span style={{color:"#81B29A",marginLeft:6}}>· Recuperado</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button style={S.iBtnSm} onClick={e=>{e.stopPropagation();onToggle();}} title={il.active?"Marcar como recuperado":"Reactivar"}>
            {il.active?"✅":"🔄"}
          </button>
          <button style={S.iBtnSm} onClick={e=>{e.stopPropagation();onEdit();}}>✏️</button>
          <button style={S.iBtnSm} onClick={e=>{e.stopPropagation();onDelete();}}>🗑️</button>
          <span style={{color:"#bbb",fontSize:11}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&(
        <div style={S.cBody}>
          {il.symptoms&&<F l="Síntomas" v={il.symptoms}/>}
          {il.treatment&&<F l="Tratamiento" v={il.treatment}/>}
          {il.doctor&&<F l="Médico" v={il.doctor}/>}
          {il.notes&&<F l="Notas" v={il.notes}/>}
          {il.medications?.length>0&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#3D405B",marginBottom:8}}>💊 Medicamentos y horarios</div>
              {il.medications.map((med,i)=>(
                <div key={i} style={S.medCard}>
                  <div style={S.medHeader}>
                    <span style={S.medName}>💊 {med.name}</span>
                    <span style={S.medDose}>{med.dose}</span>
                  </div>
                  <div style={S.medFreq}>🕐 {med.frequency}</div>
                  {med.times?.length>0&&(
                    <div style={S.medTimes}>
                      {med.times.map((t,ti)=>(
                        <span key={ti} style={S.medTimeTag}>⏰ {t}</span>
                      ))}
                    </div>
                  )}
                  {med.startDate&&<div style={S.medDate}>Desde {fmt(med.startDate)}{med.endDate?` hasta ${fmt(med.endDate)}`:""}</div>}
                  {med.notes&&<div style={{fontSize:11,color:"#aaa",marginTop:4}}>{med.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  ILLNESS MODAL
// ══════════════════════════════════════════
function IllnessModal({initial, members, onSave, onClose}) {
  const [f,setF]=useState({
    id:initial?.id||null,
    memberId:initial?.memberId||members[0]?.id,
    name:initial?.name||"",
    startDate:initial?.startDate||new Date().toISOString().split("T")[0],
    endDate:initial?.endDate||"",
    active:initial?.active!==undefined?initial.active:true,
    symptoms:initial?.symptoms||"",
    treatment:initial?.treatment||"",
    doctor:initial?.doctor||"",
    notes:initial?.notes||"",
    medications:initial?.medications||[],
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const [showMedForm,setShowMedForm]=useState(false);
  const [med,setMed]=useState({name:"",dose:"",frequency:FREQ_OPTIONS[2],times:[""],startDate:"",endDate:"",notes:""});
  const sm=(k,v)=>setMed(p=>({...p,[k]:v}));

  function addMed() {
    if(!med.name) return;
    const times=med.times.filter(t=>t.trim());
    s("medications",[...f.medications,{...med,times}]);
    setMed({name:"",dose:"",frequency:FREQ_OPTIONS[2],times:[""],startDate:"",endDate:"",notes:""});
    setShowMedForm(false);
  }
  function removeMed(i){s("medications",f.medications.filter((_,j)=>j!==i));}
  function addTime(){sm("times",[...med.times,""]);}
  function setTime(i,v){const t=[...med.times];t[i]=v;sm("times",t);}

  return (
    <Mdl title={f.id?"Editar enfermedad":"Registrar enfermedad"} onClose={onClose}>
      <Lb>Integrante</Lb>
      <select style={S.inp} value={f.memberId} onChange={e=>s("memberId",Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <Lb>Nombre / Diagnóstico</Lb>
      <input style={S.inp} value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Ej: Faringitis, Gripe, Otitis..."/>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Lb>Fecha de inicio</Lb><input type="date" style={S.inp} value={f.startDate} onChange={e=>s("startDate",e.target.value)}/></div>
        <div style={{flex:1}}><Lb>Fecha de alta (opcional)</Lb><input type="date" style={S.inp} value={f.endDate} onChange={e=>s("endDate",e.target.value)}/></div>
      </div>
      <Lb>Estado</Lb>
      <div style={{display:"flex",gap:8,marginBottom:4}}>
        {[[true,"🤒 Activa"],[false,"✅ Recuperado"]].map(([v,l])=>(
          <button key={String(v)} style={{flex:1,padding:9,border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,background:f.active===v?(v?"#FFE8E8":"#E8F5EC"):("#EDE9E3"),color:f.active===v?(v?"#C0392B":"#2E7D32"):"#3D405B"}} onClick={()=>s("active",v)}>{l}</button>
        ))}
      </div>
      <Lb>Síntomas</Lb>
      <textarea style={S.ta} rows={2} value={f.symptoms} onChange={e=>s("symptoms",e.target.value)} placeholder="Fiebre, dolor de garganta, tos..."/>
      <Lb>Tratamiento indicado</Lb>
      <textarea style={S.ta} rows={2} value={f.treatment} onChange={e=>s("treatment",e.target.value)} placeholder="Reposo, hidratación, antibióticos..."/>
      <Lb>Médico / Especialista</Lb>
      <input style={S.inp} value={f.doctor} onChange={e=>s("doctor",e.target.value)} placeholder="Ej: Dra. Rodríguez"/>
      <Lb>Notas adicionales</Lb>
      <textarea style={S.ta} rows={2} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Observaciones..."/>

      {/* Medicamentos */}
      <div style={{marginTop:14,marginBottom:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#3D405B"}}>💊 Medicamentos</span>
          {!showMedForm&&<button style={{...S.addBtn,padding:"5px 14px",fontSize:12}} onClick={()=>setShowMedForm(true)}>+ Agregar</button>}
        </div>

        {/* Existing meds */}
        {f.medications.map((m,i)=>(
          <div key={i} style={{...S.medCard,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <span style={S.medName}>💊 {m.name}</span> <span style={S.medDose}>{m.dose}</span>
                <div style={S.medFreq}>🕐 {m.frequency}</div>
                {m.times?.filter(t=>t).length>0&&<div style={S.medTimes}>{m.times.filter(t=>t).map((t,ti)=><span key={ti} style={S.medTimeTag}>⏰ {t}</span>)}</div>}
              </div>
              <button style={{...S.iBtnSm,color:"#E07A5F"}} onClick={()=>removeMed(i)}>🗑️</button>
            </div>
          </div>
        ))}

        {/* New med form */}
        {showMedForm&&(
          <div style={S.medFormBox}>
            <div style={{fontSize:12,fontWeight:700,color:"#3D405B",marginBottom:8}}>Nuevo medicamento</div>
            <Lb>Nombre del medicamento</Lb>
            <input style={S.inp} value={med.name} onChange={e=>sm("name",e.target.value)} placeholder="Ej: Ibuprofeno, Amoxicilina..."/>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><Lb>Dosis</Lb><input style={S.inp} value={med.dose} onChange={e=>sm("dose",e.target.value)} placeholder="Ej: 5ml, 250mg..."/></div>
              <div style={{flex:1}}>
                <Lb>Frecuencia</Lb>
                <select style={S.inp} value={med.frequency} onChange={e=>sm("frequency",e.target.value)}>
                  {FREQ_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <Lb>Horarios de toma</Lb>
            {med.times.map((t,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:5,alignItems:"center"}}>
                <input type="time" style={{...S.inp,flex:1,marginBottom:0}} value={t} onChange={e=>setTime(i,e.target.value)}/>
                {med.times.length>1&&<button style={{...S.iBtnSm,color:"#E07A5F"}} onClick={()=>sm("times",med.times.filter((_,j)=>j!==i))}>✕</button>}
              </div>
            ))}
            <button style={{fontSize:12,color:"#3D405B",background:"#EDE9E3",border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",marginBottom:8}} onClick={addTime}>+ Agregar horario</button>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><Lb>Inicio tratamiento</Lb><input type="date" style={S.inp} value={med.startDate} onChange={e=>sm("startDate",e.target.value)}/></div>
              <div style={{flex:1}}><Lb>Fin tratamiento</Lb><input type="date" style={S.inp} value={med.endDate} onChange={e=>sm("endDate",e.target.value)}/></div>
            </div>
            <Lb>Notas</Lb>
            <input style={S.inp} value={med.notes} onChange={e=>sm("notes",e.target.value)} placeholder="Ej: Tomar con comida, agitar antes de usar..."/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button style={{flex:1,padding:10,background:"#3D405B",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600}} onClick={addMed}>Agregar medicamento</button>
              <button style={{padding:10,background:"#EDE9E3",color:"#3D405B",border:"none",borderRadius:8,cursor:"pointer"}} onClick={()=>setShowMedForm(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <button style={S.saveBtn} onClick={()=>f.name&&onSave(f)}>Guardar</button>
    </Mdl>
  );
}

// ══════════════════════════════════════════
//  CONSULT CARD
// ══════════════════════════════════════════
function CCard({c, member, onEdit, onDelete}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={S.cCard}>
      <div style={S.cHead} onClick={()=>setOpen(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
          {member&&<span style={{fontSize:18}}>{member.avatar}</span>}
          <div>
            <span style={S.cTitle}>{c.specialist}</span>{c.specialty&&<span style={S.cSpec}> · {c.specialty}</span>}
            {c.reason&&<div style={{fontSize:11,color:"#C9A96E",fontWeight:600,marginTop:1}}>📋 {c.reason.length>55?c.reason.slice(0,55)+"…":c.reason}</div>}
            <div style={S.cMeta}>{fmt(c.date)}{member?` · ${member.name}`:""}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button style={S.iBtnSm} onClick={e=>{e.stopPropagation();onEdit();}}>✏️</button>
          <button style={S.iBtnSm} onClick={e=>{e.stopPropagation();onDelete();}}>🗑️</button>
          <span style={{color:"#bbb",fontSize:11}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&(
        <div style={S.cBody}>
          {c.reason&&<F l="Motivo de consulta" v={c.reason} color="#7D5A30"/>}
          {c.diagnosis&&<F l="Diagnóstico" v={c.diagnosis}/>}
          {c.medications&&<F l="Medicamentos" v={c.medications}/>}
          {c.nextSteps&&<F l="Indicaciones" v={c.nextSteps}/>}
          {c.nextAppointment&&<F l="Próximo turno" v={`${fmt(c.nextAppointment)}${c.nextAppointmentNote?` — ${c.nextAppointmentNote}`:""}`} color="#5B8C5A"/>}
          {c.notes&&<F l="Notas" v={c.notes}/>}
          {c.studies?.length>0&&(
            <div style={{marginTop:8}}>
              <div style={{fontSize:12,fontWeight:600,color:"#3D405B",marginBottom:6}}>Estudios realizados</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {c.studies.map((st,i)=>{
                  const isObj = typeof st==="object";
                  const name  = isObj ? st.name  : st;
                  const place = isObj ? st.place  : null;
                  const link  = isObj ? (st.driveLink||st.link||st.url) : null;
                  return (
                    <div key={i} style={{background:"#F5F3EF",border:"1px solid #EDE9E3",borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:18,flexShrink:0}}>🗂️</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"#3D405B"}}>{name}</div>
                        {place&&<div style={{fontSize:11,color:"#888"}}>📍 {place}</div>}
                        {link
                          ? <a href={link} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#4A90A4"}}>Abrir en Google Drive →</a>
                          : <span style={{fontSize:10,color:"#bbb"}}>Sin link adjunto</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
const F=({l,v,color})=><div style={{marginTop:8,fontSize:13,color:color||"#4a5568"}}><strong style={{color:"#3D405B"}}>{l}:</strong> {v}</div>;

// ══════════════════════════════════════════
//  MEMBER MODAL
// ══════════════════════════════════════════
function MemberModal({initial,onSave,onClose}) {
  const [f,setF]=useState({id:initial?.id||null,name:initial?.name||"",avatar:initial?.avatar||"👤",color:initial?.color||COLORS[0],birthdate:initial?.birthdate||"",photo:initial?.photo||"",bloodType:initial?.bloodType||"",allergies:initial?.allergies||"",sexo:initial?.sexo||"M",primeraMenstruacion:initial?.primeraMenstruacion||"",embarazos:initial?.embarazos||"",partosTermino:initial?.partosTermino||"",tipoParto:initial?.tipoParto||"",complicacionesEmbarazo:initial?.complicacionesEmbarazo||""});
  const [photoErr, setPhotoErr] = useState("");
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoErr("");
    // Resize to max 400px using canvas to keep it small
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      s("photo", dataUrl);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { setPhotoErr("No se pudo leer la imagen. Probá con otra."); URL.revokeObjectURL(url); };
    img.src = url;
  }

  return (
    <Mdl title={f.id?"Editar integrante":"Nuevo integrante"} onClose={onClose}>
      {/* Photo */}
      <Lb>Foto de perfil</Lb>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
        <div style={{width:76,height:76,borderRadius:38,overflow:"hidden",background:f.color+"22",border:`2px solid ${f.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {f.photo && f.photo!=="__HAS_PHOTO__"
            ? <img src={f.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <span style={{fontSize:36}}>{f.avatar}</span>
          }
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
          {/* Galería */}
          <label style={{display:"flex",alignItems:"center",gap:7,background:"#EDE9E3",color:"#3D405B",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            🖼️ Elegir de la galería
            <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
          </label>
          {/* Cámara */}
          <label style={{display:"flex",alignItems:"center",gap:7,background:"#EDE9E3",color:"#3D405B",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            📷 Tomar foto con cámara
            <input type="file" accept="image/*" capture="user" style={{display:"none"}} onChange={handlePhoto}/>
          </label>
          {f.photo&&f.photo!=="__HAS_PHOTO__"&&(
            <button style={{background:"#FFF0F0",border:"1px solid #F8BCBC",color:"#E07A5F",borderRadius:10,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:600,textAlign:"left"}} onClick={()=>s("photo","")}>✕ Quitar foto</button>
          )}
          {photoErr&&<div style={{fontSize:11,color:"#E07A5F"}}>{photoErr}</div>}
          {f.photo&&f.photo!=="__HAS_PHOTO__"&&<div style={{fontSize:10,color:"#81B29A"}}>✓ Foto cargada correctamente</div>}
        </div>
      </div>

      <Lb>Nombre</Lb>
      <input style={S.inp} value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Ej: Mamá, Lucía..."/>
      <Lb>Avatar (se usa si no hay foto)</Lb>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:4}}>
        {AVATARS.map(a=><button key={a} style={{width:40,height:40,fontSize:21,border:`2px solid ${f.avatar===a?f.color:"transparent"}`,borderRadius:9,cursor:"pointer",background:f.avatar===a?f.color+"33":"#f5f0eb"}} onClick={()=>s("avatar",a)}>{a}</button>)}
      </div>
      <Lb>Color</Lb>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:4}}>
        {COLORS.map(c=><button key={c} style={{width:26,height:26,borderRadius:13,border:"none",cursor:"pointer",background:c,outline:f.color===c?"3px solid #3D405B":"none"}} onClick={()=>s("color",c)}/>)}
      </div>
      <Lb>Fecha de nacimiento</Lb>
      <input type="date" style={S.inp} value={f.birthdate} onChange={e=>s("birthdate",e.target.value)}/>
      <Lb>Sexo biológico (para percentiles)</Lb>
      <div style={{display:"flex",gap:8,marginBottom:4}}>
        {[["M","👦 Masculino"],["F","👧 Femenino"]].map(([v,l])=>(
          <button key={v} style={{flex:1,padding:9,border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,
            background:f.sexo===v?f.color:"#EDE9E3",color:f.sexo===v?"#fff":"#3D405B"}}
            onClick={()=>s("sexo",v)}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}>
          <Lb>Grupo sanguíneo</Lb>
          <select style={S.inp} value={f.bloodType} onChange={e=>s("bloodType",e.target.value)}>
            <option value="">— No especificado —</option>
            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><Lb>Alergias conocidas</Lb><input style={S.inp} value={f.allergies} onChange={e=>s("allergies",e.target.value)} placeholder="Ej: Penicilina, Polen..."/></div>
      </div>
      {/* Datos ginecológicos — solo para mujeres */}
      {f.sexo==="F"&&<>
        <div style={{marginTop:12,marginBottom:4,paddingTop:12,borderTop:"1px solid #EDE9E3"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#3D405B",marginBottom:4}}>🌸 Datos ginecológicos</div>
        </div>
        <Lb>Fecha primera menstruación</Lb>
        <input type="date" style={S.inp} value={f.primeraMenstruacion||""} onChange={e=>s("primeraMenstruacion",e.target.value)}/>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><Lb>Cantidad de embarazos</Lb><input type="number" min="0" style={S.inp} value={f.embarazos||""} onChange={e=>s("embarazos",e.target.value)} placeholder="0"/></div>
          <div style={{flex:1}}><Lb>Partos a término</Lb><input type="number" min="0" style={S.inp} value={f.partosTermino||""} onChange={e=>s("partosTermino",e.target.value)} placeholder="0"/></div>
        </div>
        <Lb>Tipo de parto</Lb>
        <div style={{display:"flex",gap:8,marginBottom:4,flexWrap:"wrap"}}>
          {["Natural","Cesárea","Ambos","No aplica"].map(t=>(
            <button key={t} style={{padding:"7px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
              background:f.tipoParto===t?"#3D405B":"#EDE9E3",color:f.tipoParto===t?"#fff":"#3D405B"}}
              onClick={()=>s("tipoParto",t)}>{t}</button>
          ))}
        </div>
        <Lb>Complicaciones en embarazos</Lb>
        <textarea style={S.ta} rows={2} value={f.complicacionesEmbarazo||""} onChange={e=>s("complicacionesEmbarazo",e.target.value)}
          placeholder="Ej: Diabetes gestacional, preeclampsia, parto prematuro..."/>
      </>}

      <button style={S.saveBtn} onClick={()=>f.name&&onSave(f)}>Guardar</button>
    </Mdl>
  );
}

// ══════════════════════════════════════════
//  APPT MODAL
// ══════════════════════════════════════════
function ApptModal({initial,members,onSave,onClose}) {
  const [f,setF]=useState({id:initial?.id||null,memberId:initial?.memberId||members[0]?.id,title:initial?.title||"",specialist:initial?.specialist||"",date:initial?.date||"",time:initial?.time||"",location:initial?.location||"",notes:initial?.notes||"",type:initial?.type||"turno"});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <Mdl title={f.id?"Editar turno":"Nuevo turno / recordatorio"} onClose={onClose}>
      <Lb>Integrante</Lb>
      <select style={S.inp} value={f.memberId} onChange={e=>s("memberId",Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <Lb>Tipo</Lb>
      <div style={{display:"flex",gap:8,marginBottom:4}}>
        {[["turno","📅 Turno obtenido"],["recordatorio","🔔 Recordatorio"]].map(([t,l])=>(
          <button key={t} style={{flex:1,padding:9,border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,background:f.type===t?"#3D405B":"#EDE9E3",color:f.type===t?"#fff":"#3D405B"}} onClick={()=>s("type",t)}>{l}</button>
        ))}
      </div>
      <Lb>Título</Lb><input style={S.inp} value={f.title} onChange={e=>s("title",e.target.value)} placeholder="Ej: Control pediatra"/>
      <Lb>Médico / Especialista</Lb><input style={S.inp} value={f.specialist} onChange={e=>s("specialist",e.target.value)} placeholder="Ej: Dra. García - Pediatría"/>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Lb>Fecha</Lb><input type="date" style={S.inp} value={f.date} onChange={e=>s("date",e.target.value)}/></div>
        <div style={{flex:1}}><Lb>Hora</Lb><input type="time" style={S.inp} value={f.time} onChange={e=>s("time",e.target.value)}/></div>
      </div>
      <Lb>Lugar</Lb><input style={S.inp} value={f.location} onChange={e=>s("location",e.target.value)} placeholder="Ej: Centro Médico Norte"/>
      <Lb>Notas</Lb><textarea style={S.ta} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Información adicional..."/>
      <button style={S.saveBtn} onClick={()=>f.title&&f.date&&onSave(f)}>Guardar</button>
    </Mdl>
  );
}

// ══════════════════════════════════════════
//  CONSULT MODAL
// ══════════════════════════════════════════
function ConsultModal({initial,members,onSave,onClose}) {
  const [f,setF]=useState({
    id:initial?.id||null,
    memberId:initial?.memberId||members[0]?.id,
    date:initial?.date||new Date().toISOString().split("T")[0],
    specialist:initial?.specialist||"",
    specialty:initial?.specialty||"",
    reason:initial?.reason||"",
    diagnosis:initial?.diagnosis||"",
    medications:initial?.medications||"",
    nextSteps:initial?.nextSteps||"",
    notes:initial?.notes||"",
    studies:initial?.studies||[],   // [{name, url, type, thumb}]
    nextAppointment:initial?.nextAppointment||"",
    nextAppointmentNote:initial?.nextAppointmentNote||"",
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  // Study state
  const [stName,     setStName]     = useState("");
  const [stPlace,    setStPlace]    = useState("");
  const [stDriveLink,setStDriveLink]= useState("");
  const [stErr,      setStErr]      = useState("");

  function addStudy() {
    if (!stName.trim()) { setStErr("Ingresá un nombre para el estudio"); return; }
    s("studies", [...f.studies, {
      name:      stName.trim(),
      place:     stPlace.trim(),
      driveLink: stDriveLink.trim(),
      type:      stDriveLink ? "drive" : "link",
    }]);
    setStName(""); setStPlace(""); setStDriveLink(""); setStErr("");
  }

  function removeStudy(i) { s("studies", f.studies.filter((_,j)=>j!==i)); }

  return (
    <Mdl title={f.id?"Editar consulta":"Nueva consulta médica"} onClose={onClose}>
      <Lb>Integrante</Lb>
      <select style={S.inp} value={f.memberId} onChange={e=>s("memberId",Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Lb>Fecha</Lb><input type="date" style={S.inp} value={f.date} onChange={e=>s("date",e.target.value)}/></div>
        <div style={{flex:1}}><Lb>Especialidad</Lb><input style={S.inp} value={f.specialty} onChange={e=>s("specialty",e.target.value)} placeholder="Ej: Pediatría"/></div>
      </div>
      <Lb>Médico / Especialista</Lb>
      <input style={S.inp} value={f.specialist} onChange={e=>s("specialist",e.target.value)} placeholder="Ej: Dra. López"/>
      <Lb>Motivo de consulta</Lb>
      <textarea style={{...S.ta,background:"#FFFBF0",border:"1px solid #F2CC8F"}} rows={2} value={f.reason} onChange={e=>s("reason",e.target.value)} placeholder="¿Por qué se consulta? Ej: Fiebre de 3 días, control de rutina..."/>
      <Lb>Diagnóstico</Lb>
      <textarea style={S.ta} rows={2} value={f.diagnosis} onChange={e=>s("diagnosis",e.target.value)} placeholder="Diagnóstico..."/>
      <Lb>Medicamentos recetados</Lb>
      <textarea style={S.ta} rows={2} value={f.medications} onChange={e=>s("medications",e.target.value)} placeholder="Medicamentos, dosis, duración..."/>
      <Lb>Indicaciones / Próximos pasos</Lb>
      <textarea style={S.ta} rows={2} value={f.nextSteps} onChange={e=>s("nextSteps",e.target.value)} placeholder="Indicaciones del médico..."/>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Lb>Próximo turno</Lb><input type="date" style={S.inp} value={f.nextAppointment} onChange={e=>s("nextAppointment",e.target.value)}/></div>
        <div style={{flex:1}}><Lb>Nota del turno</Lb><input style={S.inp} value={f.nextAppointmentNote} onChange={e=>s("nextAppointmentNote",e.target.value)} placeholder="Ej: Llevar análisis"/></div>
      </div>
      <Lb>Notas adicionales</Lb>
      <textarea style={S.ta} rows={2} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Observaciones..."/>

      {/* ── ESTUDIOS ── */}
      <Lb>Estudios / Archivos</Lb>
      <div style={{background:"#F5F3EF",borderRadius:12,padding:12,marginBottom:8}}>
        <Lb>Nombre del estudio</Lb>
        <input style={S.inp} value={stName} onChange={e=>setStName(e.target.value)}
          placeholder="Ej: Hemograma, Rx de tórax, Eco abdominal..."/>
        <Lb>Lugar donde se realizó</Lb>
        <input style={S.inp} value={stPlace} onChange={e=>setStPlace(e.target.value)}
          placeholder="Ej: Hospital Italiano, Laboratorio Central, Diagnóstico Médico..."/>
        <Lb>Link de Google Drive</Lb>
        <div style={{background:"#EEF7FF",border:"1px solid #C3D8F5",borderRadius:8,padding:"8px 10px",marginBottom:8,fontSize:11,color:"#2C5F8A",lineHeight:1.6}}>
          En Drive: abrí el archivo → 3 puntitos ⋮ → <em>Obtener link</em> → <em>Cualquier persona con el link</em> → Copiar link
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <input style={{...S.inp,flex:1,marginBottom:0,background:stDriveLink?"#F0FBF4":"#fff",border:`1px solid ${stDriveLink?"#81B29A":"#EDE9E3"}`}}
            value={stDriveLink} onChange={e=>setStDriveLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."/>
          {stDriveLink&&<span style={{fontSize:18}}>✅</span>}
        </div>
        {stDriveLink&&<a href={stDriveLink} target="_blank" rel="noreferrer"
          style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#4A90A4",marginBottom:8,textDecoration:"none",background:"#EEF7FF",padding:"4px 10px",borderRadius:16,border:"1px solid #C3D8F5"}}>
          🔗 Probar link →
        </a>}
        {stErr&&<div style={{fontSize:11,color:"#E07A5F",marginBottom:8}}>⚠️ {stErr}</div>}
        <button style={{...S.addBtn,width:"100%",borderRadius:10,padding:11,opacity:stName.trim()?1:0.5}}
          onClick={addStudy} disabled={!stName.trim()}>+ Agregar estudio</button>
      </div>

      {/* Lista de estudios ya agregados */}
      {f.studies.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {f.studies.map((st,i)=>{
            const isObj = typeof st==="object";
            const name  = isObj ? st.name  : st;
            const place = isObj ? st.place  : null;
            const link  = isObj ? (st.driveLink||st.link||st.url) : null;
            return (
              <div key={i} style={{background:"#fff",border:"1px solid #EDE9E3",borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:8,background:"#E8F4FE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🗂️</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#3D405B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
                  {place&&<div style={{fontSize:11,color:"#888",marginTop:1}}>📍 {place}</div>}
                  {link
                    ? <a href={link} target="_blank" rel="noreferrer"
                        style={{fontSize:11,color:"#4A90A4",display:"inline-flex",alignItems:"center",gap:3,marginTop:2,textDecoration:"none"}}>
                        🗂️ Abrir en Google Drive
                      </a>
                    : <span style={{fontSize:10,color:"#aaa"}}>Sin link adjunto</span>
                  }
                </div>
                <button style={{...S.iBtnSm,color:"#E07A5F",flexShrink:0}} onClick={()=>removeStudy(i)}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      <button style={S.saveBtn} onClick={()=>f.specialist&&f.date&&onSave(f)}>Guardar consulta</button>
    </Mdl>
  );
}

// ── Shared Modal wrapper ──
function Mdl({title,children,onClose}) {
  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal}>
        <div style={S.mHd}><span style={S.mTitle}>{title}</span><button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa"}} onClick={onClose}>×</button></div>
        <div style={S.mBody}>{children}</div>
      </div>
    </div>
  );
}
const Lb=({children})=><label style={S.lbl}>{children}</label>;

// ══════════════════════════════════════════
//  MEASUREMENT MODAL
// ══════════════════════════════════════════
function MeasurementModal({ member, onSave, onClose }) {
  const isChild = member.birthdate && Math.floor((Date.now()-new Date(member.birthdate).getTime())/(86400000*365.25)) < 18;
  const [f, setF] = useState({ date: new Date().toISOString().split("T")[0], peso:"", talla:"", notes:"" });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const imc = f.peso&&f.talla ? calcIMC(f.peso,f.talla) : null;
  const imcInfo = imcLabel(imc);
  const ageAtMeas = member.birthdate && f.date ? (()=>{
    const [by,bm,bd] = member.birthdate.split("-").map(Number);
    const [my,mm,md] = f.date.split("-").map(Number);
    const months = (my-by)*12+(mm-bm)-(md<bd?1:0);
    if(months<0) return null;
    if(months<24) return `${months} meses`;
    const years=Math.floor(months/12); const rem=months%12;
    return rem>0?`${years} años ${rem} meses`:`${years} años`;
  })() : null;
  return (
    <Mdl title="Registrar medición" onClose={onClose}>
      <Lb>Fecha de la medición</Lb>
      <input type="date" style={S.inp} value={f.date} onChange={e=>s("date",e.target.value)}/>
      {ageAtMeas&&<div style={{background:"#EEF7FF",border:"1px solid #C3D8F5",borderRadius:8,padding:"6px 12px",marginBottom:6,fontSize:12,color:"#2C5F8A",fontWeight:600}}>📅 Edad en esta medición: {ageAtMeas}</div>}
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Lb>Peso (kg)</Lb><input type="number" step="0.1" style={S.inp} value={f.peso} onChange={e=>s("peso",e.target.value)} placeholder="Ej: 25.5"/></div>
        <div style={{flex:1}}><Lb>Talla (cm)</Lb><input type="number" step="0.1" style={S.inp} value={f.talla} onChange={e=>s("talla",e.target.value)} placeholder="Ej: 112"/></div>
      </div>
      {imc&&(
        <div style={{background:imcInfo.color+"22",border:`1px solid ${imcInfo.color}44`,borderRadius:10,padding:"10px 14px",marginTop:8,display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:24,fontWeight:700,color:imcInfo.color}}>{imc}</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:imcInfo.color}}>{imcInfo.label}</div>
            <div style={{fontSize:11,color:"#888"}}>{isChild?"IMC calculado — referencia OMS":"Índice de Masa Corporal"}</div>
          </div>
        </div>
      )}
      {isChild&&(
        <div style={{background:"#EEF7FF",borderRadius:10,padding:"8px 12px",marginTop:8,fontSize:11,color:"#2C5F8A",lineHeight:1.5}}>
          ℹ️ Para niños se calcula el percentil según las tablas OMS. El resultado se muestra en la pestaña de salud.
        </div>
      )}
      <Lb>Notas (opcional)</Lb>
      <input style={S.inp} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Ej: Control anual, post-vacuna..."/>
      <button style={S.saveBtn} onClick={()=>(f.peso||f.talla)&&onSave({...f,ageLabel:ageAtMeas||""})}>Guardar medición</button>
    </Mdl>
  );
}

// ══════════════════════════════════════════
//  CUSTOM VACCINE MODAL
// ══════════════════════════════════════════
function CustomVaccineModal({ member, initial, onSave, onClose }) {
  const [f, setF] = useState({
    id: initial?.id||null,
    name: initial?.name||"",
    date: initial?.date||new Date().toISOString().split("T")[0],
    needsBooster: initial?.needsBooster||false,
    nextDate: initial?.nextDate||"",
    boosterDate: initial?.boosterDate||"",
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <Mdl title="Agregar vacuna extra" onClose={onClose}>
      <div style={{background:"#F0F7FF",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#2C5F8A",lineHeight:1.5}}>
        Usá esta sección para vacunas que no están en el calendario oficial: COVID, antigripal anual, refuerzos indicados por el médico, vacunas de viaje, etc.
      </div>
      <Lb>Nombre de la vacuna</Lb>
      <input style={S.inp} value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Ej: COVID-19 (Pfizer), Antigripal 2025, Fiebre amarilla..."/>
      <Lb>Fecha de colocación</Lb>
      <input type="date" style={S.inp} value={f.date} onChange={e=>s("date",e.target.value)}/>
      <Lb>¿Necesita otra dosis?</Lb>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {[[true,"Sí"],[false,"No"]].map(([v,l])=>(
          <button key={String(v)} style={{flex:1,padding:10,border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,
            background:f.needsBooster===v?"#3D405B":"#EDE9E3",color:f.needsBooster===v?"#fff":"#3D405B"}}
            onClick={()=>s("needsBooster",v)}>{l}</button>
        ))}
      </div>
      {f.needsBooster&&<>
        <Lb>Fecha estimada de la próxima dosis</Lb>
        <input type="date" style={S.inp} value={f.nextDate} onChange={e=>s("nextDate",e.target.value)}/>
        <Lb>Fecha en que se aplicó el refuerzo (si ya se dio)</Lb>
        <input type="date" style={S.inp} value={f.boosterDate} onChange={e=>s("boosterDate",e.target.value)}
          placeholder="Dejá vacío si todavía no se aplicó"/>
        {f.boosterDate&&<div style={{fontSize:11,color:"#5B8C5A",marginBottom:4}}>✅ Refuerzo ya aplicado el {fmt(f.boosterDate)}</div>}
      </>}
      <button style={S.saveBtn} onClick={()=>f.name&&f.date&&onSave(f)}>Guardar vacuna</button>
    </Mdl>
  );
}

// ══════════════════════════════════════════
//  PDF EXPORT MODAL
// ══════════════════════════════════════════
function PDFExportModal({ member, consultations, illnesses, appointments, appliedVaccines, onClose }) {
  const [mode, setMode]         = useState("all");
  const [filterSpec, setFilterSpec] = useState("");
  const [filterId, setFilterId] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  // specialties present
  const specialties = [...new Set(consultations.map(c=>c.specialty||c.specialist).filter(Boolean))];

  async function doExport() {
    setLoading(true); setDone(false);
    try {
      const doc = await buildPDF({ member, consultations, illnesses, appointments, appliedVaccines, mode, filterSpec, filterId });
      const name = `${member.name.replace(/\s+/g,"_")}_${mode}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(name);
      setDone(true);
    } catch(e) {
      alert("Error al generar PDF: "+e.message);
    } finally { setLoading(false); }
  }

  const OPTIONS = [
    { id:"all",       icon:"📋", title:"Historia clínica completa",    desc:"Todo: consultas, turnos, enfermedades, vacunas y datos del paciente." },
    { id:"consultas", icon:"🩺", title:"Consultas médicas",            desc:"Todas las consultas, o filtradas por especialidad." },
    { id:"illness",   icon:"🤒", title:"Enfermedades y tratamientos",  desc:"Todos los episodios de enfermedad con medicamentos y horarios." },
    { id:"one_consult",icon:"📄",title:"Una consulta específica",      desc:"Elegí una consulta individual para exportar." },
    { id:"one_illness",icon:"💊",title:"Un tratamiento específico",    desc:"Elegí un episodio de enfermedad para exportar." },
  ];

  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...S.modal, maxHeight:"88vh"}}>
        <div style={S.mHd}>
          <div>
            <span style={S.mTitle}>📄 Exportar PDF</span>
            <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{member.avatar} {member.name}</div>
          </div>
          <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa"}} onClick={onClose}>×</button>
        </div>
        <div style={S.mBody}>
          <Lb>¿Qué querés exportar?</Lb>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16,marginTop:6}}>
            {OPTIONS.map(o=>(
              <div key={o.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",borderRadius:10,cursor:"pointer",border:`2px solid ${mode===o.id?"#3D405B":"#EDE9E3"}`,background:mode===o.id?"#F5F3EF":"#fff"}}
                onClick={()=>{setMode(o.id);setFilterSpec("");setFilterId(null);setDone(false);}}>
                <span style={{fontSize:22,flexShrink:0}}>{o.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#3D405B"}}>{o.title}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{o.desc}</div>
                </div>
                <div style={{marginLeft:"auto",width:18,height:18,borderRadius:9,border:`2px solid ${mode===o.id?"#3D405B":"#ccc"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {mode===o.id&&<div style={{width:8,height:8,borderRadius:4,background:"#3D405B"}}/>}
                </div>
              </div>
            ))}
          </div>

          {/* Filter by specialty */}
          {mode==="consultas"&&(
            <div style={{marginBottom:12}}>
              <Lb>Filtrar por especialidad (opcional)</Lb>
              <select style={S.inp} value={filterSpec} onChange={e=>{setFilterSpec(e.target.value);setDone(false);}}>
                <option value="">— Todas las especialidades —</option>
                {specialties.map(sp=><option key={sp} value={sp}>{sp}</option>)}
              </select>
            </div>
          )}

          {/* Pick single consult */}
          {mode==="one_consult"&&(
            <div style={{marginBottom:12}}>
              <Lb>Seleccioná la consulta</Lb>
              {consultations.length===0
                ?<p style={S.empty}>Sin consultas cargadas.</p>
                :<div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {consultations.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(c=>(
                    <div key={c.id} style={{padding:"9px 12px",borderRadius:8,cursor:"pointer",border:`2px solid ${filterId===c.id?"#3D405B":"#EDE9E3"}`,background:filterId===c.id?"#F5F3EF":"#fff",display:"flex",gap:10,alignItems:"center"}}
                      onClick={()=>{setFilterId(c.id);setDone(false);}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#3D405B"}}>{c.specialist}</div>
                        <div style={{fontSize:11,color:"#aaa"}}>{fmt(c.date)}{c.reason?` · ${c.reason.slice(0,40)}…`:""}</div>
                      </div>
                      {filterId===c.id&&<span style={{color:"#3D405B",fontSize:14}}>✓</span>}
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* Pick single illness */}
          {mode==="one_illness"&&(
            <div style={{marginBottom:12}}>
              <Lb>Seleccioná el episodio</Lb>
              {illnesses.length===0
                ?<p style={S.empty}>Sin enfermedades registradas.</p>
                :<div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {illnesses.sort((a,b)=>new Date(b.startDate)-new Date(a.startDate)).map(il=>(
                    <div key={il.id} style={{padding:"9px 12px",borderRadius:8,cursor:"pointer",border:`2px solid ${filterId===il.id?"#3D405B":"#EDE9E3"}`,background:filterId===il.id?"#F5F3EF":"#fff",display:"flex",gap:10,alignItems:"center"}}
                      onClick={()=>{setFilterId(il.id);setDone(false);}}>
                      <span style={{fontSize:18}}>{il.active?"🤒":"✅"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#3D405B"}}>{il.name}</div>
                        <div style={{fontSize:11,color:"#aaa"}}>Desde {fmt(il.startDate)}{il.endDate?` hasta ${fmt(il.endDate)}`:""}</div>
                      </div>
                      {filterId===il.id&&<span style={{color:"#3D405B",fontSize:14}}>✓</span>}
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* Export button */}
          <button
            style={{...S.saveBtn, background: done?"#5B8C5A":loading?"#aaa":"#3D405B", marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8}}
            onClick={doExport}
            disabled={loading || (mode==="one_consult"&&!filterId) || (mode==="one_illness"&&!filterId)}
          >
            {loading ? <>⏳ Generando PDF...</> : done ? <>✅ PDF descargado</> : <>📥 Descargar PDF</>}
          </button>
          {done&&<p style={{fontSize:11,color:"#5B8C5A",textAlign:"center",marginTop:8}}>El archivo se descargó en tu carpeta de descargas.</p>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  SMART COPY PANEL — cross-member relationship mapping
// ══════════════════════════════════════════
// All family keys for the copy panel
const ALL_FAM_KEYS = [
  {key:"madre",     label:"👩 Madre"},
  {key:"padre",     label:"👨 Padre"},
  {key:"hermanos",  label:"👦 Hermanos/as"},
  {key:"abuelaMat", label:"👵 Abuela materna"},
  {key:"abueloMat", label:"👴 Abuelo materno"},
  {key:"tiosMat",   label:"🧑 Tíos/as maternos"},
  {key:"abuelaPat", label:"👵 Abuela paterna"},
  {key:"abueloPat", label:"👴 Abuelo paterno"},
  {key:"tiosPat",   label:"🧑 Tíos/as paternos"},
];

const RELATIONSHIP_MAPS = [
  {
    label: "Copiar TODO (mismos antecedentes)",
    desc: "Para hermanos que comparten todos los familiares",
    map: Object.fromEntries(ALL_FAM_KEYS.map(f=>[f.key,f.key]))
  },
  {
    label: "Hijo → Padre (abuela mat. del hijo = madre del padre)",
    desc: "Abuela materna → Madre · Abuelo materno → Padre · Abuela paterna → Abuela mat. · Abuelo paterno → Abuelo mat.",
    map: {abuelaMat:"madre",abueloMat:"padre",abuelaPat:"abuelaMat",abueloPat:"abueloMat",tiosMat:"hermanos",tiosPat:"tiosMat"}
  },
  {
    label: "Hijo → Madre (abuela mat. del hijo = madre de la madre)",
    desc: "Abuela materna → Madre · Abuelo materno → Padre · Abuela paterna → Abuela pat. · Abuelo paterno → Abuelo pat.",
    map: {abuelaMat:"madre",abueloMat:"padre",abuelaPat:"abuelaPat",abueloPat:"abueloPat",tiosPat:"hermanos",tiosMat:"tiosPat"}
  },
  {
    label: "Copiar solo padres",
    desc: "Solo Madre y Padre",
    map: {madre:"madre",padre:"padre"}
  },
  {
    label: "Copiar solo abuelos maternos",
    desc: "Solo Abuela y Abuelo materno",
    map: {abuelaMat:"abuelaMat",abueloMat:"abueloMat"}
  },
  {
    label: "Copiar solo abuelos paternos",
    desc: "Solo Abuela y Abuelo paterno",
    map: {abuelaPat:"abuelaPat",abueloPat:"abueloPat"}
  },
];

function SmartCopyPanel({ currentMember, otherMembers, allAntecedentes, onCopy, setOpen: setOuterOpen }) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState(otherMembers[0]?.id||null);
  const [mapIdx, setMapIdx] = useState(0);

  return (
    <div style={{background:"#EEF7FF",border:"1px solid #C3D8F5",borderRadius:10,marginBottom:14}}>
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",cursor:"pointer",gap:8}} onClick={()=>setOpen(o=>!o)}>
        <span style={{fontSize:16}}>📋</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:"#2C5F8A"}}>Copiar antecedentes de otro integrante</div>
          <div style={{fontSize:11,color:"#888"}}>Con mapeo de relación familiar</div>
        </div>
        <span style={{fontSize:11,color:"#aaa"}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 14px 14px",borderTop:"1px solid #C3D8F5"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#aaa",marginTop:10,marginBottom:4,textTransform:"uppercase"}}>Copiar desde</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {otherMembers.map(m=>(
              <button key={m.id}
                style={{padding:"6px 12px",border:`2px solid ${fromId===m.id?"#3D405B":"#EDE9E3"}`,borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,background:fromId===m.id?"#3D405B":"#fff",color:fromId===m.id?"#fff":"#3D405B"}}
                onClick={()=>setFromId(m.id)}>
                {m.avatar} {m.name}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:"#aaa",marginBottom:4,textTransform:"uppercase"}}>Tipo de relación</div>
          {RELATIONSHIP_MAPS.map((rm,i)=>(
            <div key={i}
              style={{padding:"8px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,border:`1px solid ${mapIdx===i?"#3D405B":"#EDE9E3"}`,background:mapIdx===i?"#F5F3EF":"#fff"}}
              onClick={()=>setMapIdx(i)}>
              <div style={{fontSize:12,fontWeight:600,color:"#3D405B"}}>{rm.label}</div>
              <div style={{fontSize:11,color:"#888"}}>{rm.desc}</div>
            </div>
          ))}
          {/* Custom 1:1 per-field mapping */}
          <div style={{marginTop:8,padding:"8px 12px",borderRadius:8,border:`1px solid ${mapIdx===-1?"#3D405B":"#EDE9E3"}`,background:mapIdx===-1?"#F5F3EF":"#fff",cursor:"pointer"}}
            onClick={()=>setMapIdx(-1)}>
            <div style={{fontSize:12,fontWeight:600,color:"#3D405B"}}>✏️ Mapeo personalizado campo por campo</div>
            <div style={{fontSize:11,color:"#888"}}>Elegís qué campo de origen va a qué campo destino</div>
          </div>
          {mapIdx===-1&&<CustomFieldMapper fromId={fromId} currentMember={currentMember} allAntecedentes={allAntecedentes} onCopy={onCopy} setOpen={setOpen}/>}
          <button
            style={{width:"100%",marginTop:10,padding:"10px",background:"#3D405B",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}
            onClick={()=>{
              if(!fromId) return;
              const fromName = otherMembers.find(m=>m.id===fromId)?.name||"otro integrante";
              if(confirm(`¿Copiar antecedentes de ${fromName} a ${currentMember.name} usando la relación "${RELATIONSHIP_MAPS[mapIdx].label}"?`)){
                onCopy(fromId, RELATIONSHIP_MAPS[mapIdx].map);
                setOpen(false); // close inner expand
              }
            }}>
            Copiar ahora
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  CUSTOM FIELD MAPPER — 1:1 per field copy
// ══════════════════════════════════════════
function CustomFieldMapper({ fromId, currentMember, allAntecedentes, onCopy, setOpen }) {
  const fromAnt = allAntecedentes?.[fromId] || {};
  const [mapping, setMapping] = useState({});
  // Only show fields that have data in source
  const availableFrom = ALL_FAM_KEYS.filter(f => fromAnt[f.key]);

  if(!availableFrom.length) return (
    <div style={{padding:"8px 12px",fontSize:12,color:"#888"}}>El integrante seleccionado no tiene antecedentes cargados.</div>
  );

  return (
    <div style={{marginTop:8,background:"#FAF8F5",borderRadius:8,padding:"10px 12px"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#3D405B",marginBottom:8}}>
        Para cada campo del origen, elegí dónde copiarlo:
      </div>
      {availableFrom.map(({key,label})=>(
        <div key={key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <div style={{fontSize:12,color:"#3D405B",width:120,flexShrink:0}}>{label}</div>
          <span style={{color:"#aaa"}}>→</span>
          <select style={{flex:1,padding:"5px 8px",borderRadius:6,border:"1px solid #EDE9E3",fontSize:12,background:"#fff"}}
            value={mapping[key]||""}
            onChange={e=>setMapping(m=>({...m,[key]:e.target.value}))}>
            <option value="">— No copiar —</option>
            {ALL_FAM_KEYS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
      ))}
      <button style={{width:"100%",marginTop:8,padding:"9px",background:"#3D405B",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}
        onClick={()=>{
          const activeMap = Object.fromEntries(Object.entries(mapping).filter(([,v])=>v));
          if(!Object.keys(activeMap).length) { alert("Seleccioná al menos un campo a copiar"); return; }
          if(confirm(`¿Copiar ${Object.keys(activeMap).length} campos a ${currentMember.name}?`)){
            onCopy(fromId, activeMap);
            setOpen(false);
          }
        }}>
        Copiar campos seleccionados
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
//  ANTECEDENTES MULTIPLE — lista de personas
// ══════════════════════════════════════════
function AntecedentesMultiple({ label, datos, onSave }) {
  const [expanded, setExpanded] = useState(null); // index of expanded person

  function addPerson() {
    const updated = [...datos, { id:Date.now(), nombre:"", notas:"", condiciones:[] }];
    onSave(updated);
    setExpanded(updated.length-1);
  }
  function updatePerson(idx, personData) {
    const updated = datos.map((p,i) => i===idx ? {...p,...personData} : p);
    onSave(updated);
  }
  function delPerson(idx) {
    if(!confirm("¿Eliminar este familiar?")) return;
    onSave(datos.filter((_,i)=>i!==idx));
  }

  const inpStyle = {width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:8,border:"1px solid #EDE9E3",fontSize:13,outline:"none",fontFamily:"inherit"};
  const lblStyle = {display:"block",fontSize:11,fontWeight:600,color:"#aaa",marginTop:10,marginBottom:3,textTransform:"uppercase",letterSpacing:".5px"};

  return (
    <div style={{background:"#fff",borderRadius:12,marginBottom:8,boxShadow:"0 1px 5px rgba(0,0,0,.05)",overflow:"hidden"}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>{label.split(" ")[0]}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:"#3D405B"}}>{label.split(" ").slice(1).join(" ")}</div>
          <div style={{fontSize:11,color:"#888"}}>{datos.length>0?`${datos.length} persona${datos.length>1?"s":""}  cargada${datos.length>1?"s":""}` : "Sin datos cargados"}</div>
        </div>
        <button style={{background:"#3D405B",color:"#fff",border:"none",borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}} onClick={addPerson}>+ Agregar</button>
      </div>
      {datos.map((persona,idx)=>(
        <div key={persona.id||idx} style={{borderTop:"1px solid #f5f0eb"}}>
          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",cursor:"pointer",gap:8}} onClick={()=>setExpanded(expanded===idx?null:idx)}>
            <span style={{fontSize:14}}>👤</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#3D405B"}}>{persona.nombre||`${label.split(" ").slice(1).join(" ")} ${idx+1}`}</div>
              {(()=>{
                const c=persona.condiciones;
                const enf = Array.isArray(c)?c.map(x=>x.enfermedad||"").filter(Boolean).join(", "):(c?.enfermedades||"");
                return enf ? <div style={{fontSize:11,color:"#C9A96E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{enf}</div> : null;
              })()}
            </div>
            <button style={{background:"none",border:"none",color:"#E07A5F",cursor:"pointer",fontSize:12,marginRight:4}} onClick={e=>{e.stopPropagation();delPerson(idx);}}>✕</button>
            <span style={{color:"#bbb",fontSize:11}}>{expanded===idx?"▲":"▼"}</span>
          </div>
          {expanded===idx&&(
            <div style={{padding:"0 14px 14px"}}>
              <label style={lblStyle}>Nombre completo</label>
              <input style={inpStyle} value={persona.nombre||""} placeholder="Ej: Carlos García"
                onChange={e=>updatePerson(idx,{nombre:e.target.value})}/>
              <PersonCondiciones
                condiciones={persona.condiciones||[]}
                onUpdate={conds=>updatePerson(idx,{condiciones:conds})}
                inpStyle={inpStyle} lblStyle={lblStyle}/>
              <label style={lblStyle}>Notas</label>
              <textarea style={{...inpStyle,resize:"vertical"}} rows={2} value={persona.notas||""} placeholder="Observaciones..."
                onChange={e=>updatePerson(idx,{notas:e.target.value})}/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Shared conditions editor — single text box for diseases + optional meds
function PersonCondiciones({ condiciones, onUpdate, inpStyle, lblStyle }) {
  // Flatten existing condiciones into single text for backwards compat
  const existingText = Array.isArray(condiciones)
    ? condiciones.map(c=>c.enfermedad||"").filter(Boolean).join(", ")
    : (condiciones?.enfermedades||"");
  const existingMeds = Array.isArray(condiciones)
    ? condiciones.map(c=>c.medicamentos||"").filter(Boolean).join("; ")
    : (condiciones?.medicamentos||"");

  const [enf,    setEnf]    = useState(existingText);
  const [tomaMed,setTomaMed]= useState(existingMeds ? true : false);
  const [meds,   setMeds]   = useState(existingMeds);

  function save(e, t, m) {
    onUpdate({ enfermedades: e, tomaMedicacion: t, medicamentos: m });
  }

  return (
    <div style={{marginTop:10}}>
      <label style={lblStyle}>Enfermedades / diagnósticos</label>
      <textarea style={{...inpStyle,resize:"vertical"}} rows={3}
        value={enf}
        onChange={e=>setEnf(e.target.value)}
        onBlur={e=>save(e.target.value,tomaMed,meds)}
        placeholder="Ej: Diabetes tipo 2, hipertensión arterial, asma, colesterol alto..."/>
      <label style={lblStyle}>¿Toma medicación?</label>
      <div style={{display:"flex",gap:8,marginBottom:6}}>
        {[[true,"Sí"],[false,"No"]].map(([v,l])=>(
          <button key={String(v)} style={{flex:1,padding:"8px",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,
            background:tomaMed===v?"#3D405B":"#EDE9E3",color:tomaMed===v?"#fff":"#3D405B"}}
            onClick={()=>{setTomaMed(v);save(enf,v,meds);}}>
            {l}
          </button>
        ))}
      </div>
      {tomaMed&&<>
        <label style={lblStyle}>Medicamentos (nombre, dosis y cantidad por día)</label>
        <textarea style={{...inpStyle,resize:"vertical"}} rows={3}
          value={meds}
          onChange={e=>setMeds(e.target.value)}
          onBlur={e=>save(enf,tomaMed,e.target.value)}
          placeholder="Ej: Metformina 500mg 2 veces/día, Enalapril 10mg 1 vez/día..."/>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════
//  ANTECEDENTES CARD — múltiples enfermedades
// ══════════════════════════════════════════
function AntecedentesCard({ label, datos, onSave, multiple=false }) {
  // multiple=true: datos is array of people; multiple=false: single person object
  if(multiple) return <AntecedentesMultiple label={label} datos={Array.isArray(datos)?datos:[]} onSave={onSave}/>;
  const [open, setOpen] = useState(false);
  // datos = { nombre, notas, condiciones: [{id, enfermedad, medicamentos}] }
  const [nombre,    setNombre]    = useState(datos.nombre||"");
  const [notas,     setNotas]     = useState(datos.notas||"");
  const [condiciones, setCondiciones] = useState(datos.condiciones||[]);
  const hasData = nombre || condiciones.length > 0;

  function save(n, no, conds) {
    onSave({ nombre:n, notas:no, condiciones:conds });
  }
  
  
  
  
  const inpStyle = {width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:8,border:"1px solid #EDE9E3",fontSize:13,outline:"none",fontFamily:"inherit"};
  const lblStyle = {display:"block",fontSize:11,fontWeight:600,color:"#aaa",marginTop:10,marginBottom:3,textTransform:"uppercase",letterSpacing:".5px"};

  return (
    <div style={{background:"#fff",borderRadius:12,marginBottom:8,boxShadow:"0 1px 5px rgba(0,0,0,.05)",overflow:"hidden"}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",cursor:"pointer",gap:10}} onClick={()=>setOpen(o=>!o)}>
        <span style={{fontSize:20}}>{label.split(" ")[0]}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:"#3D405B"}}>{label.split(" ").slice(1).join(" ")}</div>
          {hasData&&!open&&(
            <div style={{fontSize:11,color:"#888",marginTop:2}}>
              {nombre&&<span>{nombre}</span>}
              {condiciones.length>0&&<span style={{marginLeft:nombre?6:0,color:"#C9A96E"}}>· {condiciones.length} condición{condiciones.length>1?"es":""}</span>}
            </div>
          )}
          {!hasData&&<div style={{fontSize:11,color:"#bbb"}}>Sin datos cargados</div>}
        </div>
        <span style={{color:"#bbb",fontSize:12}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 14px 14px",borderTop:"1px solid #f5f0eb"}}>
          <label style={lblStyle}>Nombre completo</label>
          <input style={inpStyle} value={nombre}
            onChange={e=>setNombre(e.target.value)}
            onBlur={e=>save(e.target.value, notas, condiciones)}
            placeholder="Ej: María González"/>

          <PersonCondiciones
            condiciones={condiciones}
            onUpdate={conds=>{setCondiciones(conds);save(nombre,notas,conds);}}
            inpStyle={inpStyle} lblStyle={lblStyle}/>

          <label style={lblStyle}>Notas adicionales</label>
          <textarea style={{...inpStyle,resize:"vertical"}} rows={2} value={notas}
            onChange={e=>setNotas(e.target.value)}
            onBlur={e=>save(nombre, e.target.value, condiciones)}
            placeholder="Ej: Falleció de infarto, antecedentes cardíacos..."/>
          <button style={{marginTop:10,background:"#3D405B",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",width:"100%"}}
            onClick={()=>{save(nombre,notas,condiciones);setOpen(false);}}>
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}

const S = {
  app:     {minHeight:"100vh",background:"#FAF8F5",fontFamily:"'DM Sans',sans-serif",color:"#3D405B"},
  header:  {background:"#fff",borderBottom:"1px solid #EDE9E3",position:"sticky",top:0,zIndex:100},
  hi:      {maxWidth:740,margin:"0 auto",padding:"12px 16px",display:"flex",alignItems:"center",gap:10},
  brand:   {display:"flex",alignItems:"center",gap:10,flex:1},
  brandName:{fontFamily:"'Lora',serif",fontSize:17,fontWeight:700,color:"#3D405B"},
  brandSub:{fontSize:10,color:"#aaa",letterSpacing:".3px"},
  back:    {background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#E07A5F",padding:"0 6px"},
  syncPill:{fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"},
  main:    {maxWidth:740,margin:"0 auto",padding:"20px 16px 80px"},
  sec:     {marginBottom:26},
  secRow:  {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},
  secT:    {fontFamily:"'Lora',serif",fontSize:16,fontWeight:700,color:"#3D405B",margin:0},
  addBtn:  {background:"#3D405B",color:"#fff",border:"none",borderRadius:20,padding:"7px 18px",fontSize:13,fontWeight:600,cursor:"pointer"},
  togRow:  {display:"flex",background:"#EDE9E3",borderRadius:20,padding:3,gap:2},
  tog:     {background:"none",border:"none",padding:"4px 12px",borderRadius:16,cursor:"pointer",fontSize:12,color:"#888"},
  togA:    {background:"#fff",border:"none",padding:"4px 12px",borderRadius:16,cursor:"pointer",fontSize:12,fontWeight:600,color:"#3D405B",boxShadow:"0 1px 4px rgba(0,0,0,.08)"},
  empty:   {color:"#bbb",textAlign:"center",padding:"24px 0",fontSize:13},
  badge:   {color:"#fff",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap"},
  srch:    {width:"100%",boxSizing:"border-box",padding:"10px 14px",borderRadius:10,border:"1px solid #EDE9E3",fontSize:14,background:"#fff",outline:"none",marginBottom:12},
  toolbar: {display:"flex",gap:10,alignItems:"center",marginBottom:14},
  alertBox:{background:"#FFF7ED",border:"1px solid #F2CC8F",borderRadius:12,padding:14,marginBottom:16},
  alertHd: {fontWeight:700,fontSize:14,color:"#7D5A30",marginBottom:10},
  alertRow:{display:"flex",alignItems:"center",gap:10,marginBottom:8},
  remCard: {background:"#fff",borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 5px rgba(0,0,0,.05)"},
  remTitle:{fontSize:14,fontWeight:600,color:"#3D405B"},
  remMeta: {fontSize:12,color:"#aaa"},
  calNav:  {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},
  calBtn:  {background:"none",border:"1px solid #EDE9E3",borderRadius:8,padding:"4px 14px",cursor:"pointer",fontSize:16,color:"#3D405B"},
  calTitle:{fontFamily:"'Lora',serif",fontWeight:600,fontSize:15,color:"#3D405B"},
  calGrid: {display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3},
  calHead: {textAlign:"center",fontSize:9,fontWeight:600,color:"#bbb",padding:"4px 0",textTransform:"uppercase"},
  calCell: {minHeight:62,borderRadius:6,padding:4,display:"flex",flexDirection:"column",gap:2},
  calDay:  {fontSize:11,marginBottom:1},
  calEv:   {padding:"1px 3px",borderRadius:4,fontSize:8,display:"flex",alignItems:"center",gap:2,overflow:"hidden"},
  mGrid:   {display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(138px,1fr))",gap:10},
  mCard:   {background:"#fff",borderRadius:12,padding:14,textAlign:"center",cursor:"pointer",boxShadow:"0 1px 5px rgba(0,0,0,.05)"},
  mAvatar: {width:52,height:52,borderRadius:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 8px"},
  mName:   {fontWeight:700,fontSize:14,color:"#3D405B"},
  mAge:    {fontSize:12,color:"#bbb",marginBottom:6},
  mStats:  {display:"flex",justifyContent:"center",gap:8,fontSize:11,color:"#999"},
  hero:    {borderRadius:14,padding:"18px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:20},
  heroAv:  {width:64,height:64,borderRadius:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32},
  heroName:{fontFamily:"'Lora',serif",fontSize:22,margin:0,color:"#3D405B"},
  heroSub: {margin:"4px 0 0",fontSize:12,color:"#aaa"},
  iBtn:    {background:"none",border:"none",fontSize:18,cursor:"pointer",padding:4},
  iBtnSm:  {background:"none",border:"none",fontSize:14,cursor:"pointer",padding:2},
  tabs:    {display:"grid",gridTemplateColumns:"repeat(6,1fr)",background:"#EDE9E3",borderRadius:10,padding:3,gap:2,marginBottom:16},
  tabI:    {background:"none",border:"none",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:11,color:"#999",textAlign:"center"},
  tabA:    {background:"#fff",border:"none",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,color:"#3D405B",boxShadow:"0 1px 4px rgba(0,0,0,.08)",textAlign:"center"},
  apptCard:{background:"#fff",borderRadius:10,marginBottom:8,padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10,boxShadow:"0 1px 5px rgba(0,0,0,.05)"},
  apptDot: {width:10,height:10,borderRadius:5,marginTop:4,flexShrink:0},
  apptTitle:{fontSize:14,fontWeight:600,color:"#3D405B"},
  apptMeta:{fontSize:12,color:"#999",margin:"2px 0"},
  apptDate:{fontSize:12,color:"#bbb",display:"flex",alignItems:"center"},
  apptNote:{fontSize:12,color:"#bbb",marginTop:4,fontStyle:"italic"},
  cCard:   {background:"#fff",borderRadius:10,marginBottom:8,boxShadow:"0 1px 5px rgba(0,0,0,.05)"},
  cHead:   {padding:"12px 14px",display:"flex",alignItems:"center",cursor:"pointer"},
  cTitle:  {fontSize:14,fontWeight:600,color:"#3D405B"},
  cSpec:   {fontWeight:400,color:"#aaa",fontSize:13},
  cMeta:   {fontSize:12,color:"#bbb"},
  cBody:   {padding:"0 14px 14px",borderTop:"1px solid #f5f0eb"},
  stTag:   {background:"#EEF5FF",color:"#3D6E9E",padding:"3px 10px",borderRadius:20,fontSize:12,display:"flex",alignItems:"center",gap:4},
  attachBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#EDE9E3",color:"#3D405B",borderRadius:10,padding:"9px 10px",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center",border:"none"},
  // Vaccines
  vacProgress:{background:"#fff",borderRadius:12,padding:14,marginBottom:12,boxShadow:"0 1px 5px rgba(0,0,0,.05)"},
  progressBar:{height:8,background:"#EDE9E3",borderRadius:4,overflow:"hidden"},
  progressFill:{height:"100%",borderRadius:4,transition:"width .4s"},
  quickBtn:{background:"#F0FBF4",color:"#3D6B54",border:"1px solid #81B29A",borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"},
  vacGroup:{marginBottom:14},
  vacGroupLabel:{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:".8px",padding:"6px 0 4px"},
  vacCheckRow:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,marginBottom:4,cursor:"pointer"},
  checkbox:{width:22,height:22,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  allGood: {background:"#E8F5EC",borderRadius:10,padding:16,textAlign:"center",fontSize:14,color:"#3D6B54",fontWeight:600},
  // Illness
  medCard: {background:"#FAF8F5",border:"1px solid #EDE9E3",borderRadius:10,padding:"10px 12px",marginBottom:6},
  medFormBox:{background:"#F5F3EF",borderRadius:12,padding:14,marginBottom:8,border:"1px solid #EDE9E3"},
  medHeader:{display:"flex",alignItems:"center",gap:8,marginBottom:4},
  medName: {fontSize:13,fontWeight:700,color:"#3D405B"},
  medDose: {fontSize:12,color:"#888",background:"#EDE9E3",padding:"2px 8px",borderRadius:10},
  medFreq: {fontSize:12,color:"#888",marginBottom:4},
  medTimes:{display:"flex",flexWrap:"wrap",gap:5,marginBottom:4},
  medTimeTag:{background:"#EEF5FF",color:"#3D6E9E",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600},
  medDate: {fontSize:11,color:"#bbb"},
  // Modal
  overlay: {position:"fixed",inset:0,background:"rgba(61,64,91,.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"},
  modal:   {background:"#FAF8F5",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:580,maxHeight:"93vh",display:"flex",flexDirection:"column"},
  mHd:     {padding:"16px 20px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #EDE9E3"},
  mTitle:  {fontFamily:"'Lora',serif",fontSize:16,fontWeight:700,color:"#3D405B"},
  mBody:   {padding:"14px 20px 36px",overflowY:"auto"},
  lbl:     {display:"block",fontSize:11,fontWeight:600,color:"#aaa",marginTop:12,marginBottom:3,textTransform:"uppercase",letterSpacing:".5px"},
  inp:     {width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:"1px solid #EDE9E3",fontSize:14,background:"#fff",outline:"none",marginBottom:2},
  ta:      {width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:"1px solid #EDE9E3",fontSize:14,background:"#fff",outline:"none",resize:"vertical",marginBottom:2},
  saveBtn: {width:"100%",marginTop:18,padding:14,background:"#3D405B",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Lora',serif"},
};
