// Staff portal add-on: opens printable vendor forms for operational orders.
(function(){
  const allowedStatuses=['in_production','ready','completed'];

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

  function updateVendorButton(){
    ensureVendorFormButton();
    const btn=document.getElementById('vendorFormsBtn');
    if(!btn) return;
    const quote=getSelectedQuote();
    const status=String((quote&&quote.status)||'').toLowerCase();
    const quoteId=selectedQuoteId();
    const enabled=Boolean(quoteId)&&allowedStatuses.includes(status);
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
    const status=String((quote&&quote.status)||'').toLowerCase();
    if(!allowedStatuses.includes(status)){
      try{show(f.result,'bad','Vendor forms are available only for In-Production, Ready, or Completed orders.');}catch(e){alert('Vendor forms are available only for In-Production, Ready, or Completed orders.');}
      return;
    }
    window.open('/vendor-forms.html?quote_id='+encodeURIComponent(quoteId),'_blank','noopener');
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
