// cobek-order.js — Domain Shop bagian order & pelanggan: Produsen (supplier), SiapPulang
// (status siap diambil/dikirim), Order (order pelanggan), Laporan (omzet), Pelanggan
// (data & riwayat pelanggan). Bagian ke-3 dari 5 hasil pemecahan cobek.js — lihat catatan
// urutan load di cobek-etalase.js.

const Produsen={
editId:null,
hargaEditId:null,
openModal(id){
this.editId=id||null;
const isEdit=!!this.editId;
const pr=isEdit?D.produsen.find(x=>x.id===this.editId):null;
document.getElementById('produsenModalTitle').textContent=isEdit?'Edit Produsen':'Tambah Produsen';
document.getElementById('prName').value=pr?pr.name:'';
document.getElementById('prContact').value=pr?(pr.contact||''):'';
document.getElementById('prNote').value=pr?(pr.note||''):'';
openModal('produsenModal');
},
save(){
const name=document.getElementById('prName').value.trim();
const contact=document.getElementById('prContact').value.trim();
const note=document.getElementById('prNote').value.trim();
if(!name){toast('⚠️ Nama produsen wajib diisi');return;}
if(this.editId){
const pr=D.produsen.find(x=>x.id===this.editId);
if(pr)Object.assign(pr,{name,contact,note});
} else {
D.produsen.push({id:'prd_'+Date.now(),name,contact,note});
}
this.editId=null;
save();closeModal('produsenModal');this.renderList();toast('✅ Produsen disimpan');
},
async delete(id){
if(!await askConfirm('Hapus produsen ini? Harga yang sudah tercatat di produk tidak akan terhapus otomatis.'))return;
D.produsen=D.produsen.filter(x=>x.id!==id);
D.products.forEach(p=>{if(p.produsenId===id)p.produsenId='';});
save();this.renderList();toast('🗑 Produsen dihapus');
},
renderList(){
const el=document.getElementById('produsenList');
if(!el)return;
if(!D.produsen.length){el.innerHTML='<div class="empty"><div class="empty-icon">🏭</div><div class="empty-text">Belum ada produsen</div></div>';return;}
el.innerHTML=D.produsen.map(pr=>{
const products=D.products.filter(p=>p.hargaByProdusen&&p.hargaByProdusen[pr.id]!==undefined);
const hargaInfo=products.length?products.map(p=>`${escapeHtml(p.name)}: ${fmt(p.hargaByProdusen[pr.id])}`).join(', '):'Belum ada harga produk';
// kw192-ongkir-produsen-pref: tampilkan rute Etape1 tersimpan (kalau ada) sbg info tambahan
const ruteInfo=pr.jarakKm>0?`📍 ${pr.jarakKm} km${pr.biayaPerKm>0?' × '+fmt(pr.biayaPerKm)+'/km':''} · `:'';
return`<div class="tx-item">
        <div class="tx-icon" style="background:var(--accent2-soft)">🏭</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(pr.name)}</div><div class="tx-meta">${pr.contact?'📞 '+escapeHtml(pr.contact)+' · ':''}${ruteInfo}${escapeHtml(hargaInfo)}</div></div>
        <button class="tx-del u-cacc3" style="background:var(--accent3-soft);margin-right:6px" data-action="openProdusenHargaModal" data-args="${escapeHtml(JSON.stringify([pr.id]))}" aria-label="Edit/Buka">💰</button>
        <button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="openProdusenModal" data-args="${escapeHtml(JSON.stringify([pr.id]))}" aria-label="Edit/Buka">✏️</button>
        <button class="tx-del" data-action="delProdusen" data-args="${escapeHtml(JSON.stringify([pr.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join('');
},
openHargaModal(produsenId){
this.hargaEditId=produsenId;
const pr=D.produsen.find(x=>x.id===produsenId);
if(!pr)return;
document.getElementById('produsenHargaTitle').textContent='Atur Harga — '+pr.name;
const el=document.getElementById('produsenHargaList');
if(!D.products.length){
el.innerHTML='<div class="empty"><div class="empty-text">Belum ada produk di Etalase</div></div>';
} else {
el.innerHTML=D.products.map(p=>{
const harga=(p.hargaByProdusen&&p.hargaByProdusen[produsenId]!==undefined)?p.hargaByProdusen[produsenId]:'';
return`<div class="fg"><label class="fl">${escapeHtml(p.name)} <span class="u-t2">(harga jual ${fmt(p.hargaJual)})</span></label><input type="number" class="fi" data-prod-id="${p.id}" placeholder="Harga beli dari ${escapeHtml(pr.name)}" value="${harga}"></div>`;
}).join('');
}
openModal('produsenHargaModal');
},
saveHarga(){
if(!this.hargaEditId)return;
const inputs=document.querySelectorAll('#produsenHargaList input[data-prod-id]');
inputs.forEach(inp=>{
const p=D.products.find(x=>x.id===inp.getAttribute('data-prod-id'));
if(!p)return;
if(!p.hargaByProdusen)p.hargaByProdusen={};
const val=parseFloat(inp.value);
if(val>0)p.hargaByProdusen[this.hargaEditId]=val;
else delete p.hargaByProdusen[this.hargaEditId];
});
save();closeModal('produsenHargaModal');this.renderList();renderProductList();toast('✅ Harga produsen disimpan');
}
};

const SiapPulang={
toggleDeliveredField(){
const cb=document.getElementById('oDelivered');
const lbl=document.getElementById('oDeliveredLbl');
if(!cb||!lbl)return;
lbl.textContent=cb.checked?'✅ Sudah diserahkan ke pelanggan':'📦 Belum diserahkan (akan dibawa pulang)';
},
markDelivered(id){
const t=D.cobek.find(x=>x.id===id);
if(!t)return;
t.delivered=true;
save();this.render();renderShop();renderShopRecent();toast('✅ Ditandai sudah diserahkan');
},
render(){
const wrap=document.getElementById('siapPulangCard');
if(!wrap)return;
const pending=D.cobek.filter(c=>c.items && c.delivered===false);
if(!pending.length){wrap.style.display='none';wrap.innerHTML='';return;}
wrap.classList.remove('u-dnone');wrap.style.display='block';
const totalItems={};
pending.forEach(c=>c.items.forEach(i=>{totalItems[i.name]=(totalItems[i.name]||0)+i.qty;}));
const checklistHTML=Object.entries(totalItems).map(([name,qty])=>`<div class="siap-pulang-item"><span class="u-fs18">🪨</span><div class="u-flex1 u-fs13 u-fw600">${escapeHtml(name)}</div><span class="acc-chip">${qty}x</span></div>`).join('');
const ordersHTML=pending.map(c=>`
      <div class="siap-pulang-item">
        <div class="u-flex1">
          <div class="u-fs13 u-fw600">${c.customer&&c.customer.name?escapeHtml(c.customer.name):'Pelanggan'} · ${escapeHtml(c.items.map(i=>i.name+' x'+i.qty).join(', '))}</div>
          <div class="u-fs12t2">${c.date}${c.customer&&c.customer.phone?' · '+escapeHtml(c.customer.phone):''}</div>
        </div>
        <button class="btn btn-sm btn-primary" data-action="markShopDelivered" data-args="${escapeHtml(JSON.stringify([c.id]))}" aria-label="Hapus">✅ Sudah</button>
      </div>`).join('');
wrap.innerHTML=`
      <div class="card-title">📦 Siap Pulang — Barang Dibawa</div>
      <div class="u-fs12 u-t2 u-mb8">Pre-order pelanggan yang belum diserahkan. Pastikan dibawa pas pulang ke Pekalongan ya!</div>
      ${checklistHTML}
      <div class="div"></div>
      ${ordersHTML}
    `;
}
};

const Order={
items:[],
populateProductSelect(){
const sel=document.getElementById('oProductSelect');
if(!sel)return;
sel.innerHTML=D.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (stok ${p.stock})</option>`).join('')||'<option value="">Belum ada produk di etalase</option>';
},
openModal(){
if(!D.products.length){toast('⚠️ Tambah produk di Etalase dulu');return;}
Order.items=[];
document.getElementById('oDate').value=new Date().toISOString().split('T')[0];
['oCustName','oCustPhone','oCustAddr','oNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('oDiskon').value='';
document.getElementById('oOngkir').value='';
document.getElementById('oPriceType').value='jual';
const oCustHintEl=document.getElementById('oCustHint'); if(oCustHintEl){oCustHintEl.style.display='none';oCustHintEl.innerHTML='';}
const oDeliveredEl=document.getElementById('oDelivered'); if(oDeliveredEl){oDeliveredEl.checked=true;toggleOrderDeliveredField();}
const oAccEl=document.getElementById('oAcc');
if(oAccEl) oAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
Order.populateProductSelect();
Order.renderItems();
openModal('orderModal');
},
addItem(){
const pid=document.getElementById('oProductSelect').value;
const product=D.products.find(p=>p.id===pid);
if(!product){toast('⚠️ Pilih produk');return;}
const existing=Order.items.find(i=>i.productId===pid);
if(existing)existing.qty+=1;
else Order.items.push({productId:pid,qty:1,hargaOverride:null});
Order.renderItems();
},
updateItemHarga(idx,val){
const h=parseFloat(val);
if(!Order.items[idx])return;
Order.items[idx].hargaOverride=(h>0)?h:null;
const{total,profit}=Order.computeTotals();
document.getElementById('oTotalDisplay').textContent=fmtFull(total);
document.getElementById('oProfitDisplay').textContent='Estimasi untung: '+fmtFull(profit);
},
changeQty(idx,delta){
Order.items[idx].qty+=delta;
if(Order.items[idx].qty<=0)Order.items.splice(idx,1);
Order.renderItems();
},
removeItem(idx){Order.items.splice(idx,1);Order.renderItems();},
computeTotals(){
const priceType=document.getElementById('oPriceType').value;
let subtotal=0,modal=0;
const lines=Order.items.map(it=>{
const p=D.products.find(x=>x.id===it.productId);
if(!p)return null;
let hargaDefault=priceType==='reseller'&&p.hargaReseller?p.hargaReseller:p.hargaJual;
if(p.diskonPersen)hargaDefault=hargaDefault-(hargaDefault*p.diskonPersen/100);
const harga=(it.hargaOverride!=null&&it.hargaOverride>0)?it.hargaOverride:hargaDefault;
const lineTotal=harga*it.qty;
subtotal+=lineTotal;modal+=p.hargaBeli*it.qty;
return{...it,product:p,harga,hargaDefault,lineTotal};
}).filter(Boolean);
const diskon=parseFloat(document.getElementById('oDiskon').value)||0;
const ongkir=parseFloat(document.getElementById('oOngkir').value)||0;
const total=Math.max(0,subtotal-diskon)+ongkir;
const profit=subtotal-modal-diskon;
return{lines,subtotal,modal,diskon,ongkir,total,profit};
},
renderItems(){
const{lines,total,profit}=Order.computeTotals();
const el=document.getElementById('orderItemList');
el.innerHTML=lines.length?lines.map((l,i)=>{
// Reko harga (kw194-kasir-order-pricereko): pakai rumus PriceRekoWidget yg sama dgn widget
// "🤖 Rekomendasi Harga Jual AI" di Etalase, biar kelihatan di titik jual (bukan cuma pas
// buka Etalase) kalau Harga Jual produk ini sudah menyimpang jauh dari estimasi.
const priceChk=(typeof PriceRekoWidget!=='undefined')?PriceRekoWidget.checkOne(l.product):null;
const priceHint=priceChk?`<div class="u-mt2" style="font-size:11px;color:${priceChk.diffPct<0?'var(--accent2)':'var(--accent4)'};font-weight:600">${priceChk.diffPct<0?'⬇️':'⬆️'} Reko Etalase: ${fmt(priceChk.reko)} <span class="u-t2" style="font-weight:400;cursor:pointer;text-decoration:underline" data-action="openPriceRekoWidgetDetail" data-args="${escapeHtml(JSON.stringify([l.productId]))}">detail →</span></div>`:'';
return`
      <div class="tx-item">
        <div class="tx-icon u-bgaccsoft">🪨</div>
        <div class="tx-info">
          <div class="tx-name">${escapeHtml(l.product.name)}</div>
          <div class="tx-meta u-flex u-aic u-gap4" style="margin-top:3px">
            <input type="number" class="fi u-fs12" value="${l.harga}" oninput="updateOrderItemHarga(${i},this.value)" placeholder="${l.hargaDefault}" inputmode="numeric" style="width:90px;padding:5px 7px" title="Harga bisa diedit manual per transaksi (mis. nego/diskon)">
            <span>x ${l.qty}${l.hargaOverride!=null&&l.hargaOverride>0&&l.hargaOverride!==l.hargaDefault?' <span class="u-cacc4">(diedit, default '+fmt(l.hargaDefault)+')</span>':''}</span>
          </div>
          ${priceHint}
        </div>
        <div class="u-flex u-aic u-gap6">
          <button class="btn btn-ghost btn-sm" style="padding:4px 10px" data-action="changeOrderQty" data-args="${escapeHtml(JSON.stringify([i, -1]))}" aria-label="Kurangi jumlah">−</button>
          <span class="u-fw700">${l.qty}</span>
          <button class="btn btn-ghost btn-sm" style="padding:4px 10px" data-action="changeOrderQty" data-args="${escapeHtml(JSON.stringify([i, 1]))}" aria-label="Tambah jumlah">+</button>
        </div>
        <button class="tx-del" data-action="removeOrderItem" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join(''):'<div class="empty"><div class="empty-text">Keranjang masih kosong</div></div>';
document.getElementById('oTotalDisplay').textContent=fmtFull(total);
document.getElementById('oProfitDisplay').textContent='Estimasi untung: '+fmtFull(profit);
},
save(){return withSaveGuard('order','orderModal',Order._saveInner);},
_saveInner(){
if(!Order.items.length){toast('⚠️ Keranjang masih kosong');return;}
const{lines,subtotal,diskon,ongkir,total,profit}=Order.computeTotals();
const items=lines.map(l=>({productId:l.productId,name:l.product.name,qty:l.qty,harga:l.harga,lineTotal:l.lineTotal}));
const customer={name:document.getElementById('oCustName').value.trim(),phone:document.getElementById('oCustPhone').value.trim(),address:document.getElementById('oCustAddr').value.trim()};
const accId=document.getElementById('oAcc')?document.getElementById('oAcc').value:D.accounts[0]?.id;
const date=document.getElementById('oDate').value;
const priceType=document.getElementById('oPriceType').value;
const delivered=document.getElementById('oDelivered')?document.getElementById('oDelivered').checked:true;
const note=document.getElementById('oNote').value;
const txId=uid();
const result=recordShopSale({
items,subtotal,diskon,ongkir,total,profit,date,note,customer,priceType,delivered,
accountId:accId,txId,existingShopId:null
});
if(!result.ok){toast('⚠️ '+result.message);return;}
const itemSummary=items.map(it=>it.name+' x'+it.qty).join(', ');
D.transactions.push({id:txId,type:'income',amount:total,category:'Bisnis',subcategory:'Cobek',accountId:accId,payMethod:'tunai',note:(customer.name?customer.name+' - ':'')+itemSummary,date,cobekLinkId:result.shopId});
save();closeModal('orderModal');renderProductList();renderShop();Order.renderRecent();renderDashboard();renderKeuangan();renderSiapPulang();toast('✅ Transaksi tersimpan & tersinkron ke Keuangan');
},
renderRecent(){
const el=document.getElementById('shopRecentList');
if(!el)return;
const sorted=[...D.cobek].sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,5);
el.innerHTML=sorted.length?sorted.map(t=>Order.rowHTML(t)).join(''):'<div class="empty"><div class="empty-icon">🪨</div><div class="empty-text">Belum ada transaksi</div></div>';
},
rowHTML(t){
if(t.items){
const itemSummary=t.items.map(i=>i.name+' x'+i.qty).join(', ');
const pendingBadge=t.delivered===false?' <span class="acc-chip u-cacc4" style="background:var(--accent4-soft)">📦 Belum diserahkan</span>':'';
return`<div class="tx-item">
        <div class="tx-icon u-bgaccsoft">🪨</div>
        <div class="tx-info"><div class="tx-name">${t.customer&&t.customer.name?escapeHtml(t.customer.name):'Transaksi'} · ${escapeHtml(itemSummary)}${pendingBadge}</div><div class="tx-meta">${t.date}${t.customer&&t.customer.phone?' · '+escapeHtml(t.customer.phone):''} ${t.note?'· '+escapeHtml(t.note):''}</div></div>
        <div class="tx-amount green">${fmt(t.total)}</div>
        <button class="tx-del" data-action="delShop" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
}
return`<div class="tx-item">
      <div class="tx-icon u-bgaccsoft">🪨</div>
      <div class="tx-info"><div class="tx-name">${t.date} · ${t.sets} set (data lama)</div><div class="tx-meta">${escapeHtml(t.note||'Trip Shop')}</div></div>
      <div class="tx-amount green">+${fmt(t.profit)}</div>
      <button class="tx-del" data-action="delShop" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button>
    </div>`;
}
};

const Laporan={
periode:'selamanya',
setPeriode(p,el){
this.periode=p;
document.querySelectorAll('#shopPeriodeChips .chip-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');
document.getElementById('shopCustomRange').classList.toggle('u-dnone', p!=='custom');
document.getElementById('shopCustomRange').style.display='';
this.render();
},
getRange(){
if(this.periode==='selamanya')return{from:new Date(0),to:new Date(8640000000000000)};
const now=new Date();now.setHours(23,59,59,999);let from;
if(this.periode==='hari'){from=new Date();from.setHours(0,0,0,0);}
else if(this.periode==='minggu'){from=new Date();from.setDate(from.getDate()-from.getDay());from.setHours(0,0,0,0);}
else if(this.periode==='bulan'){from=new Date(now.getFullYear(),now.getMonth(),1);}
else if(this.periode==='tahun'){from=new Date(now.getFullYear(),0,1);}
else{const f=document.getElementById('shopFrom').value,t2=document.getElementById('shopTo').value;return{from:f?new Date(f):new Date(0),to:t2?new Date(t2+'T23:59:59'):now};}
return{from,to:now};
},
render(){
const {from,to}=this.getRange();
const inRange=D.cobek.filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;});
document.getElementById('cTrip').textContent=inRange.length;
const omzet=inRange.reduce((s,t)=>s+(t.total||0),0);
document.getElementById('cSet').textContent=fmt(omzet);
document.getElementById('cUntung').textContent=fmt(inRange.reduce((s,t)=>s+(t.profit||0),0));
Etalase.renderModalStat();
const sorted=[...inRange].sort((a,b)=>(b.id||0)-(a.id||0));
const el=document.getElementById('shopList');
if(el)el.innerHTML=sorted.length?sorted.map(t=>shopOrderRowHTML(t)).join(''):'<div class="empty"><div class="empty-icon">🪨</div><div class="empty-text">Belum ada transaksi di periode ini</div></div>';
},
async delete(id){
if(!await askConfirm('Hapus transaksi ini? Stok produk akan dikembalikan & catatan keuangan terkait juga dihapus.'))return;
const t=D.cobek.find(x=>x.id===id);
if(t&&t.items){t.items.forEach(it=>{const p=D.products.find(x=>x.id===it.productId);if(p)p.stock+=it.qty;});}
if(t&&t.txLinkId)D.transactions=D.transactions.filter(tx=>tx.id!==t.txLinkId);
D.cobek=D.cobek.filter(t=>t.id!==id);
save();this.render();renderShopRecent();renderProductList();renderDashboard();renderKeuangan();toast('🗑 Dihapus, stok & catatan keuangan dikembalikan');
},
renderGrafik(){
const el=document.getElementById('shopGrafikBars');
if(!el)return;
const now=new Date();const bars=[];
for(let i=5;i>=0;i--){
const m=(now.getMonth()-i+12)%12,y=now.getFullYear()+(now.getMonth()-i<0?-1:0);
const cobM=D.cobek.filter(c=>{const d=new Date(c.date);return d.getMonth()===m&&d.getFullYear()===y;});
const setQty=cobM.reduce((s,c)=>s+(c.items?c.items.reduce((s2,i)=>s2+i.qty,0):(c.sets||0)),0);
const omzet=cobM.reduce((s,c)=>s+(c.total||0),0);
const profit=cobM.reduce((s,c)=>s+(c.profit||0),0);
const margin=omzet>0?Math.round((profit/omzet)*100):0;
bars.push({label:MONTHS[m],setQty,margin});
}
const maxV=Math.max(...bars.map(b=>b.setQty),1);
el.innerHTML=bars.map(b=>`<div class="grafik-col"><div class="grafik-bar-group"><div class="grafik-bar" style="background:var(--accent4);opacity:0.9;height:${Math.max(4,(b.setQty/maxV)*100)}%" title="${b.setQty} set"></div></div><div class="grafik-lbl">${b.label}</div><div class="u-fs12 u-t2 u-tac u-mt2">${b.setQty}set·${b.margin}%</div></div>`).join('');
}
};

const Pelanggan={
key(cust){
let phone='',name='';
if(cust && typeof cust==='object'){phone=cust.phone||'';name=cust.name||'';}
phone=String(phone).replace(/[^0-9]/g,'');
if(phone.length>=8) return 'p_'+phone.replace(/^0/,'62');
name=String(name).trim().toLowerCase();
return name? 'n_'+name : '';
},
getOrders(cust){
const key=this.key(cust);
if(!key) return [];
return D.cobek.filter(c=>c.items && this.key(c.customer)===key).sort((a,b)=>(b.id||0)-(a.id||0));
},
aggregate(){
const map={};
D.cobek.forEach(c=>{
if(!c.items) return;
const key=this.key(c.customer);
if(!key) return;
if(!map[key]) map[key]={key,name:(c.customer&&c.customer.name)||'(Tanpa nama)',phone:(c.customer&&c.customer.phone)||'',address:(c.customer&&c.customer.address)||'',orders:[],totalOmzet:0,totalProfit:0};
map[key].orders.push(c);
map[key].totalOmzet+=c.total||0;
map[key].totalProfit+=c.profit||0;
if(c.customer&&c.customer.name) map[key].name=c.customer.name;
if(c.customer&&c.customer.phone) map[key].phone=c.customer.phone;
});
return Object.values(map).sort((a,b)=>b.orders.length-a.orders.length || b.totalOmzet-a.totalOmzet);
},
onInputChange(){
const name=document.getElementById('oCustName').value.trim();
const phone=document.getElementById('oCustPhone').value.trim();
const hintEl=document.getElementById('oCustHint');
if(!hintEl) return;
if(!name && !phone){hintEl.style.display='none';hintEl.innerHTML='';return;}
const orders=this.getOrders({name,phone});
if(!orders.length){hintEl.style.display='none';hintEl.innerHTML='';return;}
const isLangganan=orders.length>=3;
const lastOrder=orders[0];
const lastItemsTxt=lastOrder.items.map(i=>i.name+' @'+fmtFull(i.harga)).join(', ');
hintEl.style.display='block';
hintEl.innerHTML=`👤 Pelanggan lama${isLangganan?' <span class="langganan-badge">🌟 Langganan</span>':''} — sudah order ${orders.length}x.<br>Terakhir (${lastOrder.date}): ${escapeHtml(lastItemsTxt)} · total ${fmtFull(lastOrder.total)}`;
},
renderList(){
const el=document.getElementById('customerList');
if(!el) return;
const list=this.aggregate();
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">👤</div><div class="empty-text">Belum ada data pelanggan</div></div>';return;}
const CUSTOMER_SHOW_LIMIT=40;
const visible=list.slice(0,CUSTOMER_SHOW_LIMIT);
el.innerHTML=visible.map(c=>`
      <div class="customer-card" data-action="openCustomerDetail" data-args="${escapeHtml(JSON.stringify([c.key]))}">
        <div class="u-flex u-jcb u-aifs">
          <div>
            <div class="u-fw700 u-fs14">${escapeHtml(c.name)}${c.orders.length>=3?'<span class="langganan-badge">🌟 Langganan</span>':''}</div>
            <div class="u-fs12 u-t2 u-mt2">${c.phone?escapeHtml(c.phone)+' · ':''}${c.orders.length}x order</div>
          </div>
          <div class="u-tar">
            <div class="tx-amount green u-fs13">${fmt(c.totalOmzet)}</div>
            <div class="u-fs12t2">untung ${fmt(c.totalProfit)}</div>
          </div>
        </div>
      </div>`).join('')+(list.length>CUSTOMER_SHOW_LIMIT?`<div class="u-tac u-fs12 u-t2" style="padding:8px 0">+${list.length-CUSTOMER_SHOW_LIMIT} pelanggan lain (urutan terbawah, order lebih jarang) tidak ditampilkan</div>`:'');
},
openDetail(key){
const list=this.aggregate();
const c=list.find(x=>x.key===key);
if(!c)return;
const orders=c.orders.sort((a,b)=>(b.id||0)-(a.id||0));
const itemPriceMap={};
orders.forEach(o=>{o.items.forEach(i=>{if(!itemPriceMap[i.name])itemPriceMap[i.name]=[];itemPriceMap[i.name].push({date:o.date,harga:i.harga});});});
const priceHistHTML=Object.entries(itemPriceMap).map(([name,prices])=>{
const rows=prices.slice(0,5).map(p=>`<span class="u-fs12 u-r8" style="display:inline-block;margin:2px 6px 2px 0;background:var(--surface3);padding:3px 8px">${p.date}: ${fmtFull(p.harga)}</span>`).join('');
const consistent=new Set(prices.map(p=>p.harga)).size===1;
return `<div class="u-mb8"><div class="u-fs12 u-fw700 u-mb4">${escapeHtml(name)} ${consistent?'<span class="u-cacc3 u-fs12">✓ harga konsisten</span>':'<span class="u-cacc4 u-fs12">⚠ harga berubah</span>'}</div>${rows}</div>`;
}).join('');
const orderListHTML=orders.map(o=>shopOrderRowHTML(o)).join('');
const waMsg=`Halo ${c.name}, terima kasih sudah jadi pelanggan Shop kami ya! 🪨🙏`;
const waBtn=c.phone?`<button class="wa-btn" data-action="openWaShare" data-args="${escapeHtml(JSON.stringify([waMsg, c.phone]))}">💬 Chat WhatsApp</button>`:'';
const body=document.getElementById('customerDetailBody');
document.getElementById('customerDetailTitle').textContent=c.name+(c.orders.length>=3?' 🌟':'');
body.innerHTML=`
      <div class="u-fs12 u-t2 u-mb10">${c.phone?escapeHtml(c.phone):'Tanpa no. HP'}${c.address?' · '+escapeHtml(c.address):''}</div>
      <div class="u-flex u-gap8" style="margin-bottom:14px">${waBtn}</div>
      <div class="card-title u-p0 u-mb8">💰 Riwayat Harga per Produk</div>
      ${priceHistHTML||'<div class="u-fs12t2">Belum ada data</div>'}
      <div class="div"></div>
      <div class="card-title u-p0 u-mb8">📋 Semua Transaksi (${orders.length}x)</div>
      ${orderListHTML}
    `;
openModal('customerDetailModal');
},
_acList(){
const seen=new Set();const out=[];
for(let i=(D.cobek||[]).length-1;i>=0;i--){
const c=D.cobek[i].customer||{};
const name=(c.name||'').trim();
if(!name||seen.has(name.toLowerCase()))continue;
seen.add(name.toLowerCase());
out.push({name,phone:(c.phone||'').trim(),address:(c.address||'').trim()});
if(out.length>=50)break;
}
return out;
},
onFieldInput(field){
const idMap={name:'txShopSaleCustName',phone:'txShopSaleCustPhone',address:'txShopSaleCustAddr'};
const boxMap={name:'txShopSaleCustNameBox',phone:'txShopSaleCustPhoneBox',address:'txShopSaleCustAddrBox'};
const el=document.getElementById(idMap[field]);
const box=document.getElementById(boxMap[field]);
if(!el||!box)return;
const q=el.value.trim().toLowerCase();
const customers=this._acList();
const matches=(q?customers.filter(c=>(c[field]||'').toLowerCase().includes(q)):customers).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map(c=>{
const label=field==='name'?c.name:(field==='phone'?(c.phone||'(tanpa HP)')+' — '+c.name:(c.address||'(tanpa alamat)')+' — '+c.name);
return `<div class="suggest-item" onmousedown="event.preventDefault();selectShopCustomer('${jsAttrEscape(c.name)}','${jsAttrEscape(c.phone)}','${jsAttrEscape(c.address)}')">${escapeHtml(label)}</div>`;
}).join('');
box.style.display='block';
},
select(name,phone,address){
const nameEl=document.getElementById('txShopSaleCustName');
const phoneEl=document.getElementById('txShopSaleCustPhone');
const addrEl=document.getElementById('txShopSaleCustAddr');
if(nameEl)nameEl.value=name;
if(phoneEl)phoneEl.value=phone;
if(addrEl)addrEl.value=address;
['txShopSaleCustNameBox','txShopSaleCustPhoneBox','txShopSaleCustAddrBox'].forEach(hideSuggestBox);
}
};

