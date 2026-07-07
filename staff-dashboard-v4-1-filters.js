// Staff Dashboard V4.2 active/store defaults, sortable results, and top-admin access controls.
(function(){
  const inactiveStatuses=['completed','cancelled','expired'];
  const storeMap={
    '18228':'Tropicana',
    '18507':'Horizon Ridge',
    '18690':'Rainbow',
    '19117':'Green Valley'
  };
  let sortKey='created_at';
  let sortDir='desc';
  let accessRowsCache=[];

  function isActiveStatus(status){return !inactiveStatuses.includes(String(status||'').toLowerCase());}
  function isCreatedLikeStatus(status){return ['quote_created','submitted'].includes(String(status||'').toLowerCase());}
  function sessionInfo(){try{return (getSession&&getSession().session)||{};}catch(e){return{};}}
  function isTopAdmin(){return sessionInfo().role==='top_admin';}

  function applyDefaults(){
    const s=sessionInfo();
    if(f.statusFilter) f.statusFilter.value='active';
    if(f.storeFilter) f.storeFilter.value=s.store_id?String(s.store_id):'all';
    if(f.headerActions && !document.getElementById('signedInLabel')){
      const pill=f.headerActions.querySelector('.header-pill');
      if(pill) pill.id='signedInLabel';
    }
    const signed=document.getElementById('signedInLabel');
    if(signed){
      const role=s.role==='top_admin'?'Top Admin':'Store Access';
      signed.textContent=(s.label||'Signed in')+' · '+role;
    }
  }

  function enhanceHeaderText(){
    const notice=document.querySelector('#appView .notice.show.ok');
    if(notice) notice.innerHTML='<strong>Dashboard ready.</strong> Active orders load by default. Top Admin can manage store access values.';
    const helper=document.querySelector('.layout section.card .helper');
    if(helper) helper.textContent='Recent defaults to active orders only. Completed, Cancelled, and Expired orders are closed. Submitted legacy quotes are treated as active. Use the status filter to include closed orders when needed.';
  }

  function enhanceStatusFilter(){
    if(!f.statusFilter) return;
    if(!Array.from(f.statusFilter.options).some(o=>o.value==='active')){
      const active=document.createElement('option');
      active.value='active';
      active.textContent='Active Only';
      f.statusFilter.insertBefore(active,f.statusFilter.firstChild);
    }
    if(!Array.from(f.statusFilter.options).some(o=>o.value==='submitted')){
      const submitted=document.createElement('option');
      submitted.value='submitted';
      submitted.textContent='Submitted Legacy';
      const quoteCreated=Array.from(f.statusFilter.options).find(o=>o.value==='quote_created');
      if(quoteCreated && quoteCreated.nextSibling) f.statusFilter.insertBefore(submitted,quoteCreated.nextSibling);
      else f.statusFilter.appendChild(submitted);
    }
    const all=Array.from(f.statusFilter.options).find(o=>o.value==='all');
    if(all) all.textContent='All Including Completed/Cancelled/Expired';
  }

  function enhanceSortableHeaders(){
    const head=document.querySelector('#resultsBody')?.closest('table')?.querySelector('thead tr');
    if(!head || head.dataset.sortableReady==='1') return;
    head.dataset.sortableReady='1';
    const columns=[['created_at','Created'],['customer_name','Customer'],['customer_phone','Phone'],['store_name','Store'],['status','Status'],['total_cents','Total']];
    head.innerHTML=columns.map(([key,label])=>'<th><button class="sortable" type="button" data-sort="'+key+'">'+label+'</button></th>').join('');
    Array.from(head.querySelectorAll('.sortable')).forEach(btn=>{
      btn.onclick=()=>{
        const key=btn.dataset.sort;
        if(sortKey===key) sortDir=sortDir==='asc'?'desc':'asc';
        else{sortKey=key;sortDir=(key==='created_at'||key==='total_cents')?'desc':'asc';}
        currentPage=1;
        renderResultsPage();
      };
    });
  }

  function injectStyles(){
    if(document.getElementById('staffV42Styles')) return;
    const style=document.createElement('style');
    style.id='staffV42Styles';
    style.textContent='.sortable{background:transparent;border:0;color:#111827;font:inherit;font-weight:700;padding:0;min-height:0;border-radius:0;cursor:pointer;text-align:left}.sortable:after{content:" ↕";color:#667085;font-weight:400}.sortable.active.asc:after{content:" ↑";color:#b01c2e;font-weight:700}.sortable.active.desc:after{content:" ↓";color:#b01c2e;font-weight:700}.status.submitted{background:#eef2ff;color:#30358f}.access-manager{margin-bottom:14px}.access-manager .access-grid{display:grid;grid-template-columns:1.2fr .8fr .8fr 1.2fr auto;gap:10px;align-items:end}.access-manager .access-table input{min-width:180px}.access-manager .access-table td,.access-manager .access-table th{white-space:nowrap}.access-badge{display:inline-block;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:700}.access-badge.active{background:#e7f7ed;color:#0b6b35}.access-badge.inactive{background:#fde8e8;color:#9b1c1c}.access-warning{background:#fff4dc;border:1px solid #f3d28d;color:#805000;border-radius:12px;padding:10px 12px;margin-top:10px}.access-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:12px}.access-toolbar label{margin:0;font-weight:700}.access-toolbar input{width:auto}@media(max-width:1060px){.access-manager .access-grid{grid-template-columns:1fr}.access-manager .access-table input{min-width:140px}}';
    document.head.appendChild(style);
  }

  function updateSortHeaders(){
    Array.from(document.querySelectorAll('.sortable')).forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.sort===sortKey);
      btn.classList.toggle('asc',btn.dataset.sort===sortKey&&sortDir==='asc');
      btn.classList.toggle('desc',btn.dataset.sort===sortKey&&sortDir==='desc');
    });
  }

  function sortValue(row,key){
    if(key==='created_at') return new Date(row.created_at||0).getTime();
    if(key==='total_cents') return Number(row.total_cents||0);
    return (row[key]||'').toString().toLowerCase();
  }

  function sortedRows(rows){
    return [...rows].sort((a,b)=>{
      const av=sortValue(a,sortKey), bv=sortValue(b,sortKey);
      let cmp;
      if(typeof av==='number'&&typeof bv==='number') cmp=av-bv;
      else cmp=String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
      return sortDir==='asc'?cmp:-cmp;
    });
  }

  function endpoint(path,body){
    const h=authHeaders();
    if(!h) return Promise.reject(new Error('Not signed in'));
    return fetch(api+path,{method:'POST',headers:h,body:JSON.stringify(body||{})}).then(async res=>{
      const data=await res.json().catch(()=>({}));
      if(res.status===401){clearAccess();showLogin();throw new Error('Session expired. Sign in again.');}
      if(!res.ok||!data.ok) throw new Error((data&&(data.error||data.message))||('HTTP '+res.status));
      return data;
    });
  }

  function ensureAccessManager(){
    let card=document.getElementById('accessManagerCard');
    if(!isTopAdmin()){
      if(card) card.classList.add('hidden');
      return;
    }
    if(!card){
      card=document.createElement('section');
      card.id='accessManagerCard';
      card.className='card access-manager';
      card.innerHTML='<h2>Access Management</h2><p class="helper">Top Admin only. Create, rotate, deactivate, and reactivate shared store access values. Actual values are never shown after save.</p><div class="access-warning"><strong>Important:</strong> Save new or rotated access values somewhere secure before closing this page. For security, the platform cannot show the value again after it is saved.</div><div class="access-grid"><div><label for="accessLabel">Access Label</label><input id="accessLabel" placeholder="Example: Tropicana Store Access"></div><div><label for="accessRole">Role</label><select id="accessRole"><option value="store">Store Access</option><option value="top_admin">Top Admin</option></select></div><div><label for="accessStore">Store</label><select id="accessStore"><option value="">No store / Admin</option><option value="18228">Tropicana</option><option value="18507">Horizon Ridge</option><option value="18690">Rainbow</option><option value="19117">Green Valley</option></select></div><div><label for="accessValue">New Access Value</label><input id="accessValue" type="password" autocomplete="new-password" placeholder="Minimum 8 characters"></div><div><button id="createAccessBtn" type="button">Create Access</button></div></div><div class="access-toolbar"><button id="refreshAccessBtn" class="secondary" type="button">Refresh Access List</button><label><input id="showInactiveAccess" type="checkbox"> Show inactive access values</label></div><div id="accessNotice" class="notice"></div><div class="table-wrap" style="margin-top:12px"><table class="table access-table"><thead><tr><th>Status</th><th>Label</th><th>Store</th><th>Role</th><th>Last Used</th><th>Rotated</th><th>New Value</th><th>Actions</th></tr></thead><tbody id="accessRows"><tr><td colspan="8" class="empty">Access list not loaded.</td></tr></tbody></table></div>';
      const kpis=document.querySelector('.kpis');
      kpis.parentNode.insertBefore(card,kpis.nextSibling);
      q('accessStore').onchange=syncCreateLabel;
      q('accessRole').onchange=syncCreateLabel;
      q('createAccessBtn').onclick=createAccessValue;
      q('refreshAccessBtn').onclick=loadAccessValues;
      q('showInactiveAccess').onchange=renderAccessValues;
    }
    card.classList.remove('hidden');
    syncCreateLabel();
    loadAccessValues();
  }

  function syncCreateLabel(){
    const role=q('accessRole')?.value||'store';
    const store=q('accessStore')?.value||'';
    const label=q('accessLabel');
    if(!label || label.value.trim()) return;
    if(role==='top_admin') label.value='Top Admin Access';
    else if(store) label.value=(storeMap[store]||store)+' Store Access';
  }

  function accessShow(type,msg){show(q('accessNotice'),type,msg);}
  function activeTopAdminCount(){return accessRowsCache.filter(r=>r.role==='top_admin'&&r.is_active).length;}

  async function loadAccessValues(){
    if(!isTopAdmin() || !q('accessRows')) return;
    q('accessRows').innerHTML='<tr><td colspan="8" class="empty">Loading access values...</td></tr>';
    try{
      const data=await endpoint('/api/staff/access/list',{});
      accessRowsCache=data.access_keys||[];
      renderAccessValues();
    }catch(e){
      q('accessRows').innerHTML='<tr><td colspan="8" class="empty">Access list failed: '+safe(e.message||e)+'</td></tr>';
    }
  }

  function renderAccessValues(){
    if(!q('accessRows')) return;
    const showInactive=!!q('showInactiveAccess')?.checked;
    const rows=showInactive?accessRowsCache:accessRowsCache.filter(row=>row.is_active);
    if(!rows.length){
      q('accessRows').innerHTML='<tr><td colspan="8" class="empty">No access values found for this view.</td></tr>';
      return;
    }
    q('accessRows').innerHTML=rows.map(row=>{
      const active=row.is_active;
      const status='<span class="access-badge '+(active?'active':'inactive')+'">'+(active?'Active':'Inactive')+'</span>';
      const store=row.store_id?(safe(row.store_id)+' · '+safe(row.store_name||storeMap[row.store_id]||'')):'Admin';
      const role=row.role==='top_admin'?'Top Admin':'Store';
      return '<tr data-access-id="'+safe(row.id)+'"><td>'+status+'</td><td>'+safe(row.label)+'</td><td>'+store+'</td><td>'+role+'</td><td>'+shortDate(row.last_used_at)+'</td><td>'+shortDate(row.rotated_at)+'</td><td><input class="rotate-value" type="password" autocomplete="new-password" placeholder="New value"></td><td><button class="secondary rotate-btn" type="button">Rotate</button> <button class="'+(active?'danger':'good')+' active-btn" type="button">'+(active?'Deactivate':'Reactivate')+'</button></td></tr>';
    }).join('');
    Array.from(q('accessRows').querySelectorAll('tr[data-access-id]')).forEach(tr=>{
      const id=tr.dataset.accessId;
      const row=accessRowsCache.find(r=>r.id===id);
      tr.querySelector('.rotate-btn').onclick=()=>rotateAccessValue(id,tr.querySelector('.rotate-value'),row);
      tr.querySelector('.active-btn').onclick=()=>toggleAccessValue(id,tr.querySelector('.active-btn').textContent==='Reactivate',row);
    });
  }

  async function createAccessValue(){
    const label=q('accessLabel').value.trim();
    const role=q('accessRole').value;
    const storeId=q('accessStore').value;
    const accessValue=q('accessValue').value.trim();
    if(!label) return accessShow('bad','Enter an access label.');
    if(!accessValue || accessValue.length<8) return accessShow('bad','Access value must be at least 8 characters.');
    const confirmText='Create new '+(role==='top_admin'?'Top Admin':'Store')+' access value for "'+label+'"? Save the value before closing this page; it cannot be viewed later.';
    if(!confirm(confirmText)) return;
    try{
      await endpoint('/api/staff/access/create',{label,role,store_id:storeId,store_name:storeId?storeMap[storeId]||storeId:null,access_value:accessValue});
      q('accessValue').value='';
      q('accessLabel').value='';
      accessShow('ok','Access value created. Save the phrase somewhere secure; it cannot be viewed again here.');
      await loadAccessValues();
    }catch(e){accessShow('bad','Create failed: '+String(e.message||e));}
  }

  async function rotateAccessValue(id,input,row){
    const value=(input&&input.value||'').trim();
    if(!value || value.length<8) return accessShow('bad','New access value must be at least 8 characters.');
    const label=row&&row.label?row.label:id;
    const message='Rotate access value for "'+label+'"? The old value will stop working and existing sessions for this access will be revoked.';
    if(!confirm(message)) return;
    try{
      await endpoint('/api/staff/access/rotate',{id,access_value:value});
      input.value='';
      accessShow('ok','Access value rotated. Existing sessions for that access were revoked.');
      await loadAccessValues();
    }catch(e){accessShow('bad','Rotate failed: '+String(e.message||e));}
  }

  async function toggleAccessValue(id,active,row){
    const label=row&&row.label?row.label:id;
    if(!active && row&&row.role==='top_admin'&&row.is_active&&activeTopAdminCount()<=1){
      return accessShow('bad','Cannot deactivate the last active Top Admin access value. Create another Top Admin access first.');
    }
    const message=active?'Reactivate access value for "'+label+'"?':'Deactivate access value for "'+label+'"? Existing sessions for this access will be revoked.';
    if(!confirm(message)) return;
    try{
      await endpoint(active?'/api/staff/access/reactivate':'/api/staff/access/deactivate',{id});
      accessShow('ok',active?'Access reactivated.':'Access deactivated and existing sessions revoked.');
      await loadAccessValues();
    }catch(e){accessShow('bad','Update failed: '+String(e.message||e));}
  }

  window.renderKpis=function(rows){
    const count=s=>rows.filter(r=>r.status===s).length;
    q('kpiCreated').textContent=rows.filter(r=>isCreatedLikeStatus(r.status)).length;
    q('kpiProduction').textContent=count('in_production');
    q('kpiReady').textContent=count('ready');
    q('kpiCompleted').textContent=count('completed');
    q('kpiTotal').textContent=rows.length;
  };

  window.renderResultsPage=function(){
    updateSortHeaders();
    const rowsAll=sortedRows(allRows||[]);
    if(!rowsAll.length){
      f.results.innerHTML='<tr><td colspan="6" class="empty">No matching quotes found.</td></tr>';
      f.pageInfo.textContent='No results.';
      f.prev.disabled=true;
      f.next.disabled=true;
      return;
    }
    const pages=Math.max(1,Math.ceil(rowsAll.length/pageSize));
    if(currentPage>pages) currentPage=pages;
    const start=(currentPage-1)*pageSize,end=Math.min(start+pageSize,rowsAll.length);
    const rows=rowsAll.slice(start,end);
    f.results.innerHTML=rows.map(r=>'<tr data-id="'+safe(r.id)+'" class="'+(r.id===selectedId?'selected':'')+'"><td>'+shortDate(r.created_at)+'</td><td>'+safe(r.customer_name)+'</td><td>'+safe(r.customer_phone)+'</td><td>'+safe(r.store_name)+'</td><td><span class="status '+safe(r.status)+'">'+label(r.status)+'</span></td><td>'+money(r.total_cents)+'</td></tr>').join('');
    Array.from(f.results.querySelectorAll('tr[data-id]')).forEach(row=>{row.onclick=()=>loadAdminQuote(row.dataset.id)});
    f.pageInfo.textContent='Showing '+(start+1)+'-'+end+' of '+rowsAll.length+' results. Page '+currentPage+' of '+pages+'. Sorted by '+label(sortKey)+' '+sortDir+'.';
    f.prev.disabled=currentPage<=1;
    f.next.disabled=currentPage>=pages;
  };

  window.searchDashboard=async function(isRecent){
    const h=authHeaders();
    if(!h){showLogin();return;}
    busy(true);
    const statusChoice=f.statusFilter.value||'active';
    const storeChoice=f.storeFilter.value||'all';
    show(f.searchNotice,'warn',isRecent?'Loading recent quotes...':'Searching...');
    try{
      const requestStatus=statusChoice==='active'?'all':statusChoice;
      const res=await fetch(api+'/api/quote/search',{method:'POST',headers:h,body:JSON.stringify({search:isRecent?'':f.search.value.trim(),status:requestStatus,store_id:storeChoice,limit:150})});
      const data=await res.json().catch(()=>({}));
      if(res.status===401){clearAccess();showLogin();return show(f.loginNotice,'bad','Session expired or access rejected. Sign in again.');}
      if(!res.ok||!data.ok) return show(f.searchNotice,'bad','Search failed: '+((data&&(data.error||data.message))||('HTTP '+res.status)));
      const rows=data.quotes||[];
      allRows=statusChoice==='active'?rows.filter(r=>isActiveStatus(r.status)):rows;
      currentPage=1;
      renderKpis(allRows);
      renderResultsPage();
      const statusLabel=statusChoice==='active'?'active orders only':label(statusChoice);
      const storeLabel=storeChoice==='all'?'all stores':'store '+storeChoice;
      show(f.searchNotice,'ok',(isRecent?'Recent loaded. ':'Search complete. ')+allRows.length+' result(s), '+statusLabel+', '+storeLabel+'. Click a row to load details.');
    }catch(e){show(f.searchNotice,'bad','Search failed: '+String(e&&e.message?e.message:e));}
    finally{busy(false);}
  };

  window.setWorkflow=function(quote){
    const s=quote&&quote.status;
    f.markPaid.disabled=!quote||!isCreatedLikeStatus(s);
    f.markReady.disabled=!quote||s!=='in_production';
    f.markCompleted.disabled=!quote||s!=='ready';
    f.cancel.disabled=!quote||['completed','cancelled','expired'].includes(s);
    if(!quote){f.workflowTitle.textContent='Workflow Actions';f.workflowHelp.textContent='Actions activate after a quote is selected.';}
    else if(isCreatedLikeStatus(s)){f.workflowTitle.textContent='Next Step: Collect Payment';f.workflowHelp.textContent='Use Mark Paid only after in-store POS payment is completed. POS receipt is required.';}
    else if(s==='in_production'){f.workflowTitle.textContent='Next Step: Mark Ready';f.workflowHelp.textContent='Use when the completed order is received from the vendor.';}
    else if(s==='ready'){f.workflowTitle.textContent='Next Step: Complete Order';f.workflowHelp.textContent='Use when the order has been transferred to the customer.';}
    else if(s==='completed'){f.workflowTitle.textContent='Order Complete';f.workflowHelp.textContent='This order is closed. Avoid changes unless correcting an admin error.';}
    else{f.workflowTitle.textContent='Order Not Active';f.workflowHelp.textContent='This quote/order is cancelled or expired.';}
  };

  const originalShowApp=showApp;
  window.showApp=function(){originalShowApp();applyDefaults();enhanceHeaderText();enhanceStatusFilter();enhanceSortableHeaders();injectStyles();ensureAccessManager();};
  const originalClearSearch=clearSearch;
  window.clearSearch=function(){originalClearSearch();applyDefaults();};

  injectStyles();
  enhanceHeaderText();
  enhanceStatusFilter();
  enhanceSortableHeaders();
  applyDefaults();
  ensureAccessManager();
})();
