// Staff Dashboard V4.1 active/store defaults and sortable results.
(function(){
  const inactiveStatuses=['cancelled','expired'];
  let sortKey='created_at';
  let sortDir='desc';

  function isActiveStatus(status){
    return !inactiveStatuses.includes(String(status||'').toLowerCase());
  }

  function isCreatedLikeStatus(status){
    return ['quote_created','submitted'].includes(String(status||'').toLowerCase());
  }

  function sessionInfo(){
    try{return (getSession&&getSession().session)||{};}catch(e){return{};}
  }

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
    if(notice) notice.innerHTML='<strong>Dashboard V4.1:</strong> Active orders load by default. Store access defaults to that store while still allowing cross-store filtering.';
    const helper=document.querySelector('.layout section.card .helper');
    if(helper) helper.textContent='Recent defaults to active orders only. Submitted legacy quotes are treated as active. Use the status filter to include Cancelled or Expired when needed.';
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
    if(all) all.textContent='All Including Cancelled/Expired';
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
    const style=document.createElement('style');
    style.textContent='.sortable{background:transparent;border:0;color:#111827;font:inherit;font-weight:700;padding:0;min-height:0;border-radius:0;cursor:pointer;text-align:left}.sortable:after{content:" ↕";color:#667085;font-weight:400}.sortable.active.asc:after{content:" ↑";color:#b01c2e;font-weight:700}.sortable.active.desc:after{content:" ↓";color:#b01c2e;font-weight:700}.status.submitted{background:#eef2ff;color:#30358f}';
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
    }catch(e){
      show(f.searchNotice,'bad','Search failed: '+String(e&&e.message?e.message:e));
    }finally{busy(false);}
  };

  window.setWorkflow=function(quote){
    const s=quote&&quote.status;
    f.markPaid.disabled=!quote||!isCreatedLikeStatus(s);
    f.markReady.disabled=!quote||s!=='in_production';
    f.markCompleted.disabled=!quote||s!=='ready';
    f.cancel.disabled=!quote||['completed','cancelled','expired'].includes(s);
    if(!quote){
      f.workflowTitle.textContent='Workflow Actions';
      f.workflowHelp.textContent='Actions activate after a quote is selected.';
    }else if(isCreatedLikeStatus(s)){
      f.workflowTitle.textContent='Next Step: Collect Payment';
      f.workflowHelp.textContent='Use Mark Paid only after in-store POS payment is completed. POS receipt is required.';
    }else if(s==='in_production'){
      f.workflowTitle.textContent='Next Step: Mark Ready';
      f.workflowHelp.textContent='Use when the completed order is received from the vendor.';
    }else if(s==='ready'){
      f.workflowTitle.textContent='Next Step: Complete Order';
      f.workflowHelp.textContent='Use when the order has been transferred to the customer.';
    }else if(s==='completed'){
      f.workflowTitle.textContent='Order Complete';
      f.workflowHelp.textContent='This order is closed. Avoid changes unless correcting an admin error.';
    }else{
      f.workflowTitle.textContent='Order Not Active';
      f.workflowHelp.textContent='This quote/order is cancelled or expired.';
    }
  };

  const originalShowApp=showApp;
  window.showApp=function(){originalShowApp();applyDefaults();enhanceHeaderText();enhanceStatusFilter();enhanceSortableHeaders();};
  const originalClearSearch=clearSearch;
  window.clearSearch=function(){originalClearSearch();applyDefaults();};

  enhanceHeaderText();
  enhanceStatusFilter();
  enhanceSortableHeaders();
  applyDefaults();
})();
