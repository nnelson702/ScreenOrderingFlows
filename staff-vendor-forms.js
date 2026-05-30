// Staff portal add-on: opens printable vendor forms for operational orders.
(function(){
  const allowedStatuses=['in_production','ready','completed'];
  const vendorSessionKey='screen_vendor_forms_session';

  function statusKey(v){return String(v||'').toLowerCase().replace(/[-\s]+/g,'_').trim();}
  function isOperationalStatus(v){return allowedStatuses.includes(statusKey(v));}

  function ensureVendorFormButton(){
    if(document.getElementById('vendorFormsBtn')) return;
    const workflow=document.querySelector('.workflow .actions');
    if(!workflow) return;
    const btn=document.createElement('button');
    btn.id='vendorFormsBtn';
    btn.type='button';
    btn.className='secondary';
    btn.textContent='Generate Vendor Forms';
    btn.disabled=true;
    btn.onclick=openVendorForms;
    workflow.appendChild(btn);
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

  function updateVendorButton(){
    ensureVendorFormButton();
    const btn=document.getElementById('vendorFormsBtn');
    if(!btn) return;
    const quote=getSelectedQuote();
    const quoteId=selectedQuoteId();
    const enabled=Boolean(quoteId)&&isOperationalStatus(quote&&quote.status);
    btn.disabled=!enabled;
    btn.title=enabled?'Open printable vendor forms.':'Available after quote is In-Production, Ready, or Completed.';
  }

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
      updateVendorButton();
    };
  }

  const previousRenderQuoteDetail=window.renderQuoteDetail;
  if(typeof previousRenderQuoteDetail==='function'){
    window.renderQuoteDetail=function(quote,items){
      previousRenderQuoteDetail(quote,items);
      updateVendorButton();
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ensureVendorFormButton();
    updateVendorButton();
  });

  setTimeout(()=>{
    ensureVendorFormButton();
    updateVendorButton();
  },0);
})();
