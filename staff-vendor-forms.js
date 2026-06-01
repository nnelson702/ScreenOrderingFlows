// Staff portal add-on: opens printable vendor forms and vendor packet actions for operational orders.
(function(){
  const allowedStatuses=['in_production','ready','completed'];
  const vendorSessionKey='screen_vendor_forms_session';
  let vendorPacketBusy=false;

  function statusKey(v){return String(v||'').toLowerCase().replace(/[-\s]+/g,'_').trim();}
  function isOperationalStatus(v){return allowedStatuses.includes(statusKey(v));}
  function packetLabel(v){
    const key=statusKey(v||'not_sent');
    if(key==='sent_to_store') return 'Sent to Store';
    if(key==='opened_by_store') return 'Opened by Store';
    if(key==='sent_to_vendor') return 'Sent to Vendor';
    if(key==='send_failed') return 'Send Failed';
    return 'Not Sent';
  }
  function hasVendorPacketFields(quote){
    if(!quote||typeof quote!=='object') return false;
    return Object.prototype.hasOwnProperty.call(quote,'vendor_packet_status')||
      Object.prototype.hasOwnProperty.call(quote,'vendor_packet_sent_to_store_at')||
      Object.prototype.hasOwnProperty.call(quote,'vendor_packet_opened_at')||
      Object.prototype.hasOwnProperty.call(quote,'vendor_order_sent_to_vendor_at');
  }

  function ensureVendorPacketUi(){
    const workflow=document.querySelector('.workflow');
    const actions=workflow&&workflow.querySelector('.actions');
    if(!workflow||!actions) return {};

    let summary=document.getElementById('vendorPacketSummary');
    if(!summary){
      summary=document.createElement('p');
      summary.id='vendorPacketSummary';
      summary.className='helper';
      summary.style.margin='8px 0 0';
      workflow.insertBefore(summary,actions);
    }

    let resend=document.getElementById('resendVendorPacketBtn');
    if(!resend){
      resend=document.createElement('button');
      resend.id='resendVendorPacketBtn';
      resend.type='button';
      resend.className='secondary';
      resend.textContent='Resend Packet to Store';
      resend.onclick=sendPacketToStore;
      actions.appendChild(resend);
    }

    let markSent=document.getElementById('markSentToVendorBtn');
    if(!markSent){
      markSent=document.createElement('button');
      markSent.id='markSentToVendorBtn';
      markSent.type='button';
      markSent.className='good';
      markSent.textContent='Mark Sent to Vendor';
      markSent.onclick=markSentToVendor;
      actions.appendChild(markSent);
    }

    let vendorForms=document.getElementById('vendorFormsBtn');
    if(!vendorForms){
      vendorForms=document.createElement('button');
      vendorForms.id='vendorFormsBtn';
      vendorForms.type='button';
      vendorForms.className='secondary';
      vendorForms.textContent='Generate Vendor Forms';
      vendorForms.onclick=openVendorForms;
      actions.appendChild(vendorForms);
    }

    return {summary,resend,markSent,vendorForms};
  }

  function getSelectedQuote(){
    try{return selectedQuote||null;}catch(e){return null;}
  }

  function selectedQuoteId(){
    const quote=getSelectedQuote();
    if(quote&&quote.id) return quote.id;
    const field=document.getElementById('activeQuoteId');
    return field?field.value.trim():'';
  }

  function getStaffSession(){
    try{return JSON.parse(sessionStorage.getItem('screen_admin_staff_session')||'null')||null;}catch(e){return null;}
  }

  function stageVendorSession(){
    const session=getStaffSession();
    if(!session||!session.token) return false;
    try{
      localStorage.setItem(vendorSessionKey,JSON.stringify({token:session.token,created_at:Date.now()}));
      return true;
    }catch(e){return false;}
  }

  async function authedPost(path,body){
    const headers=typeof authHeaders==='function'?authHeaders():null;
    if(!headers){
      if(typeof showLogin==='function') showLogin();
      throw new Error('Not signed in');
    }
    const res=await fetch(api+path,{method:'POST',headers,body:JSON.stringify(body||{})});
    const data=await res.json().catch(()=>({}));
    if(res.status===401){
      try{clearAccess();showLogin();show(f.loginNotice,'bad','Session expired or access rejected. Sign in again.');}catch(e){}
      throw new Error('Session expired. Sign in again.');
    }
    if(!res.ok||!data.ok) throw new Error((data&&(data.error||data.message))||('HTTP '+res.status));
    return data;
  }

  function updateVendorPacketUi(){
    const ui=ensureVendorPacketUi();
    const quote=getSelectedQuote();
    const quoteId=selectedQuoteId();
    const operational=Boolean(quoteId)&&isOperationalStatus(quote&&quote.status);
    const canShowStatus=hasVendorPacketFields(quote);
    const isSent=statusKey(quote&&quote.vendor_packet_status)==='sent_to_vendor';
    if(ui.summary){
      if(canShowStatus){
        ui.summary.textContent='Vendor Packet: '+packetLabel(quote&&quote.vendor_packet_status);
        ui.summary.style.display='';
      }else{
        ui.summary.textContent='';
        ui.summary.style.display='none';
      }
    }
    if(ui.resend){
      ui.resend.disabled=!operational||vendorPacketBusy;
      ui.resend.title=operational?'Email the vendor packet link to the store again.':'Available after quote is In-Production, Ready, or Completed.';
    }
    if(ui.markSent){
      ui.markSent.disabled=!operational||vendorPacketBusy||isSent;
      ui.markSent.title=isSent?'Vendor packet already marked sent to vendor.':(operational?'Confirm the store has sent the packet to the vendor.':'Available after quote is In-Production, Ready, or Completed.');
    }
    if(ui.vendorForms){
      ui.vendorForms.disabled=!operational||vendorPacketBusy;
      ui.vendorForms.title=operational?'Open printable vendor forms.':'Available after quote is In-Production, Ready, or Completed.';
    }
  }

  function withVendorBusy(run){
    return async function(){
      vendorPacketBusy=true;
      updateVendorPacketUi();
      try{
        await run();
      }finally{
        vendorPacketBusy=false;
        updateVendorPacketUi();
      }
    };
  }

  const sendPacketToStore=withVendorBusy(async function(){
    const quoteId=selectedQuoteId();
    if(!quoteId){
      try{show(f.result,'bad','Load a quote before resending the vendor packet.');}catch(e){alert('Load a quote before resending the vendor packet.');}
      return;
    }
    try{
      show(f.result,'warn','Sending vendor packet to store...');
      const data=await authedPost('/api/vendor-packet/send-to-store',{quote_id:quoteId});
      if(data&&data.email_status&&data.email_status.ok===false){
        show(f.result,'bad','Vendor packet send failed: '+String(data.email_status.error||'Unknown email error'));
      }else{
        show(f.result,'ok','Vendor packet sent to store.');
      }
      if(typeof loadAdminQuote==='function') await loadAdminQuote(quoteId);
    }catch(e){
      try{show(f.result,'bad','Vendor packet send failed: '+String(e&&e.message?e.message:e));}catch(err){alert(String(e&&e.message?e.message:e));}
    }
  });

  const markSentToVendor=withVendorBusy(async function(){
    const quoteId=selectedQuoteId();
    if(!quoteId){
      try{show(f.result,'bad','Load a quote before marking sent to vendor.');}catch(e){alert('Load a quote before marking sent to vendor.');}
      return;
    }
    const notes=window.prompt('Optional notes for this vendor send confirmation:','');
    if(notes===null) return;
    try{
      show(f.result,'warn','Saving vendor send confirmation...');
      await authedPost('/api/vendor-packet/mark-sent-to-vendor',{quote_id:quoteId,method:'email',notes:notes||''});
      show(f.result,'ok','Vendor packet marked sent to vendor.');
      if(typeof loadAdminQuote==='function') await loadAdminQuote(quoteId);
    }catch(e){
      try{show(f.result,'bad','Vendor send update failed: '+String(e&&e.message?e.message:e));}catch(err){alert(String(e&&e.message?e.message:e));}
    }
  });

  function openVendorForms(){
    const quoteId=selectedQuoteId();
    if(!quoteId){
      try{show(f.result,'bad','Load a quote before generating vendor forms.');}catch(e){alert('Load a quote before generating vendor forms.');}
      return;
    }
    const quote=getSelectedQuote();
    if(!isOperationalStatus(quote&&quote.status)){
      try{show(f.result,'bad','Vendor forms are available only for In-Production, Ready, or Completed orders.');}catch(e){alert('Vendor forms are available only for In-Production, Ready, or Completed orders.');}
      return;
    }
    if(!stageVendorSession()){
      try{show(f.result,'bad','Staff session was not available. Sign out and sign back in before generating vendor forms.');}catch(e){alert('Staff session was not available. Sign out and sign back in before generating vendor forms.');}
      return;
    }
    window.location.href='/vendor-forms.html?quote_id='+encodeURIComponent(quoteId);
  }

  const previousSetWorkflow=window.setWorkflow;
  if(typeof previousSetWorkflow==='function'){
    window.setWorkflow=function(quote){
      previousSetWorkflow(quote);
      updateVendorPacketUi();
    };
  }

  const previousRenderQuoteDetail=window.renderQuoteDetail;
  if(typeof previousRenderQuoteDetail==='function'){
    window.renderQuoteDetail=function(quote,items){
      previousRenderQuoteDetail(quote,items);
      updateVendorPacketUi();
    };
  }

  const previousBusy=window.busy;
  if(typeof previousBusy==='function'){
    window.busy=function(x){
      previousBusy(x);
      if(!vendorPacketBusy) updateVendorPacketUi();
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ensureVendorPacketUi();
    updateVendorPacketUi();
  });

  setTimeout(()=>{
    ensureVendorPacketUi();
    updateVendorPacketUi();
  },0);
})();
