import { supabase, requirePermanentUser } from './supabase.js';
import { getMediaUrl, formatDate } from './shared.js';

const TABLES=['site_content','proposal_global_state','memories','chapters','plans','capsules','events','profiles','achievements','couple_questions','question_answers','memory_comments','memory_reactions'];

export async function exportBackup(){
  await requirePermanentUser();
  const out={exported_at:new Date().toISOString(),version:'4.0'};
  for(const table of TABLES){ const {data,error}=await supabase.from(table).select('*'); if(!error)out[table]=data; }
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`david-madeline-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
}

export async function createBookPdf(){
  await requirePermanentUser();
  const [{data:chapters},{data:memories},{data:contentRows}]=await Promise.all([
    supabase.from('chapters').select('*').is('deleted_at',null).order('chapter_number'),
    supabase.from('memories').select('*').is('deleted_at',null).eq('visibility','public').order('memory_date'),
    supabase.from('site_content').select('*')
  ]);
  const { jsPDF }=await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm');
  const doc=new jsPDF({unit:'pt',format:'a4'}); const pageW=595,pageH=842,margin=52; let y=70;
  const addPage=()=>{doc.addPage();y=70;}; const ensure=h=>{if(y+h>pageH-60)addPage();};
  doc.setFont('helvetica','bold');doc.setFontSize(28);doc.text('David & Madeline',pageW/2,y,{align:'center'});y+=38;doc.setFontSize(13);doc.setFont('helvetica','normal');doc.text('Nuestro libro de recuerdos',pageW/2,y,{align:'center'});y+=55;
  const letter=Object.fromEntries((contentRows||[]).map(r=>[r.key,r.value])).letter;
  if(letter?.body){doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(letter.title||'Nuestra carta',margin,y);y+=28;doc.setFont('helvetica','normal');doc.setFontSize(11);const lines=doc.splitTextToSize(letter.body,pageW-margin*2);doc.text(lines,margin,y);y+=lines.length*15+30;}
  for(const ch of chapters||[]){ensure(110);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(`Capítulo ${ch.chapter_number}: ${ch.title}`,margin,y);y+=22;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(formatDate(ch.chapter_date),margin,y);y+=18;const lines=doc.splitTextToSize(ch.body||'',pageW-margin*2);ensure(lines.length*14+30);doc.text(lines,margin,y);y+=lines.length*14+28;}
  const picks=(memories||[]).slice(0,24);
  for(const m of picks){ensure(175);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(m.title||'Recuerdo',margin,y);y+=18;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`${formatDate(m.memory_date)}${m.place?' · '+m.place:''}`,margin,y);y+=15;
    if(m.media_type==='image'){
      try{const url=await getMediaUrl(m);const res=await fetch(url);const blob=await res.blob();const dataUrl=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)});doc.addImage(dataUrl,'JPEG',margin,y,160,110,undefined,'FAST');doc.setFontSize(10);const lines=doc.splitTextToSize(m.description||'',pageW-margin*2-180);doc.text(lines,margin+180,y+10);y+=125;}catch{const lines=doc.splitTextToSize(m.description||'',pageW-margin*2);doc.text(lines,margin,y);y+=lines.length*14+20;}
    } else {const lines=doc.splitTextToSize(m.description||'',pageW-margin*2);doc.text(lines,margin,y);y+=lines.length*14+20;}
  }
  doc.save(`David-y-Madeline-nuestro-libro-${new Date().toISOString().slice(0,10)}.pdf`);
}
