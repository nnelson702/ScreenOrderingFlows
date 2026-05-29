// Vendor Patio Door Form Generator
// Generates source-faithful Screen Fab / PHX patio door vendor forms from quote data.
(function(){
  const DOOR_OPTIONS=['ROLLFORMED STEEL','STANDARD ALUMINUM','SUPREME ALUMINUM'];
  const MATERIAL_OPTIONS=['FIBERGLASS','ALUMINUM','PET SCREEN','SOLAR 70','SUNTEX 80%','SUNTEX 90%','SUPER SOLAR 90'];
  const SAFE_STATUSES=['in_production','ready','completed'];

  function safe(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
  function norm(v){return String(v??'').toLowerCase().replace(/&quot;/g,'').replace(/["']/g,'').replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim()}
  function compact(v){return norm(v).replace(/\s+/g,'')}
  function upper(v){return String(v??'').trim().toUpperCase()}
  function displayDate(d){const date=d?new Date(d):new Date(); if(Number.isNaN(date.getTime()))return new Date().toLocaleDateString('en-US'); return date.toLocaleDateString('en-US')}
  function chunk(arr,size){const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out}

  function matchOption(value,options){
    const c=compact(value);
    return options.find(o=>compact(o)===c)||options.find(o=>c.includes(compact(o))||compact(o).includes(c))||'';
  }

  function materialOption(value){
    const n=norm(value);
    if(n.includes('fiberglass')||n==='fiber glass')return 'FIBERGLASS';
    if(n.includes('aluminum')||n.includes('aluminium'))return 'ALUMINUM';
    if(n.includes('pet'))return 'PET SCREEN';
    if(n.includes('solar 70'))return 'SOLAR 70';
    if(n.includes('suntex 80')||n.includes('suntek 80'))return 'SUNTEX 80%';
    if(n.includes('suntex 90')||n.includes('suntek 90'))return 'SUNTEX 90%';
    if(n.includes('super solar'))return 'SUPER SOLAR 90';
    return matchOption(value,MATERIAL_OPTIONS);
  }

  function doorOption(value){
    const n=norm(value);
    if(n.includes('roll')||n.includes('steel'))return 'ROLLFORMED STEEL';
    if(n.includes('standard'))return 'STANDARD ALUMINUM';
    if(n.includes('supreme'))return 'SUPREME ALUMINUM';
    return matchOption(value,DOOR_OPTIONS)||'STANDARD ALUMINUM';
  }

  function get(item, snake, camel){return item?.[snake] ?? item?.[camel] ?? ''}
  function isDoor(item){return norm(get(item,'type','screenType')||'window')==='door'}
  function rollerType(item){const n=norm(get(item,'roller_type','doorRollers')||'steel'); return n.includes('nylon')?'nylon':'steel'}
  function rollerLabel(item){return rollerType(item)==='nylon'?'Nylon rollers':'Steel rollers'}
  function handleSide(item){
    const n=norm(get(item,'handle_orientation','handleOrientation'));
    if(n.includes('left')||n==='xo'||n.includes('xo'))return 'left';
    if(n.includes('right')||n==='ox'||n.includes('ox'))return 'right';
    return 'right';
  }
  function handleDisplay(item){return handleSide(item)==='left'?'Left':'Right'}
  function handleHeight(item){return String(get(item,'handle_height_display','handleHeightDisplay')||'').trim()}

  function commentNote(item){
    const parts=[rollerLabel(item)];
    const hh=handleHeight(item);
    parts.push(handleDisplay(item)+': '+(hh||''));
    return parts.join(', ').trim();
  }

  function lineSignature(item){
    return [get(item,'width_display','width'),get(item,'height_display','height'),commentNote(item),doorOption(get(item,'frame_type','frameType')),upper(get(item,'frame_color','frameColor')),materialOption(get(item,'material_type','materialType')),upper(get(item,'material_color','materialColor')),rollerType(item),handleSide(item),handleHeight(item)].join('|');
  }

  function pageGroupKey(item){
    return [doorOption(get(item,'frame_type','frameType')),upper(get(item,'frame_color','frameColor')),materialOption(get(item,'material_type','materialType')),upper(get(item,'material_color','materialColor')),rollerType(item),handleSide(item)].join('|');
  }

  function summarizeRows(items){
    const map=new Map();
    items.forEach(item=>{
      const key=lineSignature(item);
      if(!map.has(key))map.set(key,{...item,qty:0,vendor_note:commentNote(item)});
      map.get(key).qty+=Math.max(1,Number(item.qty||1));
    });
    return Array.from(map.values());
  }

  function buildPages(quote,items){
    const doorItems=(items||[]).filter(isDoor);
    const groups=new Map();
    doorItems.forEach(item=>{const key=pageGroupKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)});
    const pages=[];
    groups.forEach(groupItems=>{
      const rows=summarizeRows(groupItems);
      chunk(rows,6).forEach(rowChunk=>pages.push({prototype:groupItems[0],rows:rowChunk}));
    });
    const totalQty=doorItems.reduce((sum,it)=>sum+Math.max(1,Number(it.qty||1)),0);
    return {pages,totalQty};
  }

  function renderChoiceTable(label,options,selectedOption,selectedValue){
    return '<div class="patio-row"><div class="patio-side">'+label+'</div><table class="patio-choice"><tr>'+options.map(o=>'<th>'+safe(o).replace(/ /g,'<br>')+'</th>').join('')+'</tr><tr>'+options.map(o=>'<td class="'+(o===selectedOption?'fill':'')+'">'+(o===selectedOption?safe(upper(selectedValue)):'')+'</td>').join('')+'</tr></table></div>';
  }

  function renderControls(p){
    const rollers=rollerType(p);
    const side=handleSide(p);
    return '<div class="patio-controls"><div class="patio-control">ROLLERS:<div class="patio-control-line"><span>NYLON <span class="box '+(rollers==='nylon'?'checked':'')+'"></span></span><span>STEEL <span class="box '+(rollers==='steel'?'checked':'')+'"></span></span></div></div><div class="patio-control">HANDLE PLACEMENT:<div class="patio-control-line"><span>XO / LEFT <span class="box '+(side==='left'?'checked':'')+'"></span></span><span>OX / RIGHT <span class="box '+(side==='right'?'checked':'')+'"></span></span></div></div><div class="patio-control">OTHER:<div class="patio-control-line"><span>KD DOOR <span class="box"></span></span><span>TOP HUNG <span class="box"></span></span></div></div></div>';
  }

  function renderLines(rows){
    const out=['<table class="patio-lines"><tr><th>QTY</th><th>HEIGHT</th><th>WIDTH</th><th>COMMENTS</th></tr>'];
    for(let i=0;i<6;i++){
      const r=rows[i];
      out.push('<tr><td>'+(r?safe(r.qty):'')+'</td><td>'+(r?safe(get(r,'height_display','height')):'')+'</td><td>'+(r?safe(get(r,'width_display','width')):'')+'</td><td class="comment">'+(r?safe(r.vendor_note):'')+'</td></tr>');
    }
    out.push('</table>');
    return out.join('');
  }

  function renderDoorDiagram(row,letter){
    if(!row)return '<div class="patio-cell"><span class="patio-letter">'+letter+'</span><div class="patio-door-frame blank"></div></div>';
    const side=handleSide(row);
    const hh=handleHeight(row);
    const handleClass=side==='left'?'left':'right';
    const measure=hh?'<span class="patio-measure '+handleClass+'"><span class="patio-measure-line"></span><span class="patio-measure-label">'+safe(hh)+'</span></span>':'';
    return '<div class="patio-cell"><span class="patio-letter">'+letter+'</span><div class="patio-door-frame"><span class="patio-handle '+handleClass+'">H</span>'+measure+'<span class="patio-roller left"></span><span class="patio-roller right"></span></div></div>';
  }

  function renderDiagramGrid(rows){
    const letters=['A','B','C','D','E','F'];
    return '<div class="patio-grid">'+letters.map((l,i)=>renderDoorDiagram(rows[i],l)).join('')+'</div>';
  }

  function renderPage(quote,page,index,totalPages,totalQty){
    const p=page.prototype||{};
    const door=doorOption(get(p,'frame_type','frameType'));
    const material=materialOption(get(p,'material_type','materialType'))||upper(get(p,'material_type','materialType'));
    const orderId=quote.vendor_order_number||quote.sales_order_number||quote.order_number||quote.id||'';
    const job=quote.vendor_job_name||quote.job_name||quote.customer_name||quote.id||'';
    return '<div class="page patio-page">'+
      '<div class="top"><div class="logo"><div class="sf">Screen<br>Fab</div><div class="arch"></div></div><div class="addr">2465 S. 19th Ave Bldg E<br>Phoenix, AZ 85009<br>www.screenfab.com</div><div class="contact">Tel 602-253-9700<br><br>Email: orders-phoenix@screenfabs.com</div></div>'+
      '<h1>PATIO DOOR ORDER FORM</h1><div class="pg">PG <span>'+index+'</span> OF <span>'+totalPages+'</span></div>'+
      '<table class="meta"><tr><td><b>DEALER:</b></td><td>'+safe(quote.store_name||'Skye ACE Hardware')+'</td><td><b>DATE:</b></td><td>'+safe(displayDate())+'</td><td class="branch">WILL CALL</td><td class="branch">EAST</td></tr><tr><td><b>PHONE:</b></td><td>'+safe(quote.store_phone||'')+'</td><td><b>SALES ORDER:</b></td><td>'+safe(orderId)+'</td><td class="branch">WEST</td><td class="branch">NORTH</td></tr><tr><td><b>JOB NAME/P.O.#:</b></td><td>'+safe(job)+'</td><td><b>TOTAL # OF DOORS:</b></td><td>'+safe(totalQty)+'</td><td class="branch">TUCSON</td><td class="branch vegas">VEGAS</td></tr></table>'+
      renderChoiceTable('DOOR<br>TYPE / COLOR',DOOR_OPTIONS,door,get(p,'frame_color','frameColor'))+
      renderControls(p)+
      renderChoiceTable('MATERIAL<br>TYPE / COLOR',MATERIAL_OPTIONS,material,get(p,'material_color','materialColor'))+
      '<div class="patio-bottom">'+renderLines(page.rows)+'<div class="patio-drawing"><div class="patio-drawing-head">DRAWING</div><div class="patio-drawing-box">'+renderDiagramGrid(page.rows)+'</div></div></div>'+
      '<div class="patio-special"><strong>SPECIAL INSTRUCTIONS:</strong> <span class="patio-line"></span></div></div>';
  }

  function renderVendorDoorForms(quote,items){
    quote=quote||{};items=items||[];
    if(!SAFE_STATUSES.includes(norm(quote.status))){return '<main class="shell"><div class="notice bad">Vendor forms are only available for In-Production, Ready, or Completed orders.</div></main>'}
    const built=buildPages(quote,items);
    if(!built.pages.length){return '<main class="shell"><div class="notice warn">No patio door items found on this quote.</div></main>'}
    return built.pages.map((page,i)=>renderPage(quote,page,i+1,built.pages.length,built.totalQty)).join('');
  }

  window.VendorDoorForms={render:renderVendorDoorForms,buildPages,commentNote};
})();
