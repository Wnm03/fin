// cobek-pricing.js — Domain Shop bagian rekomendasi harga & ongkir: PriceReko (kalkulator
// harga jual AI), OngkirCalc (kalkulator ongkos kirim), PriceRekoWidget & StockRekoWidget
// (widget dashboard rule-based). Bagian ke-2 dari 5 hasil pemecahan cobek.js — lihat catatan
// urutan load di cobek-etalase.js.

const PriceReko={
_result:0,
_marketMin:null,
_marketMax:null,
reset(){
this._result=0;this._marketMin=null;this._marketMax=null;
const panel=document.getElementById('priceRekoPanel');
if(panel)panel.classList.add('u-dnone');
const t=document.getElementById('prkTransport'); if(t)t.value='';
const m=document.getElementById('prkMargin'); if(m)m.value='';
const r=document.getElementById('prkResult'); if(r)r.textContent='Rp 0';
const b=document.getElementById('prkBreakdown'); if(b)b.textContent='';
const info=document.getElementById('prkMarketInfo'); if(info)info.textContent='';
},
toggle(){
const panel=document.getElementById('priceRekoPanel');
if(!panel)return;
const willOpen=panel.classList.contains('u-dnone');
panel.classList.toggle('u-dnone');
if(willOpen){this.prefill();this.calc();}
},
prefill(){
const marginEl=document.getElementById('prkMargin');
const kategoriName=(document.getElementById('pKategori')?.value||'').trim();
const kat=kategoriName?D.cobekKategori.find(k=>k.name.toLowerCase()===kategoriName.toLowerCase()):null;
const sejenis=kat?D.products.filter(p=>p.kategoriId===kat.id&&p.hargaBeli>0&&p.hargaJual>0):[];
let avgMargin=50;
if(sejenis.length){
const margins=sejenis.map(p=>((p.hargaJual-p.hargaBeli)/p.hargaBeli)*100).filter(m=>isFinite(m)&&m>0);
if(margins.length)avgMargin=Math.round(margins.reduce((a,b)=>a+b,0)/margins.length);
}
if(marginEl&&!marginEl.value)marginEl.value=avgMargin;
const info=document.getElementById('prkMarketInfo');
if(info&&!this._marketMin){
info.textContent=sejenis.length?`📊 ${sejenis.length} produk sejenis (${kategoriName}) dijual ${fmt(Math.min(...sejenis.map(p=>p.hargaJual)))}–${fmt(Math.max(...sejenis.map(p=>p.hargaJual)))}, rata-rata margin ${avgMargin}%.`:'';
}
},
autoFillTransport(){
const recent=(D.bbmLogs||[]).filter(b=>b.liter>0&&b.harga>0).slice(-10);
if(!recent.length){toast('⚠️ Belum ada catatan BBM yang bisa dipakai utk estimasi');return;}
const avgHarga=recent.reduce((s,b)=>s+b.harga,0)/recent.length;
const el=document.getElementById('prkTransport');
if(el)el.value=Math.round(avgHarga);
this.calc();
toast(`✅ Diisi dari rata-rata harga BBM/liter: ${fmtFull(Math.round(avgHarga))} — anggap 1 kali isi ≈ 1 kali angkut stok. Sesuaikan lagi kalau perlu, ini estimasi kasar.`,7000);
},
roundNice(v){
if(v<=0)return 0;
let step=500;
if(v>=1000000)step=50000;
else if(v>=100000)step=5000;
else if(v>=20000)step=1000;
return Math.round(v/step)*step;
},
calc(){
const modal=parseFloat(document.getElementById('pBeli')?.value)||0;
const transport=parseFloat(document.getElementById('prkTransport')?.value)||0;
const marginPct=parseFloat(document.getElementById('prkMargin')?.value)||0;
const base=modal+transport;
const result=this.roundNice(base*(1+marginPct/100));
this._result=result;
const resEl=document.getElementById('prkResult');
if(resEl)resEl.textContent=fmtFull(result);
const bdEl=document.getElementById('prkBreakdown');
if(bdEl)bdEl.textContent=base>0?`Modal ${fmt(modal)} + Transport ${fmt(transport)} = ${fmt(base)} × ${(1+marginPct/100).toFixed(2)} (margin ${marginPct||0}%)`:'Isi Harga Beli dulu di atas';
return result;
},
async checkMarketAI(){
const name=(document.getElementById('pName')?.value||'').trim();
if(!name){toast('⚠️ Isi nama produk dulu di atas');return;}
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){toast('⚠️ Belum ada API Key. Isi dulu di Pengaturan → AI Asisten.');return;}
const info=document.getElementById('prkMarketInfo');
if(info)info.textContent='🔍 Mencari kisaran harga pasar via web search... (bisa 10-30 detik)';
// lint-ok-no-escape: sysPrompt ini teks prompt yang dikirim ke API AI (bukan di-render ke innerHTML), jadi tidak butuh escapeHtml(); "<angka ...>" di isi prompt cuma notasi placeholder JSON, bukan tag HTML sungguhan
const sysPrompt=`Kamu asisten riset harga pasar Indonesia. Cari kisaran HARGA JUAL ECERAN wajar (bukan harga grosir/pabrik) utk produk berikut lewat web search: "${name}". Balas HANYA JSON valid (tanpa teks lain, tanpa markdown fence):
{"hargaPasar":{"min": <angka Rp, atau null kalau tidak ketemu>, "max": <angka Rp, atau null>, "source":"<sumber & rincian singkat>"}}
Kalau tidak ketemu/tidak yakin, isi min & max dengan null dan jelaskan di source. JANGAN mengarang angka.`;
try{
const r=await callAIProviderRaw(sysPrompt,[{role:'user',content:'Cari kisaran harga jual pasar sesuai format JSON yang diminta.'}],{maxTokens:1024,webSearch:true});
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
toast('❌ Gagal hubungi '+label+': '+(r.errMsg||'error tidak diketahui'));
if(info)info.textContent='';
return;
}
const textOut=r.text;
const parsed=RefAI._parseJSON(textOut);
const item=parsed&&parsed.hargaPasar;
if(!item||item.min===null||item.min===undefined||!isFinite(Number(item.min))||Number(item.min)<=0){
if(info)info.textContent='⚠️ AI tidak menemukan harga pasar yang cukup yakin utk produk ini'+(item&&item.source?': '+item.source:'')+'.';
return;
}
const min=Math.round(Number(item.min)),max=isFinite(Number(item.max))&&Number(item.max)>0?Math.round(Number(item.max)):min;
this._marketMin=min;this._marketMax=max;
if(info)info.textContent=`📊 Harga pasar sejenis (via AI): ${fmt(min)}–${fmt(max)} · 📌 ${item.source||'sumber tidak disebutkan'}. Cek ulang ke toko/marketplace ya, ini estimasi AI.`;
}catch(e){
if(info)info.textContent='⚠️ Gagal cek: '+(e.message||String(e));
}
},
apply(){
const result=this.calc();
if(!result){toast('⚠️ Isi Harga Beli/Modal dulu sebelum pakai rekomendasi');return;}
document.getElementById('pJual').value=result;
const resellerEl=document.getElementById('pReseller');
if(resellerEl&&!resellerEl.value){
const modal=parseFloat(document.getElementById('pBeli')?.value)||0;
const transport=parseFloat(document.getElementById('prkTransport')?.value)||0;
const marginPct=parseFloat(document.getElementById('prkMargin')?.value)||0;
const resellerMargin=marginPct*0.6;
resellerEl.value=this.roundNice((modal+transport)*(1+resellerMargin/100));
}
toast('✅ Harga Jual (& Reseller kalau kosong) terisi dari rekomendasi');
}
};
// OngkirCalc — kalkulator biaya angkut berdasarkan jarak, dipakai buat isi "Biaya Transport/Unit"
// di panel PriceReko di atas (kw190-ongkir-jarak). Rute bisnis cobek: [Ambil ke Produsen] -> [Pekalongan]
// -> lalu opsional [Pekalongan -> Rumah Konsumen] kalau diantar, atau berhenti di Pekalongan kalau
// konsumen ambil sendiri. Formula per etape: (Ongkos/km × Jarak km PP) ÷ Jumlah pcs yang diangkut
// sekali jalan — makin banyak pcs dibawa dalam 1x jalan, makin murah ongkos per pcs-nya. Total biaya
// transport per pcs = jumlah semua etape yang dipakai (etape 2 di-skip kalau metode "ambil sendiri").
const OngkirCalc={
_metode:'antar',
_result:0,
// kw192-ongkir-produsen-pref: preferensi jarak & ongkos/km Etape 1 (Ambil ke Produsen) disimpan
// per Produsen (D.produsen[].jarakKm/biayaPerKm) supaya user tidak perlu isi ulang jarak yang sama
// tiap kali buka panel ini utk produk dari produsen yg sama — rute ke 1 produsen kan tetap sama.
// Etape 2 (Pekalongan->Rumah Konsumen) SENGAJA tidak disimpan krn beda-beda tiap order/konsumen.
getProdusenId(){
return document.getElementById('pProdusen')?.value||'';
},
prefillFromProdusen(){
const produsenId=this.getProdusenId();
const pr=produsenId?D.produsen.find(x=>x.id===produsenId):null;
const kmEl=document.getElementById('ongkirKmProdusen');
const biayaEl=document.getElementById('ongkirBiayaProdusen');
const hint=document.getElementById('ongkirProdusenPrefHint');
if(pr&&pr.jarakKm>0){
if(kmEl&&!kmEl.value)kmEl.value=pr.jarakKm;
if(biayaEl&&!biayaEl.value&&pr.biayaPerKm>0)biayaEl.value=pr.biayaPerKm;
if(hint)hint.textContent=`📍 Rute tersimpan utk ${pr.name}: ${pr.jarakKm} km${pr.biayaPerKm>0?' × '+fmt(pr.biayaPerKm)+'/km':''} — otomatis terisi, edit bebas kalau beda & simpan ulang kalau perlu.`;
} else if(hint){
hint.textContent=pr?`💡 Belum ada rute tersimpan utk ${pr.name} — isi jarak & ongkos di bawah, lalu "💾 Simpan" biar tidak perlu isi ulang lain kali.`:'';
}
},
saveProdusenPref(){
const produsenId=this.getProdusenId();
if(!produsenId){toast('⚠️ Pilih Produsen dulu di atas (bukan "Tanpa produsen")');return;}
const pr=D.produsen.find(x=>x.id===produsenId);
if(!pr){toast('⚠️ Produsen tidak ditemukan');return;}
const km=parseFloat(document.getElementById('ongkirKmProdusen')?.value)||0;
const biaya=parseFloat(document.getElementById('ongkirBiayaProdusen')?.value)||0;
if(km<=0){toast('⚠️ Isi Jarak (km) Etape 1 dulu sebelum disimpan');return;}
pr.jarakKm=km;
pr.biayaPerKm=biaya;
save();
this.prefillFromProdusen();
toast(`✅ Rute ke ${pr.name} disimpan (${km} km${biaya>0?' × '+fmt(biaya)+'/km':''}) — otomatis terisi lain kali`);
},
leg(biayaPerKm,jarakKm,pcs){
const rp=parseFloat(biayaPerKm)||0;
const km=parseFloat(jarakKm)||0;
const n=parseFloat(pcs)||0;
if(n<=0)return 0;
return(rp*km)/n;
},
toggle(){
const panel=document.getElementById('ongkirCalcPanel');
if(!panel)return;
const willOpen=panel.classList.contains('u-dnone');
panel.classList.toggle('u-dnone');
if(willOpen){this.prefillFromProdusen();this.calc();}
},
setMetode(metode,el){
this._metode=metode;
document.querySelectorAll('#ongkirMetodeToggle .chip-btn').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
const etape2=document.getElementById('ongkirEtape2Fields');
if(etape2)etape2.style.opacity=metode==='ambil'?'0.4':'1';
const kmEl=document.getElementById('ongkirKmKonsumen'),biayaEl=document.getElementById('ongkirBiayaKonsumen');
if(kmEl)kmEl.disabled=metode==='ambil';
if(biayaEl)biayaEl.disabled=metode==='ambil';
this.calc();
},
calc(){
const pcs=parseFloat(document.getElementById('ongkirPcs')?.value)||0;
const kmProdusen=document.getElementById('ongkirKmProdusen')?.value;
const biayaProdusen=document.getElementById('ongkirBiayaProdusen')?.value;
const kmKonsumen=document.getElementById('ongkirKmKonsumen')?.value;
const biayaKonsumen=document.getElementById('ongkirBiayaKonsumen')?.value;
const legProdusen=this.leg(biayaProdusen,kmProdusen,pcs);
const legKonsumen=this._metode==='antar'?this.leg(biayaKonsumen,kmKonsumen,pcs):0;
const total=legProdusen+legKonsumen;
this._result=total;
const resEl=document.getElementById('ongkirResult');
if(resEl)resEl.textContent=fmtFull(Math.round(total));
const bdEl=document.getElementById('ongkirBreakdown');
if(bdEl){
if(pcs<=0){bdEl.textContent='Isi jumlah pcs yang diangkut dulu';}
else{
const parts=[`Ambil-Produsen ${fmt(Math.round(legProdusen))}/pcs`];
if(this._metode==='antar')parts.push(`Pekalongan-Rumah ${fmt(Math.round(legKonsumen))}/pcs`);
bdEl.textContent=parts.join(' + ')+` (÷ ${pcs} pcs sekali jalan)`;
}
}
return total;
},
applyToTransport(){
const total=this.calc();
if(!total){toast('⚠️ Isi jarak, ongkos/km, & jumlah pcs dulu');return;}
const rounded=Math.round(total/100)*100;
const t=document.getElementById('prkTransport');
if(t)t.value=rounded;
PriceReko.calc();
toast(`✅ Biaya Transport/Unit diisi ${fmtFull(rounded)} dari hitungan jarak`);
},
// autoFillBiaya — "🔄 Isi dari rata-rata BBM" versi OngkirCalc (kw191-ongkir-jarak). Beda dari
// PriceReko.autoFillTransport() (yg cuma pakai harga/liter mentah sbg tebakan kasar): di sini dihitung
// SUNGGUHAN dari konsumsi BBM kendaraan (km/liter, lihat estimateRpPerKm() di
// tukang-absensi.js) supaya Ongkos/km lebih akurat drpd isi manual tebak-tebak.
// Isi KEDUA field Ongkos/km (Etape 1 & 2) sekaligus krn nilainya sama (ongkos per km kendaraan yg
// dipakai, terlepas dari etape mana) -- field jarak & jumlah pcs TETAP harus diisi manual krn beda2
// per order.
async autoFillBiaya(){
const vehicles=D.vehicles||[];
if(!vehicles.length){toast('⚠️ Belum ada data kendaraan di Catatan Mobil');return;}
let vehicleId;
if(vehicles.length===1){
vehicleId=vehicles[0].id;
}else{
const idx=await showChoiceModal({title:'Pakai Kendaraan Mana?',message:'Pilih kendaraan yg dipakai buat angkut barang, biar Ongkos/km dihitung dari konsumsi BBM kendaraan itu.',choices:vehicles.map(v=>({label:`${v.emoji} ${v.name}`}))});
if(idx===null)return;
vehicleId=vehicles[idx].id;
}
const veh=vehicles.find(v=>v.id===vehicleId);
const est=(typeof estimateRpPerKm==='function')?estimateRpPerKm(vehicleId):null;
if(!est){toast(`⚠️ Data BBM ${veh?veh.name:'kendaraan ini'} belum cukup (butuh min. 2 catatan "Isi Full Tank" dgn KM naik) — isi manual dulu ya`,6000);return;}
const rounded=Math.round(est.rpPerKm);
const p=document.getElementById('ongkirBiayaProdusen');
const k=document.getElementById('ongkirBiayaKonsumen');
if(p)p.value=rounded;
if(k)k.value=rounded;
this.calc();
const kmPerLiterStr=est.kmPerLiter.toFixed(1);
toast(`✅ Ongkos/km diisi ${fmtFull(rounded)} dari konsumsi ${veh?veh.name:''} (≈${kmPerLiterStr} km/liter, harga BBM ${fmtFull(Math.round(est.avgHarga))}/liter)`,7000);
}
};
// PriceRekoWidget — widget dashboard "🤖 Rekomendasi Harga Jual AI" di tab Etalase (kartu di atas
// daftar produk). Beda dari PriceReko di atas (yang manual, per-produk, di dalam productModal):
// widget ini SCAN OTOMATIS semua produk yang sudah punya Harga Beli & Harga Jual, bandingkan Harga
// Jual sekarang dengan estimasi rule-based (margin rata-rata produk sejenis sekategori + rata-rata
// biaya transport dari BBM terakhir — formula sama seperti PriceReko.calc), lalu tandai produk yang
// harganya menyimpang >=THRESHOLD_PCT dari estimasi (kemahalan ATAU kemurahan).
// SENGAJA TIDAK memanggil AI/web search (gratis & instan, jalan tiap render tanpa kuota/API key) —
// kalau mau verifikasi ke harga pasar sungguhan, tombol "🔍" di tiap baris membuka productModal
// produk itu & otomatis buka panel PriceReko yang sudah ada, tinggal tap "🔍 Cek Harga Pasar via AI".
const PriceRekoWidget={
THRESHOLD_PCT:15,
avgTransport(){
const recent=(D.bbmLogs||[]).filter(b=>b.liter>0&&b.harga>0).slice(-10);
if(!recent.length)return 0;
return recent.reduce((s,b)=>s+b.harga,0)/recent.length;
},
avgMarginForKategori(kategoriId,excludeId){
const sejenis=(D.products||[]).filter(p=>p.kategoriId===kategoriId&&p.id!==excludeId&&p.hargaBeli>0&&p.hargaJual>0);
if(!sejenis.length)return 50;
const margins=sejenis.map(p=>((p.hargaJual-p.hargaBeli)/p.hargaBeli)*100).filter(m=>isFinite(m)&&m>0);
if(!margins.length)return 50;
return margins.reduce((a,b)=>a+b,0)/margins.length;
},
// avgMarginForPair (kw206-cobek-size-pairing) — versi avgMarginForKategori yg dipersempit ke produk
// PASANGAN UKURAN yg sama (lihat Etalase.pairKey), dipakai lebih dulu di recommend() sebelum fallback
// ke avgMarginForKategori (kategoriId D.cobekKategori itu tier Kecil/Sedang/Besar, kurang relevan
// dibanding produk dgn bentuk & bracket ukuran yg persis sama). Balikin null (bukan fallback 50) kalau
// produk ini tidak punya pairKey (mis. kategori alu/muntu) atau tidak ada pasangan dgn data harga.
avgMarginForPair(product){
const siblings=Etalase.pairSiblings(product).filter(p=>p.hargaBeli>0&&p.hargaJual>0);
if(!siblings.length)return null;
const margins=siblings.map(p=>((p.hargaJual-p.hargaBeli)/p.hargaBeli)*100).filter(m=>isFinite(m)&&m>0);
if(!margins.length)return null;
return margins.reduce((a,b)=>a+b,0)/margins.length;
},
recommend(p){
const transport=this.avgTransport();
const marginPct=this.avgMarginForPair(p)??this.avgMarginForKategori(p.kategoriId,p.id);
const base=(p.hargaBeli||0)+transport;
return PriceReko.roundNice(base*(1+marginPct/100));
},
// checkOne(p) — versi per-produk dari scan(), dipakai bareng di sini (Etalase) & di titik jual
// (Kasir/Order, lihat kasir.js & Order.renderItems di bawah) supaya SATU rumus rekomendasi yg
// sama dipakai konsisten di semua tempat, bukan reimplementasi terpisah. Balikin null kalau
// produk belum punya Harga Beli/Jual, atau kalau selisihnya masih di bawah THRESHOLD_PCT.
checkOne(p){
if(!p||!(p.hargaBeli>0)||!(p.hargaJual>0))return null;
const reko=this.recommend(p);
if(!(reko>0))return null;
const diffPct=((p.hargaJual-reko)/reko)*100;
if(Math.abs(diffPct)<this.THRESHOLD_PCT)return null;
return{reko,diffPct};
},
scan(){
return(D.products||[]).map(p=>{
const chk=this.checkOne(p);
return chk?{product:p,reko:chk.reko,diffPct:chk.diffPct}:null;
}).filter(Boolean)
.sort((a,b)=>Math.abs(b.diffPct)-Math.abs(a.diffPct));
},
render(){
const card=document.getElementById('priceRekoWidgetCard');
const list=document.getElementById('priceRekoWidgetList');
if(!card||!list)return;
const flagged=this.scan();
if(!flagged.length){card.style.display='none';list.innerHTML='';return;}
card.style.display='';
list.innerHTML=flagged.map(({product,reko,diffPct})=>{
const under=diffPct<0;
const badgeColor=under?'var(--accent2)':'var(--accent4)';
const badgeText=under?`⬇️ ${Math.abs(Math.round(diffPct))}% di bawah estimasi`:`⬆️ ${Math.round(diffPct)}% di atas estimasi`;
return`<div class="tx-item">
        <div class="tx-icon u-bgaccsoft">🪨</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(product.name)}</div>
          <div class="tx-meta">Sekarang ${fmt(product.hargaJual)} → Estimasi ${fmt(reko)}</div>
          <div class="tx-meta u-mt2" style="color:${badgeColor};font-weight:700">${badgeText}</div>
        </div>
        <button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="applyPriceRekoWidgetOne" data-args="${escapeHtml(JSON.stringify([product.id]))}" aria-label="Terapkan">✅</button>
        <button class="tx-del" data-action="openPriceRekoWidgetDetail" data-args="${escapeHtml(JSON.stringify([product.id]))}" aria-label="Detail">🔍</button>
      </div>`;
}).join('');
},
async applyOne(productId){
const idx=(D.products||[]).findIndex(p=>p.id===productId);
if(idx<0)return;
const p=D.products[idx];
const reko=this.recommend(p);
if(!reko){toast('⚠️ Tidak bisa hitung estimasi (isi dulu Harga Beli)');return;}
if(!await askConfirm(`Ubah Harga Jual "${p.name}" dari ${fmt(p.hargaJual)} jadi ${fmt(reko)}?`))return;
p.hargaJual=reko;
save();this.render();renderProductList();
toast(`✅ Harga Jual "${p.name}" diperbarui ke ${fmtFull(reko)}`);
},
openDetail(productId){
const idx=(D.products||[]).findIndex(p=>p.id===productId);
if(idx<0)return;
Etalase.openModal(idx);
// otomatis buka panel "Rekomendasi Harga Jual" yg sudah ada di productModal, biar tinggal tap
// "🔍 Cek Harga Pasar via AI" tanpa perlu cari-cari tombolnya lagi
setTimeout(()=>{const panel=document.getElementById('priceRekoPanel');if(panel&&panel.classList.contains('u-dnone'))PriceReko.toggle();},50);
}
};
// StockRekoWidget — widget dashboard "📦 Rekomendasi Restock AI" di tab Etalase, di bawah
// PriceRekoWidget. Sama-sama rule-based & gratis (tanpa panggil AI/web search): hitung kecepatan
// jual tiap produk dari histori Penjualan Shop (D.cobek, LOOKBACK_DAYS terakhir), lalu bandingkan
// sisa stok dgn kecepatan itu buat estimasi "berapa hari lagi stok habis" & "berapa unit perlu
// ditambah supaya cukup utk COVER_DAYS ke depan". Produk tanpa histori penjualan tapi stoknya sudah
// ≤2 tetap ditandai (mode "belum cukup data") supaya tidak lolos dari perhatian.
const StockRekoWidget={
LOOKBACK_DAYS:30,
COVER_DAYS:30,
URGENT_DAYS:14,
soldQty(productId,days){
const since=new Date();since.setDate(since.getDate()-days);
let qty=0;
(D.cobek||[]).forEach(c=>{
if(!c.items)return;
const d=new Date(c.date);
if(isNaN(d)||d<since)return;
c.items.forEach(it=>{if(it.productId===productId)qty+=(it.qty||0);});
});
return qty;
},
// groupForScan (kw206-cobek-size-pairing) — kelompokkan D.products jadi unit-unit yg mau dianalisa:
// produk dgn pairKey sama (mis. "Lumpang 20cm" & "lumpang 19cm") digabung jadi SATU unit gabungan
// (stok & histori penjualan dijumlah) supaya estimasi "berapa hari lagi habis"/"saran tambah" tidak
// pecah jadi 2 angka kecil yg saling tidak nyambung padahal sama2 masuk bracket harga yg sama. Produk
// tanpa pairKey (termasuk kategori alu/muntu, sesuai instruksi user) tetap dianalisa satu-satu seperti
// semula.
groupForScan(){
const products=D.products||[];
const groups=[];
const seen=new Set();
products.forEach(p=>{
if(seen.has(p.id))return;
const key=Etalase.pairKey(p);
if(!key){groups.push({members:[p],label:p.name,primary:p});seen.add(p.id);return;}
const members=products.filter(x=>Etalase.pairKey(x)===key);
members.forEach(m=>seen.add(m.id));
const primary=members.reduce((a,b)=>(b.stock||0)>(a.stock||0)?b:a,members[0]);
groups.push({members,label:Etalase.pairLabel(primary),primary});
});
return groups;
},
scan(){
return this.groupForScan().map(({members,label,primary})=>{
const stock=members.reduce((s,m)=>s+(m.stock||0),0);
const sold=members.reduce((s,m)=>s+this.soldQty(m.id,this.LOOKBACK_DAYS),0);
const velocity=sold/this.LOOKBACK_DAYS;
const hasHistory=sold>0;
const daysLeft=hasHistory?stock/velocity:(stock<=2?0:Infinity);
const restockQty=hasHistory?Math.max(0,Math.ceil(velocity*this.COVER_DAYS-stock)):(stock<=2?5:0);
const product=members.length>1?{...primary,name:label,stock}:primary;
return{product,members,sold,velocity,hasHistory,daysLeft,restockQty};
}).filter(x=>x.daysLeft<=this.URGENT_DAYS&&(x.hasHistory||x.product.stock<=2))
.sort((a,b)=>a.daysLeft-b.daysLeft);
},
render(){
const card=document.getElementById('stockRekoWidgetCard');
const list=document.getElementById('stockRekoWidgetList');
if(!card||!list)return;
const flagged=this.scan();
if(!flagged.length){card.style.display='none';list.innerHTML='';return;}
card.style.display='';
list.innerHTML=flagged.map(({product,members,hasHistory,velocity,daysLeft,restockQty})=>{
const badgeText=hasHistory
?`⏳ Estimasi ~${Math.max(0,Math.round(daysLeft))} hari lagi habis (rata-rata jual ${(velocity*7).toFixed(1)}/minggu)`
:'⚠️ Stok menipis, belum cukup data histori penjualan';
const pairNote=members.length>1?` <span class="u-t2">(gabungan: ${members.map(m=>escapeHtml(m.name)).join(', ')})</span>`:'';
return`<div class="tx-item">
        <div class="tx-icon u-bgaccsoft">📦</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(product.name)}${pairNote}</div>
          <div class="tx-meta">Sisa stok: ${product.stock||0}${restockQty>0?` · Saran tambah ${restockQty} unit`:''}</div>
          <div class="tx-meta u-mt2" style="color:var(--accent2);font-weight:700">${badgeText}</div>
        </div>
        <button class="tx-del" data-action="openStockRekoWidgetDetail" data-args="${escapeHtml(JSON.stringify([product.id,restockQty]))}" aria-label="Detail">🔍</button>
      </div>`;
}).join('');
},
openDetail(productId,restockQty){
const idx=(D.products||[]).findIndex(p=>p.id===productId);
if(idx<0)return;
Etalase.openModal(idx);
// prefill kolom Stok dgn saran stok baru (stok sekarang + restockQty), user tetap pilih akun &
// bisa ubah angkanya sendiri sebelum simpan (sama seperti nambah stok manual biasa)
if(restockQty>0){
setTimeout(()=>{
const stockEl=document.getElementById('pStock');
if(stockEl)stockEl.value=(D.products[idx].stock||0)+restockQty;
},50);
}
}
};
