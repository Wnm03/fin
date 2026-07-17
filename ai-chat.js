// ai-chat.js — Chat AI (RefAI): UI edit aksi chat, kirim pesan ke provider AI (sendChat/
// callAIProviderRaw), Advisor (rule-based tips) & AIWidget (widget rekomendasi AI generik dipakai
// modul lain). Dipisah dari features-aiwidget-reminder-gdrive-search.js (Sesi 4 restrukturisasi
// folder, blok 1 — lihat AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan ulang file, BUKAN
// perubahan perilaku. PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) —
// cek scripts/build.js untuk urutan lengkap terkini.

function chatActionEditFormHTML(actionId,type,data){
const fields=CHAT_ACTION_EDIT_FIELDS[type]||[];
const rows=fields.map(f=>{
const val=data[f.key]!=null?data[f.key]:'';
const id=`chatActionEdit_${actionId}_${f.key}`;
if(f.type==='select'){
const opts=typeof f.options==='function'?f.options():f.options;
return `<div class="fg u-mb6"><label class="fl u-fs11">${escapeHtml(f.label)}</label><select class="fi" id="${id}">${opts.map(([v,l])=>`<option value="${escapeHtml(String(v))}" ${sameId(v,val)?'selected':''}>${escapeHtml(l)}</option>`).join('')}</select></div>`;
}
return `<div class="fg u-mb6"><label class="fl u-fs11">${escapeHtml(f.label)}</label><input class="fi" id="${id}" type="${f.type}" value="${escapeHtml(String(val))}"></div>`;
}).join('');
return `<div class="u-fw700 u-mb6">✏️ Edit ${CHAT_ACTION_LABELS[type]||''}</div>
    ${rows}
    <div class="u-flex u-gap8 u-mt4">
      <button class="btn btn-primary btn-sm" data-action="saveChatActionEdit" data-args="${escapeHtml(JSON.stringify([actionId]))}">💾 Simpan Perubahan</button>
      <button class="btn btn-ghost btn-sm" data-action="cancelChatActionEdit" data-args="${escapeHtml(JSON.stringify([actionId]))}">↩️ Batal Edit</button>
    </div>`;
}
function editChatAction(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
el.innerHTML=chatActionEditFormHTML(actionId,pending.type,pending.data);
}
function saveChatActionEdit(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
const fields=CHAT_ACTION_EDIT_FIELDS[pending.type]||[];
const newData={...pending.data};
fields.forEach(f=>{
const inputEl=document.getElementById(`chatActionEdit_${actionId}_${f.key}`);
if(!inputEl)return;
let v=inputEl.value;
if(f.type==='number')v=(v===''?undefined:Number(v));
newData[f.key]=v;
});
pending.data=newData;
el.innerHTML=chatActionInnerHTML(actionId,pending.type,newData);
}
function cancelChatActionEdit(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
el.innerHTML=chatActionInnerHTML(actionId,pending.type,pending.data);
}
function confirmChatAction(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
try{
const msg=CHAT_ACTION_HANDLERS[pending.type](pending.data);
el.innerHTML=`<div class="u-fw700">✅ Tersimpan</div><div class="u-fs13 u-t2">${escapeHtml(msg)}</div>`;
toast('✅ Tersimpan dari chat AI');
}catch(e){
el.innerHTML=`<div class="u-fw700" style="color:#ff5050">⚠️ Gagal: ${escapeHtml(e.message||'Terjadi kesalahan')}</div>`;
}
delete _pendingChatActions[actionId];
}
function cancelChatAction(actionId){
const el=document.getElementById('chatAction_'+actionId);
if(el)el.innerHTML='<div class="u-t2">❌ Dibatalkan</div>';
delete _pendingChatActions[actionId];
}
function initChat(){
if(chatInited)return;chatInited=true;
let html='<div class="chat-bubble ai">Halo W! 👋 Saya AI asisten pribadi Anda. Saya sudah baca semua data: keuangan, perkembangan anak, kendaraan (KM, BBM, servis), absensi/gaji, dan bisnis shop. Tanya apa saja!</div>';
try{
const reminders=getProactiveReminders();
if(reminders.length){
const list=reminders.map(r=>`• ${escapeHtml(r)}`).join('<br>');
html+=`<div class="chat-bubble ai">📋 <b>Sebelum lanjut, ada yang perlu diperhatikan nih:</b><br>${list}</div>`;
}
}catch(e){console.error('Gagal cek reminder proaktif:',e);}
document.getElementById('chatBox').innerHTML=html;
}
function aiQ(q){document.getElementById('chatInput').value=q;sendChat();}
async function sendChat(){
if(_saveGuards['chat'])return;
const btn=document.getElementById('chatSendBtn');
_saveGuards['chat']=true;
if(btn){btn.disabled=true;btn.style.opacity='0.5';}
try{
await _sendChatInner();
} finally {
_saveGuards['chat']=false;
if(btn){btn.disabled=false;btn.style.opacity='';}
}
}
async function _sendChatInner(){
const input=document.getElementById('chatInput');
const msg=input.value.trim();if(!msg)return;
input.value='';
const box=document.getElementById('chatBox');
box.innerHTML+=`<div class="chat-bubble user">${escapeHtml(msg)}</div>`;
const loading=document.createElement('div');loading.className='chat-bubble ai';loading.textContent='⏳ Menganalisa data Anda...';box.appendChild(loading);box.scrollTop=box.scrollHeight;
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const inc=txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const shopTotal=D.cobek.reduce((s,t)=>s+t.profit,0);
const targetInfo=D.targets.map(t=>`${escapeHtml(t.name)}: ${Math.round((t.saved/t.amount)*100)}%`).join(', ')||'Belum ada';
const eduFundInfo=(D.eduFunds||[]).map(f=>{const c=EduFund.calc(f);const pct=c.fv>0?Math.round((c.terkumpul/c.fv)*100):0;return `${escapeHtml(f.name)} (target ${f.tahunTarget}): butuh ${fmtFull(c.fv)}, terkumpul ${pct}%, nabung ~${fmtFull(c.pmtBulanan)}/bln`;}).join('; ')||'Belum ada';
const sewaKiosInfo=((D.sewaKios&&D.sewaKios.units)||[]).map(u=>`${escapeHtml(u.name)}: ${u.status==='disewa'?'disewa oleh '+(u.penyewa||'-')+' @'+fmtFull(u.hargaSewaBulanan||0)+'/bln':'kosong'}`).join('; ')||'Belum ada unit';
const renovInfo=(D.renovProjects||[]).map(p=>{const items=p.items||[];const total=items.reduce((s,i)=>s+(i.harga||0),0);const paid=items.filter(i=>i.paid).reduce((s,i)=>s+(i.harga||0),0);return `${escapeHtml(p.name)}: ${fmtFull(paid)}/${fmtFull(total)} terbayar (${items.length} item)`;}).join('; ')||'Belum ada proyek';
const debtInfo=(D.debts||[]).filter(d=>!d.lunas).map(d=>`${escapeHtml(d.name)}: ${fmtFull(d.nilai)}${d.jatuhTempo?', JT '+d.jatuhTempo:''}`).join('; ')||'Tidak ada utang aktif';
const piutangInfo=(D.piutang||[]).filter(p=>!p.lunas).map(p=>`${escapeHtml(p.name)}: ${fmtFull(p.nilai)}`).join('; ')||'Tidak ada piutang aktif';
const pensiunInfo=D.pensiun&&D.pensiun.aktif?`Target ${fmtFull(D.pensiun.targetDana||0)} di usia ${D.pensiun.usiaPensiun}, kontribusi ${fmtFull(D.pensiun.kontribusiBulanan||0)}/bln`:'Belum diatur';
const billInfo=D.bills.map(b=>`${escapeHtml(b.name)} (${b.kind}): ${fmtFull(b.amount)}, jatuh tempo ${b.nextDue}`).join('; ')||'Tidak ada';
const accInfo=D.accounts.map(a=>`${escapeHtml(a.name)}: ${fmtFull(recalcAccBalance(a.id))}`).join(', ');
const katMap={};
D.transactions.filter(t=>new Date(t.date)>=new Date(y,m-2,1)).forEach(t=>{if(!katMap[t.category])katMap[t.category]={inc:0,exp:0};if(t.type==='income')katMap[t.category].inc+=t.amount;else katMap[t.category].exp+=t.amount;});
const anakInfo=D.catatan.anak.slice(-3).map(c=>c.text||c.note||JSON.stringify(c)).join('; ')||'Belum ada catatan';
const msDone=D.milestones.filter(Boolean).length;
const msgLower=msg.toLowerCase();
const mentionsAny=(...kws)=>kws.some(k=>msgLower.includes(k));
const wantVehicleDetail=mentionsAny('motor','mobil','kendaraan','stnk','bbm','bensin','servis','oli','ban','plat','sim ','pajak kendaraan','uji kelayakan','bengkel','km ','kilometer',...D.vehicles.map(v=>v.name.toLowerCase()));
const vehicleInfoFull=D.vehicles.map(v=>{
const curKm=getVehicleKm(v.id);
const bbmV=[...D.bbmLogs.filter(b=>b.vehicleId===v.id)].sort((a,b)=>new Date(a.date)-new Date(b.date));
const totalBbmCost=bbmV.reduce((s,b)=>s+b.cost,0);
const totalLiter=bbmV.reduce((s,b)=>s+(b.liter||0),0);
const fullFills=bbmV.filter(b=>b.fullTank&&b.km);
let avgKmL=null;
if(fullFills.length>=2){
const pairs=[];for(let i=1;i<fullFills.length;i++){const kmDiff=fullFills[i].km-fullFills[i-1].km;const lit=fullFills[i].liter;if(kmDiff>0&&lit>0)pairs.push(kmDiff/lit);}
if(pairs.length)avgKmL=(pairs.reduce((s,v)=>s+v,0)/pairs.length).toFixed(1);
}
const bbmThisMonth=bbmV.filter(b=>{const d=new Date(b.date);return d.getMonth()===m&&d.getFullYear()===y;});
const bbmThisMonthCost=bbmThisMonth.reduce((s,b)=>s+b.cost,0);
const bbmSummary=`BBM: total ${totalLiter.toFixed(1)}L / ${fmtFull(totalBbmCost)} all-time, bulan ini ${fmtFull(bbmThisMonthCost)}, rata² ${avgKmL?avgKmL+' km/L':'belum cukup data'}, KM sekarang ${curKm.toLocaleString('id-ID')}`;
const servisV=D.servisLogs.filter(s=>s.vehicleId===v.id);
const totalServisV=servisV.reduce((s,x)=>s+(x.cost||0),0);
const servisVDetail=[...servisV].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(s=>`${s.item} ${s.date}${s.km?' @'+s.km.toLocaleString('id-ID')+'km':''} (${fmtFull(s.cost)})`).join('; ')||'belum ada';
const sparepartStatus=D.sparepartCats.map(cat=>{
const lastKm=getLastServiceKmForCat(v.id,cat);
const intervalKm=getEffectiveIntervalKm(v.id,cat);
const sisa=intervalKm-(lastKm===null?curKm:curKm-lastKm);
const status=sisa<=0?`❌ LEWAT ${Math.abs(sisa).toLocaleString('id-ID')}km`:sisa<=500?`⚠️ sisa ${sisa.toLocaleString('id-ID')}km`:`✅ sisa ${sisa.toLocaleString('id-ID')}km`;
return `${cat.name}: ${status}`;
}).join(', ');
const servisSummary=`Servis: total biaya ${fmtFull(totalServisV)}, 5 terakhir: [${servisVDetail}], status interval: ${sparepartStatus||'belum ada kategori servis'}`;
const jalanV=D.jalanLogs.filter(j=>j.vehicleId===v.id);
const totalKmJalan=jalanV.reduce((s,j)=>s+(j.jarak||0),0);
const jalanSummary=jalanV.length?`Perjalanan: ${jalanV.length} tercatat, total ${totalKmJalan.toLocaleString('id-ID')}km, 3 terakhir: ${[...jalanV].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3).map(j=>`${j.rute}${j.jarak?' ('+j.jarak+'km)':''}`).join(', ')}`:'Perjalanan: belum ada catatan';
return `\n${v.emoji} ${v.name} (${v.type||'kendaraan'}):\n  ${bbmSummary}\n  ${servisSummary}\n  ${jalanSummary}`;
}).join('\n')||'Belum ada kendaraan terdaftar';
const vehicleInfoCompact=D.vehicles.length?D.vehicles.map(v=>{
const curKm=getVehicleKm(v.id);
const bbmThisMonthCost=D.bbmLogs.filter(b=>{if(b.vehicleId!==v.id)return false;const d=new Date(b.date);return d.getMonth()===m&&d.getFullYear()===y;}).reduce((s,b)=>s+b.cost,0);
return `${v.emoji} ${v.name}: KM ${curKm.toLocaleString('id-ID')}, BBM bulan ini ${fmtFull(bbmThisMonthCost)}`;
}).join(' | '):'Belum ada kendaraan terdaftar';
const vehicleInfo=wantVehicleDetail?vehicleInfoFull:vehicleInfoCompact+' (ringkasan — detail BBM/servis/perjalanan per unit tersedia, tanya lebih spesifik kalau perlu)';
const wantSparepartDetail=mentionsAny('sparepart','spare part','gudang','stok part','stok sparepart');
const stockSparepartLow=D.partsStock.filter(p=>p.qty<=(p.minStock||1)).map(p=>`${escapeHtml(p.name)} (sisa ${p.qty}${p.unit?' '+p.unit:''})`).join(', ')||'Aman semua';
const stockSparepartAllFull=D.partsStock.length?D.partsStock.map(p=>`${escapeHtml(p.name)}: ${p.qty}${p.unit?' '+p.unit:''}`).join(', '):'Belum ada stok sparepart';
const stockSparepartAll=wantSparepartDetail?stockSparepartAllFull:(D.partsStock.length?`${D.partsStock.length} item tercatat (ringkasan — tanya lebih spesifik utk detail per item)`:'Belum ada stok sparepart');
const wantShopDetail=mentionsAny('shop','produk','stok','etalase','produsen','supplier','batu','harga jual','hpp');
const shopProdukStokFull=D.products.length?D.products.map(p=>`${escapeHtml(p.name)} — stok ${p.stock}, harga jual ${fmtFull(p.hargaJual)}, HPP ${fmtFull(p.hargaBeli)}${shopKategoriName(p.kategoriId)?', kategori '+shopKategoriName(p.kategoriId):''}${p.produsenId?', produsen '+((D.produsen.find(pr=>pr.id===p.produsenId)||{}).name||''):''}`).join('; '):'Belum ada produk di etalase';
const shopProdukStok=wantShopDetail?shopProdukStokFull:(D.products.length?`${D.products.length} produk terdaftar (ringkasan — tanya lebih spesifik utk detail per produk)`:'Belum ada produk di etalase');
const shopLowStok=D.products.filter(p=>p.stock<=2).map(p=>p.name).join(', ')||'Aman';
const shopModalStok=(typeof Etalase!=='undefined')?Etalase.totalModalStok():D.products.reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
const shopProdusenInfo=wantShopDetail?(D.produsen.length?D.produsen.map(pr=>pr.name+(pr.contact?' ('+pr.contact+')':'')).join(', '):'Belum ada produsen tercatat'):`${D.produsen.length} produsen tercatat`;
const shopOmzet=D.cobek.reduce((s,t)=>s+(t.total||0),0);
const shopThisMonth=D.cobek.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const shopOmzetThisMonth=shopThisMonth.reduce((s,t)=>s+(t.total||0),0);
const shopUntungThisMonth=shopThisMonth.reduce((s,t)=>s+(t.profit||0),0);
const budgetInfo=D.budgets&&D.budgets.length?D.budgets.map(b=>{
const used=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y&&budgetMatchesTx(b,t);}).reduce((s,t)=>s+t.amount,0);
const pct=b.limit>0?Math.round(used/b.limit*100):0;
return `${b.icon} ${escapeHtml(b.name)}: anggaran ${fmtFull(b.limit)}, terpakai ${fmtFull(used)} (${pct}%)${pct>=100?' ❌ OVER BUDGET':pct>=80?' ⚠️ hampir habis':''}`;
}).join('\n'):'Belum ada anggaran yang diatur';
const whThisMonth=D.workDays.filter(w=>{const d=new Date(w.date);return d.getMonth()===m&&d.getFullYear()===y;});
const whAllTime=D.workDays.length;
const gajiThisMonth=whThisMonth.reduce((s,w)=>s+(w.total||0),0);
const gajiAbsensi=whThisMonth.length?`${whThisMonth.length} hari kerja bulan ini, estimasi gaji ${fmtFull(gajiThisMonth)} | Total semua waktu: ${whAllTime} hari tercatat`:'Belum ada absensi bulan ini';
const pz=D.pajakZakat;
const zpWajib=inc>=pz.nisabPenghasilanBulan;
const zpJumlah=zpWajib?Math.round(inc*0.025):0;
const zpInfo=`Zakat Penghasilan bulan ini: pemasukan ${fmtFull(inc)} vs nisab ${fmtFull(pz.nisabPenghasilanBulan)} → ${zpWajib?'✅ WAJIB zakat '+fmtFull(zpJumlah):'⬜ belum wajib (di bawah nisab)'}`;
const asetZakatable=(D.assets||[]).filter(a=>a.zakatable).reduce((s,a)=>s+(a.nilai||0),0);
const totalHartaZakat=Math.max(0,totalSaldoAkun()+asetZakatable-(pz.utangJT||0)-totalDebtValue()-totalCicilanOutstanding());
const nisabMaal=85*pz.hargaEmasPerGram;
const cukupNisabMaal=totalHartaZakat>=nisabMaal;
let haulInfo='belum mencapai nisab';
let haulOk=false;
if(cukupNisabMaal){
if(!pz.haulMaalMulai) haulInfo='baru capai nisab, haul belum mulai dihitung';
else{ const hari=Math.floor((new Date()-new Date(pz.haulMaalMulai))/86400000); haulOk=hari>=354; haulInfo=haulOk?`sudah haul (${hari} hari sejak ${pz.haulMaalMulai})`:`haul berjalan ${hari}/354 hari`; }
}
const zmJumlah=(cukupNisabMaal&&haulOk)?Math.round(totalHartaZakat*0.025):0;
const zmInfo=`Zakat Maal: harta bersih ${fmtFull(totalHartaZakat)} vs nisab 85gr emas ${fmtFull(nisabMaal)} → ${(cukupNisabMaal&&haulOk)?'✅ WAJIB zakat '+fmtFull(zmJumlah):'⬜ belum wajib'} (${haulInfo})`;
const zakatLogInfo=(pz.zakatLog||[]).slice(0,3).map(l=>`${l.jenis} ${l.tanggal} ${fmtFull(l.jumlah)}`).join('; ')||'Belum ada riwayat pembayaran';
const vehTaxInfo=D.vehicles.map(v=>{
const items=Object.entries(VEHTAX_ITEMS).map(([,cfg])=>`${cfg.label.replace(/^\S+\s/,'')}: ${dateStatusBadge(v[cfg.tglKey]).label}`).join(', ');
return `${v.name} — ${items}`;
}).join(' | ')||'Belum ada kendaraan';
const simInfo=(D.simList||[]).length?D.simList.map(s=>`${s.nama} (${s.jenis}): ${dateStatusBadge(s.tglAkhir).label}`).join(', '):'Belum ada data SIM';
const pbbBumi=parsePzNum(document.getElementById('pbbNjopBumi')?.value||0);
const pbbBangunan=parsePzNum(document.getElementById('pbbNjopBangunan')?.value||0);
let pbbInfo='Belum diisi kalkulator PBB';
if(pbbBumi+pbbBangunan>0){
const kenaPajak=Math.max(0,(pbbBumi+pbbBangunan)-pz.pbb.njoptkp);
const terutang=Math.round(kenaPajak*(pz.pbb.tarifPersen/100));
pbbInfo=`NJOP total ${fmtFull(pbbBumi+pbbBangunan)} → PBB terutang ${fmtFull(terutang)}/tahun`;
}
const pphBrutoBulan=parsePzNum(document.getElementById('pphBruto')?.value||0);
let pphInfo='Belum diisi kalkulator PPh 21';
if(pphBrutoBulan>0){
const pphStatusVal=document.getElementById('pphStatus')?.value||'TK0';
const pphIuranBulan=parsePzNum(document.getElementById('pphIuran')?.value||0);
const brutoSetahun=pphBrutoBulan*12;
const biayaJabatan=Math.min(brutoSetahun*0.05,6000000);
const neto=Math.max(0,brutoSetahun-biayaJabatan-pphIuranBulan*12);
const pkp=Math.max(0,Math.floor((neto-getPTKP(pphStatusVal))/1000)*1000);
const{pajak}=hitungPPh21Progresif(pkp);
pphInfo=`PPh 21 setahun ${fmtFull(pajak)} (≈${fmtFull(Math.round(pajak/12))}/bulan), status ${pphStatusVal}`;
}
const umkmPajakBulan=Math.round(shopOmzetThisMonth*0.005);
const wantAsetDetail=mentionsAny('aset','harta','kekayaan','emas','tanah','rumah','investasi','net worth','netword','zakatable','portofolio','portfolio','kripto','crypto','saham','reksadana','untung','rugi','cuan','profit','loss','performa');
const totalAsetNilai=totalAssetValue();
const asetListInfoFull=(D.assets||[]).length?D.assets.map(a=>{
let s=`${escapeHtml(a.name)} (${a.jenis}${a.zakatable?', zakatable':''}): nilai saat ini ${fmtFull(a.nilai)}`;
if(a.modalInvestasi){
const pct=a.keuntunganPct;
s+=`, modal investasi ${fmtFull(a.modalInvestasi)}, untung/rugi ${a.keuntungan>=0?'+':''}${fmtFull(a.keuntungan)} (${pct>=0?'+':''}${pct.toFixed(2)}%)`;
}
if(a.jumlahUnit!=null)s+=`, jumlah unit ${a.jumlahUnit}`;
if(a.hargaBeli!=null)s+=`, harga beli/unit ${a.hargaBeli}`;
return s;
}).join('; '):'Belum ada aset tercatat';
const asetListInfo=wantAsetDetail?asetListInfoFull:((D.assets||[]).length?`${D.assets.length} aset tercatat (ringkasan — tanya lebih spesifik utk detail per aset)`:'Belum ada aset tercatat');
const netWorth=totalSaldoAkun()+totalAsetNilai-(pz.utangJT||0)-totalDebtValue()-totalCicilanOutstanding();
let fiInfo='Belum ada data transaksi yang cukup untuk hitung Kebebasan Finansial.';
try{
if(typeof fiGetAssumptions==='function'&&D.transactions&&D.transactions.length){
const{swr,ret,inf}=fiGetAssumptions();
const fiTarget=fiTargetNominal();
const fiAsetBersih=fiNetAssetFund();
const fiUtang=fiTotalDebt();
const fiSurplus=fiMonthlySurplus();
const fiAnnualExp=fiAnnualExpense();
const monthsToGo=fiEstimateMonthsToTarget();
const progPct=fiTarget>0?Math.min(999,Math.round(fiAsetBersih/fiTarget*100)):0;
const scope=(D.finansialFreedom&&D.finansialFreedom.assetScope==='semua')?'semua aset tercatat':'aset investasi/zakatable saja (bukan rumah tinggal/kendaraan pakai sehari-hari)';
fiInfo=`Target FI (${(100/swr).toFixed(1)}x pengeluaran tahunan, SWR ${swr}%): ${fmtFull(fiTarget)} (pengeluaran tahunan acuan ${fmtFull(fiAnnualExp)}). Dana FI saat ini (${scope}, dikurangi utang ${fmtFull(fiUtang)}): ${fmtFull(fiAsetBersih)} → progress ${progPct}%. Surplus/bulan (pemasukan-pengeluaran rata-rata): ${fmtFull(fiSurplus)}. Asumsi Return ${ret}%/th, Asumsi Inflasi ${inf}%/th (return riil ${((( 1+ret/100)/(1+inf/100)-1)*100).toFixed(1)}%/th, dipakai supaya target & estimasi tetap dlm nilai uang hari ini). Estimasi waktu capai FI dgn asumsi ini: ${monthsToGo===0?'🎉 sudah tercapai':monthsToGo===null?'>100 tahun (surplus/return kurang, atau minus)':fiFormatMonths(monthsToGo)}.`;
}
}catch(e){ console.warn('Gagal hitung ringkasan FI utk konteks chat AI:',e); }
const systemPrompt=`Kamu adalah PENASIHAT KEUANGAN PRIBADI sekaligus asisten all-in-one untuk ${D.profile.nama||'W'}, pria Indonesia kerja di toko mebel Borobudur, LDR dengan keluarga di Pekalongan.

PERANMU:
- Penasihat keuangan yang jujur, analitis, dan peduli — kasih saran nyata, bukan basa-basi
- Bantu analisa pengeluaran, tren, efisiensi, dan peluang hemat/cuan
- GAYA NGOBROL: santai & akrab banget, kayak ngobrol sama sahabat sendiri lewat WhatsApp — BUKAN gaya customer service atau laporan formal. Pakai bahasa sehari-hari yang ringan, boleh sesekali pakai emoji secukupnya (jangan berlebihan), hindari kata-kata kaku/baku/korporat kayak "Berdasarkan data yang tersedia..." atau "Dapat disimpulkan bahwa...".
- FORMAT JAWABAN: langsung ke poin-poin penting pakai bullet (• atau -), JANGAN nulis paragraf panjang bertele-tele. Buka dengan 1 kalimat singkat kalau perlu konteks, terus langsung poin-poin utamanya — tiap poin singkat & padat, angka/data penting ditulis jelas. Kalau ujungnya perlu kesimpulan/saran, kasih 1 baris penutup singkat, bukan paragraf.
- Tetap LENGKAP dan TUNTAS — jangan potong di tengah, jangan skip bagian pertanyaan yang belum kejawab — tapi rangkumnya padat, hindari basa-basi yang cuma buang-buang waktu baca.
- Tidak ada batas kata, tapi utamakan singkat, jelas, to the point dibanding panjang & muter-muter.
- CATATAN DATA: beberapa bagian (kendaraan/produk shop/sparepart/aset) ditampilkan RINGKAS kalau pertanyaan user tidak spesifik menyinggung topik itu — supaya hemat. Kalau user tanya lebih detail soal salah satu topik itu, dia akan otomatis dapat versi lengkap di pertanyaan berikutnya (tidak perlu kamu minta dia ganti prompt, cukup jawab dari ringkasan yang ada, atau bilang "tanya lebih spesifik ya" kalau datanya belum cukup).
- USUL AKSI (opsional): kalau dari obrolan JELAS user mau MENCATAT sesuatu yang konkret (bukan cuma nanya/curhat) — misal "catat aku abis beli bensin 50rb", "tambahin tagihan listrik 200rb jatuh tempo tgl 20", "servis motor kemarin ganti oli 80rb", "target nabung liburan 5jt", "catat anak udah bisa jalan hari ini", "masukin kampas rem 150rb ke wishlist/prioritas belanja" — tutup balasanmu dengan SATU blok persis format ini (di baris baru, setelah teks normal, JANGAN taruh di tengah kalimat):
[[ACTION]]{"type":"<salah satu: add_transaksi|add_tagihan|add_servis|add_target|add_catatan_anak|add_wishlist>","data":{...}}[[/ACTION]]
  Field per tipe:
  • add_transaksi: {type:"income"|"expense", amount:number, category:string, subcategory?:string, note?:string, date?:"YYYY-MM-DD"}
  • add_tagihan: {name:string, amount:number, nextDue:"YYYY-MM-DD", freq?:"bulanan"|"tahunan"|"sekali", category?:string, note?:string}
  • add_servis: {vehicleName:string, item:string, cost:number, date?:"YYYY-MM-DD", km?:number, note?:string}
  • add_target: {name:string, amount:number, saved?:number, emoji?:string}
  • add_catatan_anak: {text:string, date?:"YYYY-MM-DD"}
  • add_wishlist: {name:string, price:number, cat?:"kebutuhan"|"keinginan", urgensi?:"mendesak"|"bisa_nunggu"|"nice_to_have", hargaNormal?:number (isi kalau lagi diskon, harus > price), sudahPunya?:boolean, sudahPunyaAlasan?:string} — INI CUMA nambah rencana belanja ke daftar Prioritas Belanja, BUKAN mencatat transaksi/pengeluaran nyata. Kalau user bilang sudah BELI barangnya (bukan sekadar berencana), pakai add_transaksi biasa, bukan add_wishlist.
  JSON harus valid (pakai tanda kutip ganda, tanpa komentar, TANPA trailing comma). MAKSIMAL 1 blok ACTION per balasan. JANGAN pakai blok ini kalau user cuma nanya/minta saran/analisa — itu murni dijawab teks biasa. Data BELUM tersimpan begitu kamu kirim blok ini — sistem akan tampilkan tombol konfirmasi ke user dulu, jangan bilang "sudah kucatat" seolah-olah sudah pasti tersimpan, cukup bilang "cek & konfirmasi tombol di bawah ya". PENTING: kalimat "cek & konfirmasi tombol di bawah" HANYA boleh kamu tulis kalau blok [[ACTION]]...[[/ACTION]] beneran ada persis di balasanmu (lengkap dgn tag pembuka & penutup, JSON valid) — jangan pernah janji ada tombol kalau blok-nya nggak kamu sertakan, itu bikin user bingung karena tombolnya nggak akan muncul.

DATA KEUANGAN BULAN INI (${new Date().toLocaleString('id-ID',{month:'long',year:'numeric'})}):
Pemasukan: ${fmtFull(inc)} | Pengeluaran: ${fmtFull(exp)} | Bersih: ${fmtFull(inc-exp)} | Jumlah transaksi: ${txM.length}

SALDO AKUN: ${accInfo}
TAGIHAN/CICILAN AKTIF: ${billInfo}
TARGET TABUNGAN: ${targetInfo}
DANA PENDIDIKAN: ${eduFundInfo}
PROYEK RENOVASI: ${renovInfo}
SEWA KIOS: ${sewaKiosInfo}
UTANG (belum lunas): ${debtInfo}
PIUTANG (belum lunas): ${piutangInfo}
DANA PENSIUN: ${pensiunInfo}

PENDAPATAN TETAP:
- Gaji toko mebel Borobudur bulan ini: ${fmtFull(gajiThisMonth)} (dari ${whThisMonth.length} hari kerja tercatat, tarif ${fmtFull(D.profile.gajiPokok||0)}/hari)
- Kiriman istri (sesuai pengaturan): ${fmtFull(D.profile.kiriman||0)}/bulan
- Dana darurat: Rp 10jt (BKK) ✅ | RDPU Bibit: Rp 11jt (aset tetap, belum tercatat di modul Buku Aset)
- Kios Borobudur ±34m² milik sendiri (rencana dikontrakkan)

PAJAK & ZAKAT:
- ${zpInfo}
- ${zmInfo}
- Riwayat zakat dibayar (3 terakhir): ${zakatLogInfo}
- Pajak Kendaraan (STNK/uji kelayakan): ${vehTaxInfo}
- SIM: ${simInfo}
- PBB: ${pbbInfo}
- PPh 21: ${pphInfo}
- Pajak UMKM Shop (0.5% omzet bulan ini): ${fmtFull(umkmPajakBulan)}

ASET & KEKAYAAN BERSIH:
- Total nilai aset tercatat: ${fmtFull(totalAsetNilai)} — ${asetListInfo}
- Kekayaan bersih (saldo akun + aset − utang): ${fmtFull(netWorth)}

KEBEBASAN FINANSIAL (FI) & INFLASI:
${fiInfo}
Kalau user tanya soal "kapan bisa pensiun/FIRE/kebebasan finansial", "cukup gak tabunganku buat FI", atau minta analisa dampak inflasi ke rencana keuangannya, JAWAB pakai angka-angka di atas (jangan bilang tidak tahu / minta dia buka menu lain) — kamu SUDAH punya datanya. Kalau progress masih jauh, kasih saran konkret (naikkan surplus bulanan, kurangi pengeluaran kategori tertentu, atau evaluasi asumsi return/inflasi) — bukan cuma restate angka.

PENGELUARAN 3 BULAN TERAKHIR PER KATEGORI:
${Object.entries(katMap).map(([k,v])=>`  ${k}: pemasukan ${fmtFull(v.inc)}, pengeluaran ${fmtFull(v.exp)}`).join('\n')}

BISNIS SHOP (batu shop PO system):
- All-time: omzet ${fmtFull(shopOmzet)}, untung ${fmtFull(shopTotal)}, ${D.cobek.length} transaksi
- Bulan ini: omzet ${fmtFull(shopOmzetThisMonth)}, untung ${fmtFull(shopUntungThisMonth)}, ${shopThisMonth.length} transaksi
- Produk etalase: ${shopProdukStok}
- Modal Stok tertanam (HPP x sisa stok semua produk, ini uang yg belum jadi cash lagi): ${fmtFull(shopModalStok)}
- Stok menipis (≤2): ${shopLowStok}
- Produsen/supplier: ${shopProdusenInfo}

ABSENSI & GAJI: ${gajiAbsensi}

ANGGARAN BULAN INI:
${budgetInfo}

KELUARGA & ANAK:
- Perkembangan anak: ${msDone}/5 milestone tercapai. Catatan: ${anakInfo}

KENDARAAN (data lengkap per unit):${vehicleInfo}

STOK SPAREPART GUDANG: ${stockSparepartAll}
Sparepart menipis: ${stockSparepartLow}`;
D.chatHistory.push({role:'user',content:msg});
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){
loading.remove();
box.innerHTML+=`<div class="chat-bubble ai">⚠️ Belum ada API Key. Buka Pengaturan → AI Asisten, pilih provider & masukkan API key dulu ya W.</div>`;
box.scrollTop=box.scrollHeight;
D.chatHistory.pop();
return;
}
try{
let reply;
const r=await callAIProviderRaw(systemPrompt,D.chatHistory.slice(-10));
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
loading.remove();
box.innerHTML+=`<div class="chat-bubble ai">⚠️ Gagal hubungi ${label}: ${escapeHtml(r.errMsg||'error tidak diketahui')}${aiErrorHint(provider,r.status)}</div>`;
D.chatHistory.pop();
box.scrollTop=box.scrollHeight;
return;
}
reply=r.text||'Maaf, coba lagi ya W!';
const{text:cleanText,action,actionError}=extractChatAction(reply);
D.chatHistory.push({role:'assistant',content:cleanText||reply});
save();
loading.remove();
if(cleanText)box.innerHTML+=`<div class="chat-bubble ai">${escapeHtml(cleanText).replaceAll('\n','<br>')}</div>`;
if(action){
const actionId='a'+Date.now()+Math.floor(Math.random()*1000);
_pendingChatActions[actionId]={type:action.type,data:action.data};
box.innerHTML+=renderChatActionBubble(actionId,action.type,action.data);
}else if(actionError){
box.innerHTML+=`<div class="chat-bubble ai" style="border:1px solid #ff5050">
        <div class="u-fw700" style="color:#ff5050">⚠️ Tombol konfirmasi gagal dibuat</div>
        <div class="u-fs13 u-t2" style="margin:4px 0 8px">AI mencoba mengusulkan aksi tapi datanya tidak terbaca dengan benar. Coba ulangi pesannya, atau isi manual lewat form.</div>
        <div class="u-flex u-gap8 u-fwrap">
          <button class="btn btn-ghost btn-sm" data-action="openTxModal" data-args='["expense"]' aria-label="Edit/Buka">✏️ Buka Form Transaksi</button>
        </div>
      </div>`;
}else if(/tombol.{0,15}(di ?bawah|konfirmasi)|cek ?&? ?konfirmasi/i.test(cleanText)){
box.innerHTML+=`<div class="chat-bubble ai" style="border:1px solid #ff5050">
        <div class="u-fw700" style="color:#ff5050">⚠️ Tombol konfirmasi tidak muncul</div>
        <div class="u-fs13 u-t2" style="margin:4px 0 8px">AI menyebut ada tombol konfirmasi tapi lupa menyertakannya. Coba minta lagi ("tolong tampilkan tombol konfirmasinya"), atau isi manual.</div>
        <div class="u-flex u-gap8 u-fwrap">
          <button class="btn btn-ghost btn-sm" data-action="openTxModal" data-args='["expense"]' aria-label="Edit/Buka">✏️ Buka Form Transaksi</button>
        </div>
      </div>`;
}
}catch(e){
loading.remove();
box.innerHTML+=`<div class="chat-bubble ai">⚠️ Gagal terhubung: ${escapeHtml(e.message||'koneksi bermasalah')}. Pastikan online & API key valid ya! 🙏</div>`;
D.chatHistory.pop();
}
box.scrollTop=box.scrollHeight;
}
// callAIProviderRaw — SATU-SATUNYA tempat yang benar-benar fetch() ke Claude/Gemini di seluruh
// app. Awalnya cuma dipakai AIWidget.generate(), sekarang jadi tempat bersama utk 6 fitur AI yang
// ada (chat asisten, AIWidget laporan, RenovAI, RefAI, PriceReko.checkMarketAI, EduFund.checkAI) —
// sebelumnya tiap fitur itu copy-paste sendiri kode fetch Claude+Gemini (6x kode yang HAMPIR SAMA
// PERSIS, cuma beda systemPrompt/messages/maxTokens/perlu web_search atau tidak). Dirapikan supaya
// nambah provider AI baru, ganti model, atau benerin bug fetch cukup di 1 tempat.
// opts (semua opsional): {maxTokens:number (default 4096), webSearch:boolean (default false, aktifkan
// tool pencarian web server-side — Gemini google_search / Claude web_search_20250305, dipakai
// fitur yang butuh info TERBARU spt harga emas/harga pasar/biaya sekolah, BUKAN utk chat/saran biasa)}
// Return: {ok:true,text} kalau sukses (text = gabungan SEMUA blok teks di balasan, bukan cuma blok
// pertama — penting utk balasan yang pakai web_search, karena balasannya bisa berisi beberapa blok
// teks diselingi hasil pencarian, bukan cuma 1 blok di awal), atau {ok:false,errMsg,status} kalau
// gagal (status = HTTP status code kalau ada, dipakai caller utk kasih hint spesifik spt "cek API key").
async function callAIProviderRaw(systemPrompt,messages,opts){
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey)return{ok:false,errMsg:'no_api_key'};
const maxTokens=(opts&&opts.maxTokens)||4096;
const useWebSearch=!!(opts&&opts.webSearch);
try{
if(provider==='gemini'){
const geminiContents=messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
const body={system_instruction:{parts:[{text:systemPrompt}]},contents:geminiContents,generationConfig:{maxOutputTokens:maxTokens}};
if(useWebSearch)body.tools=[{google_search:{}}];
const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const data=await res.json();
if(!res.ok)return{ok:false,errMsg:data?.error?.message||`HTTP ${res.status}`,status:res.status};
const text=(data.candidates?.[0]?.content?.parts||[]).filter(p=>p.text).map(p=>p.text).join('\n').trim();
return{ok:true,text};
} else {
const body={model:'claude-sonnet-4-6',max_tokens:maxTokens,system:systemPrompt,messages};
if(useWebSearch)body.tools=[{type:'web_search_20250305',name:'web_search'}];
const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});
const data=await res.json();
if(!res.ok)return{ok:false,errMsg:data?.error?.message||`HTTP ${res.status}`,status:res.status};
const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
return{ok:true,text};
}
}catch(e){
return{ok:false,errMsg:e.message||'koneksi bermasalah'};
}
}
// authHint — dipakai caller (chat, RefAI, PriceReko, EduFund) utk kasih saran singkat spesifik
// per status HTTP, ngikutin pesan yang dulu ditulis manual & beda2 dikit di tiap fitur (skrg disatukan
// di 1 fungsi supaya konsisten): Claude 401 = API key salah/expired, Gemini 400/403 = cek API key.
function aiErrorHint(provider,status){
if(provider==='gemini')return(status===400||status===403)?' (cek API key di Pengaturan)':'';
return status===401?' (API key salah/expired, cek di Pengaturan)':'';
}
// Advisor — pengatur tab utk card gabungan "🧭 Penasihat" (v124, kw99-sesi25-fix-gdrive-backup-await-5):
// dulu FinCoach ("🩺 Insight Cepat", rule-based-gratis-instan) & AIWidget ("🔍 Laporan AI",
// panggil Claude/Gemini, wajib API key) tampil sbg 2 card TERPISAH di Dashboard — sekarang
// digabung jadi SATU card dgn 2 tab, supaya tidak terasa ada "2 penasihat AI" yang mirip2.
// Cuma UI switcher (toggle panel mana yang tampil + simpan preferensi tab terakhir), TIDAK ubah
// logika FinCoach/AIWidget sama sekali — keduanya tetap modul independen spt sebelumnya, cuma
// target render-nya sekarang panel di dalam 1 card yang sama (`#finCoachBody`/`#aiWidgetBody`).
const Advisor={
LS_KEY:'kw_advisor_tab',
current(){ try{return localStorage.getItem(Advisor.LS_KEY)||'coach';}catch(e){return'coach';} },
setTab(tab){
try{localStorage.setItem(Advisor.LS_KEY,tab);}catch(e){}
Advisor.render();
},
render(){
const tab=Advisor.current()==='report'?'report':'coach';
const bC=document.getElementById('advisorTabBtn-coach'),bR=document.getElementById('advisorTabBtn-report');
const pC=document.getElementById('advisorPanel-coach'),pR=document.getElementById('advisorPanel-report');
if(!bC||!bR||!pC||!pR)return;
bC.classList.toggle('active',tab==='coach');
bR.classList.toggle('active',tab==='report');
pC.classList.toggle('u-dnone',tab!=='coach');pC.style.display=tab==='coach'?'block':'none';
pR.classList.toggle('u-dnone',tab!=='report');pR.style.display=tab==='report'?'block':'none';
}
};
const AIWidget={
generating:false,
buildContext(){
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const inc=txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const accInfo=D.accounts.map(a=>`${escapeHtml(a.name)}: ${fmtFull(recalcAccBalance(a.id))}`).join(', ')||'Belum ada akun';
let netWorth=0;
try{ netWorth=totalSaldoAkun()+totalAssetValue()-((D.pajakZakat&&D.pajakZakat.utangJT)||0)-totalDebtValue()-totalCicilanOutstanding(); }catch(e){}
const shopOmzet=D.cobek.reduce((s,t)=>s+(t.total||0),0);
const shopProfit=D.cobek.reduce((s,t)=>s+(t.profit||0),0);
const shopModalStok=(typeof Etalase!=='undefined')?Etalase.totalModalStok():D.products.reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
const shopThisMonth=D.cobek.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const shopOmzetBulan=shopThisMonth.reduce((s,t)=>s+(t.total||0),0);
const shopProfitBulan=shopThisMonth.reduce((s,t)=>s+(t.profit||0),0);
const whThisMonth=D.workDays.filter(w=>{const d=new Date(w.date);return d.getMonth()===m&&d.getFullYear()===y;});
const gajiBulan=whThisMonth.reduce((s,w)=>s+(w.total||0),0);
// v179: total gaji minggu ini dihitung dari Absensi (D.workDays, in/out harian) — BUKAN dari
// transaksi Keuangan — biar AI juga bisa lihat progres gaji minggu berjalan (belum tentu sudah
// dicatat sbg pemasukan di Keuangan kalau minggunya belum "gajian"/reset).
let gajiMinggu=0,whCountMinggu=0;
try{
const{start:wStart,end:wEnd}=getWeekRange(new Date());
wEnd.setHours(23,59,59,999);
const whThisWeek=(D.workDays||[]).filter(w=>{const d=new Date(w.date);return d>=wStart&&d<=wEnd;});
gajiMinggu=whThisWeek.reduce((s,w)=>s+(w.total||0),0);
whCountMinggu=whThisWeek.length;
}catch(e){console.warn('AIWidget: gagal hitung gaji minggu ini',e);}
// v179: rata-rata gaji mingguan dari histori beberapa minggu terakhir (D.gajiMingguanHistory,
// dicatat otomatis tiap kali confirmWeeklyReset() dijalankan) — biar AI bisa lihat variabilitas
// pendapatan harian/mingguan dari waktu ke waktu, bukan cuma angka minggu ini yang bisa naik-turun
// tergantung jumlah hari kerja.
let avgGajiMingguan=0,gajiMingguanHistCount=0;
try{
const hist=(D.gajiMingguanHistory||[]).slice(-8);
if(hist.length){
avgGajiMingguan=Math.round(hist.reduce((s,h)=>s+(h.total||0),0)/hist.length);
gajiMingguanHistCount=hist.length;
}
}catch(e){console.warn('AIWidget: gagal hitung rata-rata gaji mingguan',e);}
let fiInfo='Belum cukup data transaksi utk hitung Kebebasan Finansial.';
try{
if(typeof fiGetAssumptions==='function'&&D.transactions&&D.transactions.length){
const{swr,ret,inf}=fiGetAssumptions();
const fiTarget=fiTargetNominal(),fiAset=fiNetAssetFund(),fiSurplus=fiMonthlySurplus();
const monthsToGo=fiEstimateMonthsToTarget();
const progPct=fiTarget>0?Math.min(999,Math.round(fiAset/fiTarget*100)):0;
fiInfo=`Target FI ${fmtFull(fiTarget)} (SWR ${swr}%), dana FI saat ini ${fmtFull(fiAset)} (${progPct}% progress), surplus rata² ${fmtFull(fiSurplus)}/bln, asumsi return ${ret}%/th & inflasi ${inf}%/th, estimasi capai: ${monthsToGo===0?'sudah tercapai 🎉':monthsToGo===null?'>100 tahun (surplus/return kurang)':fiFormatMonths(monthsToGo)}.`;
}
}catch(e){console.warn('AIWidget: gagal hitung FI',e);}
const debtInfo=(D.debts||[]).filter(d=>!d.lunas).map(d=>`${escapeHtml(d.name)}: ${fmtFull(d.nilai)}${d.jatuhTempo?', JT '+d.jatuhTempo:''}`).join('; ')||'Tidak ada utang aktif';
const billInfo=D.bills.map(b=>`${escapeHtml(b.name)} (${b.kind}): ${fmtFull(b.amount)}, JT ${b.nextDue}`).join('; ')||'Tidak ada tagihan/cicilan aktif';
let budgetInfo='Belum ada anggaran yang diatur';
try{
if((D.budgets||[]).length){
budgetInfo=D.budgets.map(b=>{
const used=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y&&budgetMatchesTx(b,t);}).reduce((s,t)=>s+t.amount,0);
const pct=b.limit>0?Math.round(used/b.limit*100):0;
return `${escapeHtml(b.name)}: ${pct}% terpakai${pct>=100?' (OVER)':pct>=80?' (hampir habis)':''}`;
}).join('; ');
}
}catch(e){}
let lifeBalanceInfo='Belum ada data Skor Hidup Seimbang.';
try{
if(typeof LifeBalance!=='undefined'&&typeof LifeBalance.compute==='function'){
const sc=LifeBalance.compute();
lifeBalanceInfo=`Skor Hidup Seimbang: ${sc.total}/100 (${sc.level}) — rincian: ${sc.parts.map(p=>p.label+' '+p.pts+'/'+p.max+' ('+p.note+')').join(', ')}`;
}
}catch(e){}
const targetInfo=(D.targets||[]).map(t=>`${escapeHtml(t.name)}: ${t.amount>0?Math.round((t.saved/t.amount)*100)+'%':'-'}`).join(', ')||'Belum ada target tabungan';
let asetInfo='Belum ada aset tercatat';
try{
if((D.assets||[]).length){
const totalAset=totalAssetValue();
asetInfo=`Total ${fmtFull(totalAset)} dari ${D.assets.length} aset (${D.assets.map(a=>a.name+' '+fmtFull(a.nilai)).join(', ')})`;
}
}catch(e){}
return{m,y,inc,exp,accInfo,netWorth,shopOmzet,shopProfit,shopModalStok,shopOmzetBulan,shopProfitBulan,gajiBulan,whCount:whThisMonth.length,gajiMinggu,whCountMinggu,avgGajiMingguan,gajiMingguanHistCount,fiInfo,debtInfo,billInfo,budgetInfo,lifeBalanceInfo,targetInfo,asetInfo};
},
buildSystemPrompt(c){
return `Kamu adalah PENASIHAT KEUANGAN, BISNIS & INVESTASI, sekaligus WORK-LIFE COACH pribadi untuk ${D.profile.nama||'pengguna'} (pakai data aplikasi keuangan keluarga miliknya).
Buatkan SATU laporan analisis komprehensif dari data di bawah. WAJIB pakai format PERSIS 4 bagian dengan heading berikut apa adanya (jangan diubah):

## 💰 Analisis Keuangan
## 🏢 Bisnis & Investasi
## ⚖️ Pola Hidup & Kerja
## ✅ Rekomendasi Prioritas

Aturan:
- Tiap bagian max 4-6 bullet (•), padat & konkret, sebutkan angka jelas — jangan paragraf panjang bertele-tele.
- Bagian "Rekomendasi Prioritas" berisi maks 5 poin actionable, diurutkan dari yang paling penting/mendesak dulu.
- Gaya bahasa: jujur, analitis, dan peduli seperti penasihat pribadi yang akrab — bukan gaya laporan korporat kaku, hindari kalimat pembuka seperti "Berdasarkan data yang tersedia...".
- Kalau ada data yang kosong/kurang (misal belum ada aset atau target), sebutkan itu sebagai catatan singkat, bukan alasan untuk skip bagian.

DATA BULAN ${c.m+1}/${c.y}:
- Pemasukan: ${fmtFull(c.inc)} | Pengeluaran: ${fmtFull(c.exp)} | Bersih: ${fmtFull(c.inc-c.exp)}
- Saldo akun: ${c.accInfo}
- Kekayaan bersih (saldo+aset-utang): ${fmtFull(c.netWorth)}
- Tagihan/cicilan aktif: ${c.billInfo}
- Utang belum lunas: ${c.debtInfo}
- Target tabungan: ${c.targetInfo}
- Anggaran bulan ini: ${c.budgetInfo}
- Kebebasan Finansial (FI): ${c.fiInfo}

BISNIS SHOP (batu shop PO system):
- All-time: omzet ${fmtFull(c.shopOmzet)}, untung ${fmtFull(c.shopProfit)}
- Bulan ini: omzet ${fmtFull(c.shopOmzetBulan)}, untung ${fmtFull(c.shopProfitBulan)}
- Modal Stok tertanam (uang blm jadi cash lagi, masih bentuk barang di etalase): ${fmtFull(c.shopModalStok)}

ASET & INVESTASI: ${c.asetInfo}

KERJA & POLA HIDUP:
- Gaji harian/absensi bulan ini: ${fmtFull(c.gajiBulan)} dari ${c.whCount} hari kerja tercatat
- Gaji harian/absensi MINGGU INI (belum tentu sudah dicatat sbg Pemasukan di Keuangan): ${fmtFull(c.gajiMinggu)} dari ${c.whCountMinggu} hari kerja tercatat
${c.gajiMingguanHistCount?`- Rata-rata gaji mingguan dari ${c.gajiMingguanHistCount} minggu terakhir yang sudah di-reset/gajian: ${fmtFull(c.avgGajiMingguan)}/minggu (pakai ini utk lihat naik-turun pendapatan, bukan cuma angka minggu ini)`:''}
- ${c.lifeBalanceInfo}`;
},
async generate(){
if(AIWidget.generating)return;
if(!D.profile.apiKey){
toast('⚠️ Isi dulu API Key AI di Pengaturan → AI Asisten');
showPage('settings',document.querySelectorAll('.nav-item')[6]);
return;
}
AIWidget.generating=true;
AIWidget.render();
try{
const ctx=AIWidget.buildContext();
const systemPrompt=AIWidget.buildSystemPrompt(ctx);
const r=await callAIProviderRaw(systemPrompt,[{role:'user',content:'Buatkan laporan analisis lengkap sesuai instruksi di atas, sekarang.'}]);
if(!r.ok){
toast('⚠️ Gagal buat analisis: '+(r.errMsg||'error tidak diketahui'));
} else if(!r.text){
toast('⚠️ AI tidak memberikan jawaban, coba lagi');
} else {
D.aiWidgetReport={text:r.text,generatedAt:new Date().toISOString()};
save();
toast('✅ Analisis AI diperbarui');
}
}catch(e){
toast('⚠️ Gagal terhubung: '+(e.message||'koneksi bermasalah'));
}
AIWidget.generating=false;
AIWidget.render();
},
mdToHtml(text){
let t=escapeHtml(text);
t=t.replace(/^## (.+)$/gm,'<div style="font-weight:800;margin:12px 0 6px;font-size:12.5px;color:var(--accent)">$1</div>');
t=t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
t=t.replace(/^[•\-] ?(.+)$/gm,'<div style="padding-left:14px;position:relative;margin-bottom:4px">•&nbsp;$1</div>');
t=t.split('\n').map(line=>line.startsWith('<div')?line:(line.trim()?line+'<br>':'')).join('');
return t;
},
render(){
const box=document.getElementById('aiWidgetBody');
if(!box)return;
const btn=document.getElementById('aiWidgetGenBtn');
if(AIWidget.generating){
if(btn){btn.disabled=true;btn.textContent='⏳ Menganalisa...';}
box.innerHTML='<div class="empty"><div class="empty-icon">🧭</div><div class="empty-text">⏳ AI sedang menganalisa semua data kamu, tunggu sebentar...</div></div>';
return;
}
if(btn){btn.disabled=false;btn.textContent='🔍 Buat/Perbarui Analisis';}
const r=D.aiWidgetReport;
if(!r||!r.text){
box.innerHTML='<div class="empty"><div class="empty-icon">🧭</div><div class="empty-text">Belum ada analisis. Tap "Buat/Perbarui Analisis" untuk laporan penasihat keuangan, bisnis &amp; investasi, dan pola hidup-kerja dari semua data kamu.</div></div>';
return;
}
const genDate=new Date(r.generatedAt);
box.innerHTML=`<div class="u-fs11 u-t2 u-mb8">🕒 Dibuat ${genDate.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})} ${genDate.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div><div class="u-fs13 u-lh16">${AIWidget.mdToHtml(r.text)}</div>`;
},
openChat(){
showPage('ai');
setTimeout(()=>{
const input=document.getElementById('chatInput');
if(input&&!input.value)input.value='Bahas lebih lanjut soal laporan analisis AI yang barusan dibuat di widget rekomendasi, saya mau tanya lebih detail.';
if(input)input.focus();
},150);
}
};
