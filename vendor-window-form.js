// Vendor Window Screen Form Generator
// Generates source-faithful Screen Fab / PHX window screen vendor forms from quote data.
(function(){
  const FRAME_OPTIONS=['5/16 X 3/4','5/16 X 1','3/8 X 3/4','7/16 X 3/4','7/16 X 1','3/4 STANDOFF','3/4 KE','INV KE'];
  const MATERIAL_OPTIONS=['FIBERGLASS','ALUMINUM','PET SCREEN','SOLAR 70','SUNTEX 80%','SUNTEX 90%','SUPER SOLAR 90'];
  const SAFE_STATUSES=['in_production','ready','completed'];
  const KNOWN_COLORS=['white','black','bronze','champagne','almond','charcoal','gray','grey','brown','tan'];

  function safe(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
  function norm(v){return String(v??'').toLowerCase().replace(/&quot;/g,'').replace(/["']/g,'').replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim()}
  function compact(v){return norm(v).replace(/\s+/g,'').replace(/x/g,'x')}
  function upper(v){return String(v??'').trim().toUpperCase()}
  function displayDate(d){const date=d?new Date(d):new Date(); if(Number.isNaN(date.getTime()))return new Date().toLocaleDateString('en-US'); return date.toLocaleDateString('en-US')}
  function chunk(arr,size){const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out}

  function matchOption(value,options){
    const c=compact(value);
    return options.find(o=>compact(o)===c)||options.find(o=>c.includes(compact(o))||compact(o).includes(c))||'';
  }

  function normalizeColor(value){
    const n=norm(value);
    if(!n)return '';
    if(n==='grey')return 'GRAY';
    return upper(n);
  }

  function colorFromText(value){
    const raw=String(value??'');
    if(!raw.trim())return '';
    const slashParts=raw.split('/').map(p=>norm(p)).filter(Boolean);
    if(slashParts.length>1){
      const last=slashParts[slashParts.length-1];
      const direct=KNOWN_COLORS.find(c=>last===c||last.includes(c));
      if(direct)return normalizeColor(direct);
    }
    const n=norm(raw);
    const found=KNOWN_COLORS.find(c=>new RegExp('(^|\\s)'+c+'(\\s|$)').test(n));
    return found?normalizeColor(found):'';
  }

  function itemColor(item,explicitField,typeField){
    const explicit=normalizeColor(item&&item[explicitField]);
    if(explicit)return explicit;
    return colorFromText(item&&item[typeField])||colorFromText(item&&item.description)||'';
  }

  function frameColorValue(item){return itemColor(item,'frame_color','frame_type')}
  function materialColorValue(item){return itemColor(item,'material_color','material_type')}

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

  function frameOption(value){return matchOption(value,FRAME_OPTIONS)}
  function normalizeCut(value){const n=norm(value);return n.includes('mit')?'mitre':'straight'}
  function spreaderChoice(item){
    const raw=upper(item.crossbar_type||item.spreader_bar_size||'');
    if(raw.includes('5/16'))return '5/16X3/4';
    if(raw.includes('3/4 HG'))return '3/4 HG';
    if(item.crossbar_needed && compact(item.frame_type).includes('5/16x3/4'))return '5/16X3/4';
    return item.crossbar_needed?'3/4 HG':'';
  }

  function parseHardware(raw){
    if(Array.isArray(raw))return raw;
    if(!raw)return [];
    if(typeof raw==='string'){
      try{const parsed=JSON.parse(raw);return Array.isArray(parsed)?parsed:[];}catch(e){return []}
    }
    if(typeof raw==='object')return Object.values(raw).filter(Boolean);
    return [];
  }

  function normalizeHardwareAssignment(a){
    const initials=upper(a.initials||a.initial||a.code||a.hardware_initials||a.typeId||a.type||'?').replace(/[^A-Z0-9]/g,'').slice(0,4)||'?';
    const sideRaw=norm(a.side||a.location||a.hardware_location||'');
    const side=sideRaw.includes('top')?'top':sideRaw.includes('bottom')||sideRaw.includes('bott')?'bottom':sideRaw.includes('left')?'left':sideRaw.includes('right')?'right':'top';
    const qty=Math.max(1,Number(a.qty||a.quantity||a.count||1));
    return {initials,side,qty};
  }

  function hardwareAssignments(item){return parseHardware(item.hardware_json||item.hardwareAssignments||item.hardware_assignments).map(normalizeHardwareAssignment)}

  function hardwareNote(item){
    const groups={top:[],right:[],bottom:[],left:[]};
    hardwareAssignments(item).forEach(a=>{if(groups[a.side]&&!groups[a.side].includes(a.initials))groups[a.side].push(a.initials)});
    const parts=[];
    if(groups.top.length)parts.push('Top:'+groups.top.join('+'));
    if(groups.right.length)parts.push('Right:'+groups.right.join('+'));
    if(groups.bottom.length)parts.push('Bott:'+groups.bottom.join('+'));
    if(groups.left.length)parts.push('Left:'+groups.left.join('+'));
    if(item.crossbar_needed){
      const o=norm(item.crossbar_orientation||'horizontal').startsWith('v')?'Vert':'Hor';
      const d=String(item.crossbar_distance_display||item.crossbarDistance||'').trim();
      parts.push(d?o+':'+d:o);
    }
    return parts.join(', ');
  }

  function lineSignature(item){
    return [
      item.width_display,item.height_display,hardwareNote(item),JSON.stringify(hardwareAssignments(item)),
      item.crossbar_needed,item.crossbar_orientation,item.crossbar_distance_display
    ].map(v=>String(v??'')).join('|');
  }

  function pageGroupKey(item){
    return [
      frameOption(item.frame_type)||item.frame_type,
      upper(frameColorValue(item)),
      materialOption(item.material_type)||item.material_type,
      upper(materialColorValue(item)),
      normalizeCut(item.frame_cut_type),
      spreaderChoice(item)
    ].map(v=>String(v??'')).join('|');
  }

  function summarizeRows(items){
    const map=new Map();
    items.forEach((item)=>{
      const key=lineSignature(item);
      if(!map.has(key))map.set(key,{...item,qty:0,vendor_note:hardwareNote(item),hardware_assignments:hardwareAssignments(item)});
      const row=map.get(key);
      row.qty+=Math.max(1,Number(item.qty||1));
    });
    return Array.from(map.values());
  }

  function buildPages(quote,items){
    const windowItems=(items||[]).filter(it=>norm(it.type||it.screenType||'window')!=='door');
    const groups=new Map();
    windowItems.forEach(item=>{const key=pageGroupKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)});
    const pages=[];
    groups.forEach(groupItems=>{
      const rows=summarizeRows(groupItems);
      chunk(rows,10).forEach(rowChunk=>pages.push({prototype:groupItems[0],rows:rowChunk}));
    });
    const totalQty=windowItems.reduce((sum,it)=>sum+Math.max(1,Number(it.qty||1)),0);
    return {pages,totalQty};
  }

  function renderChoiceTable(label,options,selectedOption,selectedValue){
    return '<div class="side-label-row"><div class="side-label">'+label+'</div><table class="choice"><tr>'+options.map(o=>'<th>'+safe(o).replace(/ /g,'<br class="soft-break">')+'</th>').join('')+'</tr><tr>'+options.map(o=>'<td class="'+(o===selectedOption?'fill':'')+'">'+(o===selectedOption?safe(upper(selectedValue)):'')+'</td>').join('')+'</tr></table></div>';
  }

  function renderCut(cut){
    const isMitre=cut==='mitre';
    return '<div class="cut"><span>MITRE CUT <span class="box '+(isMitre?'checked':'')+'"></span></span><span>STRAIGHT CUT <span class="box '+(!isMitre?'checked':'')+'"></span></span></div>';
  }

  function sidePosition(side,index,count){
    const pct=(index+1)/(count+1)*100;
    if(side==='top')return 'top:0;left:calc('+pct+'% - .0825in)';
    if(side==='bottom')return 'bottom:0;left:calc('+pct+'% - .0825in)';
    if(side==='left')return 'left:0;top:calc('+pct+'% - .0575in)';
    return 'right:0;top:calc('+pct+'% - .0575in)';
  }

  function renderHardwareBadges(assignments){
    const expanded=[];
    assignments.forEach(a=>{for(let i=0;i<a.qty;i++)expanded.push({side:a.side,initials:a.initials})});
    const bySide={top:[],right:[],bottom:[],left:[]};
    expanded.forEach(a=>bySide[a.side].push(a));
    return Object.keys(bySide).flatMap(side=>bySide[side].map((a,i)=>'<span class="hw-badge" style="'+sidePosition(side,i,bySide[side].length)+'">'+safe(a.initials)+'</span>')).join('');
  }

  function renderDiagram(row,lineNumber){
    if(!row)return '<div class="diagram-cell"><span class="diagram-num">'+lineNumber+'</span><div class="diagram-frame blank"></div></div>';
    const cross=row.crossbar_needed?'<span class="crossbar-line '+(norm(row.crossbar_orientation).startsWith('v')?'vertical':'')+'"></span>':'';
    return '<div class="diagram-cell"><span class="diagram-num">'+lineNumber+'</span><div class="diagram-frame">'+renderHardwareBadges(row.hardware_assignments||[]) + cross + '</div></div>';
  }

  function renderLines(rows){
    const out=['<table class="lines"><tr><th>QTY</th><th>WIDTH</th><th>HEIGHT</th><th>HARDWARE</th></tr>'];
    for(let i=0;i<10;i++){
      const r=rows[i];
      out.push('<tr><td>'+(r?safe(r.qty):'')+'</td><td>'+(r?safe(r.width_display):'')+'</td><td>'+(r?safe(r.height_display):'')+'</td><td class="notes">'+(r?safe(r.vendor_note):'')+'</td></tr>');
    }
    out.push('</table>');
    return out.join('');
  }

  function renderDiagramGrid(rows){
    const out=['<div class="diagram-grid">'];
    for(let i=0;i<10;i++)out.push(renderDiagram(rows[i],i+1));
    out.push('</div>');
    return out.join('');
  }

  function renderSpreader(spreader){
    return '<table class="spreader-table"><tr><td class="spreader-title" colspan="2">SPREADER BAR SIZE:</td></tr><tr><td class="spreader-option">3/4 HG <span class="box '+(spreader==='3/4 HG'?'checked':'')+'"></span></td><td class="spreader-option">5/16X3/4 <span class="box '+(spreader==='5/16X3/4'?'checked':'')+'"></span></td></tr></table>';
  }

  function renderPage(quote,page,index,totalPages,totalQty){
    const p=page.prototype||{};
    const frame=frameOption(p.frame_type)||upper(p.frame_type);
    const frameColor=frameColorValue(p);
    const material=materialOption(p.material_type)||upper(p.material_type);
    const materialColor=materialColorValue(p);
    const cut=normalizeCut(p.frame_cut_type);
    const spreader=spreaderChoice(p);
    const orderId=quote.vendor_order_number||quote.sales_order_number||quote.order_number||quote.id||'';
    const job=quote.vendor_job_name||quote.job_name||quote.customer_name||quote.id||'';
    return '<div class="page">'+
      '<div class="top"><div class="logo"><div class="sf">Screen<br>Fab</div><div class="arch"><span class="a"></span><span class="b"></span><span class="c"></span></div></div><div class="addr">2465 S. 19th Ave Bldg E<br>Phoenix, AZ 85009<br>www.screenfab.com</div><div class="contact">Tel 602-253-9700<br><br>Email: orders-phoenix@screenfabs.com</div></div>'+
      '<h1>SCREEN ORDER FORM</h1><div class="pg">PG <span>'+index+'</span> OF <span>'+totalPages+'</span></div>'+
      '<table class="meta"><tr><td class="label">DEALER:</td><td>'+safe(quote.store_name||'Skye ACE Hardware')+'</td><td class="label">DATE:</td><td>'+safe(displayDate())+'</td><td class="branch">WILL CALL</td><td class="branch">EAST</td></tr><tr><td class="label">PHONE:</td><td>'+safe(quote.store_phone||'')+'</td><td class="label">SALES ORDER:</td><td>'+safe(orderId)+'</td><td class="branch">WEST</td><td class="branch">NORTH</td></tr><tr><td class="label">JOB NAME/P.O.#:</td><td>'+safe(job)+'</td><td class="label">TOTAL # OF SCREENS:</td><td>'+safe(totalQty)+'</td><td class="branch">TUCSON</td><td class="branch vegas">VEGAS</td></tr></table>'+
      renderCut(cut)+
      renderChoiceTable('FRAME<br>SIZE / COLOR',FRAME_OPTIONS,frame,frameColor)+
      renderChoiceTable('MATERIAL<br>TYPE / COLOR',MATERIAL_OPTIONS,material,materialColor)+
      '<div class="line-area">'+renderLines(page.rows)+'<div class="drawing-wrap"><div class="drawing-head">DRAWING</div><div class="drawing-box">'+renderDiagramGrid(page.rows)+'</div>'+renderSpreader(spreader)+'</div></div>'+
      '<div class="comments"><strong>SPECIAL INSTRUCTIONS:</strong> <span class="comment-line"></span></div></div>';
  }

  function renderVendorWindowForms(quote,items){
    quote=quote||{};items=items||[];
    if(!SAFE_STATUSES.includes(norm(quote.status))){
      return '<main class="shell"><div class="notice bad">Vendor forms are only available for In-Production, Ready, or Completed orders.</div></main>';
    }
    const built=buildPages(quote,items);
    if(!built.pages.length){return '<main class="shell"><div class="notice warn">No window screen items found on this quote.</div></main>'}
    return built.pages.map((page,i)=>renderPage(quote,page,i+1,built.pages.length,built.totalQty)).join('');
  }

  window.VendorWindowForms={render:renderVendorWindowForms,buildPages,hardwareNote,hardwareAssignments};
})();
