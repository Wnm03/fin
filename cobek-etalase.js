// cobek-etalase.js — Domain Shop bagian Etalase: katalog produk (tambah/edit/hapus,
// size-pairing bracket harga, bundle, modal stok tertanam), stok, & produsen terkait produk.
// Dipecah dari cobek.js (2026-07-12, file lama 1966 baris > 500 baris) menjadi 5 file:
// cobek-etalase.js, cobek-pricing.js, cobek-order.js, cobek-tx-cart.js, cobek-io.js —
// MURNI pemotongan baris (tanpa ubah urutan/logic), jadi harus tetap dimuat BERURUTAN
// persis seperti urutan di atas (lihat GROUP_A di build.js) supaya perilaku identik dgn
// cobek.js lama.

// cobek.js — Domain Shop: etalase/stok produk, produsen, order pelanggan, laporan omzet, data pelanggan,
// widget dashboard "🤖 Rekomendasi Harga Jual AI" (PriceRekoWidget, kw73) & "📦 Rekomendasi Restock AI"
// (StockRekoWidget, kw74) — keduanya rule-based, tanpa panggil AI/web search.
// Dipisah dari: features-etalase-piutang-renovai.js, features-renovasi-pajak-aset-order.js,
// features-budget-laporan-carnotes-pelanggan.js, features-gaji-shop-tagihan.js (kini transaksi.js),
// features-aiwidget-reminder-gdrive-search.js, backup-restore.js, modules-render.js
// PENTING: harus dimuat SETELAH features-helpers-global-security.js tidak wajib (D dipakai di dalam method, bukan top-level),
// tapi tetap taruh di GROUP_A dekat modul lain yg saling terkait (lihat build.js).
// CATATAN: dispatcher form transaksi gabungan (updateTxVehiclePanels/saveTx di transaksi.js,
// dulu di features-gaji-shop-tagihan.js) TETAP terpisah karena juga menangani domain
// BBM/Sparepart (Car Notes) — lihat PEMISAHAN-FILE-ROADMAP.md.

const Etalase={
editIdx:null,
// pairKey/parseSizeName (kw206-cobek-size-pairing): banyak produk shop dijual "2 ukuran 1 harga"
// (mis. "Lumpang 20cm" & "lumpang 19cm" sama-sama masuk bracket harga "19-20cm"). Nama produk
// ditulis bebas per-unit stok (ukuran presisi tiap batu beda-beda), tapi HARGA & rekomendasi
// margin/kecepatan-jual seharusnya dianggap satu kelompok per bracket ganjil-genap 2cm, supaya tidak
// pecah jadi angka yang saling tidak nyambung (lihat keluhan user: estimasi PriceReko & restock utk
// tiap ukuran individual saling beda2 padahal harusnya sama). Dikecualikan: kategori "alu"/"muntu"
// (harga per-ukuran, TIDAK dipasangkan) — sesuai instruksi user, bukan berdasar kategoriId (D.cobekKategori
// dipakai untuk tier ukuran umum Kecil/Sedang/Besar, BUKAN bentuk barang), tapi berdasar kata pertama
// di NAMA produk itu sendiri ("sync otomatis sesuai nama").
parseSizeName(name){
if(!name)return null;
const m=String(name).trim().match(/^([a-zA-Z]+)\s+(\d+)(?:\s*[-–]\s*(\d+))?\s*cm(.*)$/i);
if(!m)return null;
return{shape:m[1].toLowerCase(),size1:parseInt(m[2],10),size2:m[3]?parseInt(m[3],10):null,suffix:m[4].trim().toLowerCase()};
},
NO_PAIR_SHAPES:['alu','muntu','munthu','munthu/ulekan'],
// bracketRange — shape+bracket TANPA suffix (dipakai buat mencocokkan bundle "+alu/+muntu" ke produk
// dasarnya yg polos, lihat bundleAddonShape/applyBundleLinkedStock kw207-cobek-bundle-addon).
bracketRange(product){
if(!product||!product.name)return null;
const parsed=this.parseSizeName(product.name);
if(!parsed)return null;
if(this.NO_PAIR_SHAPES.includes(parsed.shape))return null;
let start,end;
if(parsed.size2!=null){start=Math.min(parsed.size1,parsed.size2);end=Math.max(parsed.size1,parsed.size2);}
else{start=(parsed.size1%2===0)?parsed.size1-1:parsed.size1;end=start+1;}
return`${parsed.shape}|${start}-${end}`;
},
pairKey(product){
const range=this.bracketRange(product);
if(!range)return null;
const parsed=this.parseSizeName(product.name);
return`${range}|${parsed.suffix}`;
},
// bundleAddonShape (kw207-cobek-bundle-addon) — user jelaskan: produk kayak "Cobek 19-20cm+muntu"
// / "Lumpang 20cm+alu" itu BUKAN cuma nama, tapi bundle sungguhan = 1 cobek/lumpang ukuran itu + 1
// alu/muntu digabung jual 1 harga. Balikin 'alu'/'muntu' kalau nama produk mengandung penanda itu
// di suffix (bagian sesudah "...cm"), else null.
bundleAddonShape(product){
const parsed=this.parseSizeName(product&&product.name);
if(!parsed)return null;
const m=parsed.suffix.match(/\b(alu|muntu)\b/i);
return m?m[1].toLowerCase():null;
},
pairLabel(product){
const parsed=this.parseSizeName(product.name);
if(!parsed)return product.name;
const key=this.pairKey(product);
if(!key)return product.name;
const range=key.split('|')[2];
const shapeCap=parsed.shape.charAt(0).toUpperCase()+parsed.shape.slice(1);
return`${shapeCap} ${range}cm${parsed.suffix?' '+parsed.suffix:''}`;
},
pairSiblings(product){
const key=this.pairKey(product);
if(!key)return[];
return(D.products||[]).filter(p=>p.id!==product.id&&this.pairKey(p)===key);
},
// syncPairedPrice — dipanggil sesudah save() produk. Kalau produk ini punya pasangan ukuran
// (pairKey non-null) & Harga Jual-nya beda dari pasangannya, samakan SEMUA pasangan ke harga yg baru
// disimpan (yang terakhir diedit menang), lalu kasih toast biar user tahu ada produk lain yg ikut
// ke-update otomatis.
syncPairedPrice(product){
const siblings=this.pairSiblings(product);
if(!siblings.length)return;
const changed=siblings.filter(s=>s.hargaJual!==product.hargaJual);
if(!changed.length)return;
changed.forEach(s=>{s.hargaJual=product.hargaJual;});
save();
this.renderList();
toast(`🔗 Harga Jual ${changed.length} produk pasangan (${changed.map(s=>s.name).join(', ')}) ikut disinkron ke ${fmtFull(product.hargaJual)}`,6000);
},
// totalModalStok/totalNilaiJualStok (kw208-cobek-modal-stok) — total uang modal (HPP) yg masih
// "tertanam" di stok gudang (belum jadi uang tunai lagi sampai terjual), & estimasi nilai jualnya
// kalau semua stok itu laku di Harga Jual sekarang. Dipakai di kartu ringkasan tab Shop (cModalStok/
// cNilaiJualStok) & disuntikkan ke konteks chat AI (features-aiwidget-reminder-gdrive-search.js)
// supaya analisa keuangan AI tahu ada uang yg "nyangkut" di bentuk barang, bukan cuma saldo akun.
totalModalStok(){
return(D.products||[]).reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
},
totalNilaiJualStok(){
return(D.products||[]).reduce((s,p)=>s+((p.stock||0)*(p.hargaJual||0)),0);
},
renderModalStat(){
const elModal=document.getElementById('cModalStok');
const elJual=document.getElementById('cNilaiJualStok');
if(elModal)elModal.textContent=fmt(this.totalModalStok());
if(elJual)elJual.textContent=fmt(this.totalNilaiJualStok());
},
openModal(idx){
this.editIdx=(typeof idx==='number')?idx:null;
const isEdit=this.editIdx!==null;
document.getElementById('productModalTitle').textContent=isEdit?'Edit Produk':'Tambah Produk';
const p=isEdit?D.products[this.editIdx]:null;
document.getElementById('pName').value=p?p.name:'';
document.getElementById('pStock').value=p?p.stock:'';
document.getElementById('pKategori').value=p?shopKategoriName(p.kategoriId):'';
document.getElementById('pKategoriList').innerHTML=D.cobekKategori.map(k=>`<option value="${escapeHtml(k.name)}">`).join('');
const pProdusenEl=document.getElementById('pProdusen');
if(pProdusenEl){
pProdusenEl.innerHTML='<option value="">— Tanpa produsen —</option>'+D.produsen.map(pr=>`<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('')+'<option value="__new__">➕ Produsen Baru</option>';
pProdusenEl.value=p&&p.produsenId?p.produsenId:'';
}
document.getElementById('pBeli').value=p?p.hargaBeli:'';
document.getElementById('pJual').value=p?p.hargaJual:'';
document.getElementById('pReseller').value=p&&p.hargaReseller?p.hargaReseller:'';
document.getElementById('pDiskon').value=p&&p.diskonPersen?p.diskonPersen:'';
const pAccEl=document.getElementById('pAcc');
if(pAccEl) pAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const hint=document.getElementById('pAccHint');
if(hint) hint.textContent=isEdit?'Hanya dipakai kalau angka Stok di atas kamu naikkan (tambah stok) — selisihnya tercatat otomatis sebagai pengeluaran modal.':'Stok awal akan tercatat otomatis sebagai pengeluaran modal dari akun ini.';
PriceReko.reset();
openModal('productModal');
},
async onProdusenChange(){
const sel=document.getElementById('pProdusen');
if(!sel)return;
if(sel.value==='__new__'){
const name=await showPromptModal({title:'Produsen Baru',message:'Nama produsen baru:',icon:'🏭'});
if(name&&name.trim()){
const np={id:'prd_'+Date.now(),name:name.trim(),contact:'',note:''};
D.produsen.push(np);
save();
sel.innerHTML='<option value="">— Tanpa produsen —</option>'+D.produsen.map(pr=>`<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('')+'<option value="__new__">➕ Produsen Baru</option>';
sel.value=np.id;
} else { sel.value=''; }
}
const isEdit=this.editIdx!==null;
if(isEdit&&sel.value){
const p=D.products[this.editIdx];
if(p&&p.hargaByProdusen&&p.hargaByProdusen[sel.value]){
document.getElementById('pBeli').value=p.hargaByProdusen[sel.value];
}
}
// kw192-ongkir-produsen-pref: ganti Produsen -> reset Etape1 (jarak/ongkos Ambil ke Produsen) lalu
// isi ulang dari preferensi produsen yang baru dipilih (kalau ada & panel Ongkir sedang kebuka).
const ongkirKmEl=document.getElementById('ongkirKmProdusen');
const ongkirBiayaEl=document.getElementById('ongkirBiayaProdusen');
if(ongkirKmEl)ongkirKmEl.value='';
if(ongkirBiayaEl)ongkirBiayaEl.value='';
if(typeof OngkirCalc!=='undefined'){
OngkirCalc.prefillFromProdusen();
OngkirCalc.calc();
}
},
save(){
const name=document.getElementById('pName').value.trim();
const stock=parseInt(document.getElementById('pStock').value)||0;
const kategoriName=document.getElementById('pKategori').value.trim();
const produsenSel=document.getElementById('pProdusen');
const produsenId=produsenSel&&produsenSel.value!=='__new__'?produsenSel.value:'';
const hargaBeli=parseFloat(document.getElementById('pBeli').value)||0;
const hargaJual=parseFloat(document.getElementById('pJual').value)||0;
const hargaReseller=parseFloat(document.getElementById('pReseller').value)||null;
const diskonPersen=parseFloat(document.getElementById('pDiskon').value)||0;
if(!name||!hargaJual){toast('⚠️ Lengkapi nama & harga jual');return;}
const accId=document.getElementById('pAcc')?document.getElementById('pAcc').value:D.accounts[0]?.id;
const prevStock=this.editIdx!==null?(D.products[this.editIdx].stock||0):0;
const delta=stock-prevStock;
const kategoriId=resolveShopKategori(kategoriName);
let product;
if(this.editIdx!==null){
product=D.products[this.editIdx];
Object.assign(product,{name,stock,hargaBeli,hargaJual,hargaReseller,diskonPersen,kategoriId});
} else {
product={id:'prod_'+Date.now(),name,stock,hargaBeli,hargaJual,hargaReseller,diskonPersen,kategoriId,produsenId:'',hargaByProdusen:{}};
D.products.push(product);
}
if(!product.hargaByProdusen)product.hargaByProdusen={};
if(produsenId){
product.produsenId=produsenId;
if(hargaBeli>0)product.hargaByProdusen[produsenId]=hargaBeli;
}
const produsenName=produsenId?(D.produsen.find(pr=>pr.id===produsenId)||{}).name:'';
const kategoriLabel=kategoriName?` · kategori ${kategoriName}`:'';
const produsenLabel=produsenName?` · dari ${produsenName}`:'';
if(delta>0&&hargaBeli>0){
const cost=delta*hargaBeli;
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:`Beli stok ${name} x${delta}${kategoriLabel}${produsenLabel} (modal shop)`,date:new Date().toISOString().split('T')[0],stockProductId:product.id,stockQty:delta,produsenId:produsenId||undefined,kategoriId:kategoriId||undefined});
save();closeModal('productModal');this.renderList();renderDashboard();renderKeuangan();
toast(`✅ Produk disimpan, +${delta} stok tercatat sbg pengeluaran ${fmtFull(cost)}`);
this.syncPairedPrice(product);
return;
}
save();closeModal('productModal');this.renderList();toast('✅ Produk disimpan (hanya update, tanpa transaksi)');
this.syncPairedPrice(product);
},
async delete(i){
if(!await askConfirm('Hapus produk ini dari etalase?'))return;
D.products.splice(i,1);save();this.renderList();toast('🗑 Dihapus');
},
renderList(){
const el=document.getElementById('productList');
if(!el)return;
if(!D.products.length){el.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada produk</div></div>';return;}
el.innerHTML=D.products.map((p,i)=>{
const margin=p.hargaJual-p.hargaBeli;
const marginPct=p.hargaBeli>0?Math.round((margin/p.hargaBeli)*100):0;
const stockCls=p.stock<=2?'low':(p.stock<=5?'mid':'ok');
const stockLbl=p.stock<=2?'Menipis':(p.stock<=5?'Terbatas':'Aman');
const kat=shopKategoriName(p.kategoriId);
const prod=p.produsenId?(D.produsen.find(pr=>pr.id===p.produsenId)||{}).name:'';
const hasDiskon=p.diskonPersen>0;
const finalHarga=hasDiskon?Math.round(p.hargaJual*(1-p.diskonPersen/100)):p.hargaJual;
const priceBlock=hasDiskon
?`<div class="shop-price-strike">${fmt(p.hargaJual)}</div><div class="shop-price-final discounted">${fmt(finalHarga)}<span class="shop-diskon-badge">-${p.diskonPersen}%</span></div>`
:`<div class="shop-price-final">${fmt(p.hargaJual)}</div>`;
return`<div class="shop-product-card stock-${stockCls}">
        <div class="shop-product-head">
          <div>
            <div class="shop-product-name">${escapeHtml(p.name)}</div>
            <div class="shop-product-tags">
              ${kat?`<span class="shop-tag cat">🏷️ ${escapeHtml(kat)}</span>`:''}
              ${prod?`<span class="shop-tag">🏭 ${escapeHtml(prod)}</span>`:''}
            </div>
          </div>
          <div class="shop-stock-pill ${stockCls}">${p.stock} pcs · ${stockLbl}</div>
        </div>
        <div class="shop-product-prices">
          <div>
            <div class="shop-price-label">Harga Jual</div>
            ${priceBlock}
            <div class="shop-price-sub">Modal ${fmt(p.hargaBeli)}${p.hargaReseller?' · Reseller '+fmt(p.hargaReseller):''}</div>
          </div>
          <div class="shop-product-right">
            <div class="shop-margin-badge">+${fmt(margin)} (${marginPct}%)</div>
            <div class="shop-product-actions">
              <button data-action="openProductModal" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit/Buka">✏️</button>
              <button data-action="delProduct" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
            </div>
          </div>
        </div>
      </div>`;
}).join('');
}
};
// PriceReko — widget "Rekomendasi Harga Jual" di dalam productModal.
// Formula: (Harga Beli + Biaya Transport/unit) × (1 + Target Margin%), lalu dibulatkan ke kelipatan rapi.
// Sumber angka bantu: rata-rata margin produk lain di kategori sama (D.products), rata-rata harga/liter BBM
// terakhir (D.bbmLogs) sbg estimasi kasar biaya transport, & opsional cek kisaran harga pasar lewat AI+web search
// (pola sama seperti RefAI/EduFund.checkAI yg sudah ada — pakai D.profile.apiKey/apiProvider).
