// quote-display-fixes.js
// Beta runtime corrections for workbook data, swatch color selection, and compact line-item display.
(function(){
  var STORE_OVERRIDES = [
    { id:'18228', name:'SKYE-ACE Tropicana', city:'Las Vegas', state:'NV', zip:'89121', email:'ACE_18228@skyecos.com', address:'3145 E. Tropicana Blvd', phone:'7259773444', imageId:'1At3jAbLQqp-Z0lX5U4c3BB4JLAoqxwTN' },
    { id:'18507', name:'SKYE-ACE Horizon Ridge', city:'Henderson', state:'NV', zip:'89012', email:'ACE_18507@skyecos.com', address:'1450 W. Horizon Ridge Pkwy #420', phone:'7027500111', imageId:'1-LE0iA1BNFh9PT-yUVN1s3La5wdlzblJ' },
    { id:'18690', name:'SKYE-ACE Rainbow', city:'Las Vegas', state:'NV', zip:'89103', email:'ACE_18690@Skyecos.com', address:'3665 S. Rainbow Blvd #100A-B', phone:'7023317006', imageId:'1vMPBQ5FEh2KNgrA_kmw5N5GvFfe0Ww1n' },
    { id:'19117', name:'SKYE-ACE Green Valley', city:'Henderson', state:'NV', zip:'89014', email:'ACE_19117@Skyecos.com', address:'2255 N. Green Valley Pkwy #110', phone:'7028678566', imageId:'1h1aoHaob3SIR65gTYUaMnQap9jQFGiRx' }
  ];

  var STORE_COORD_OVERRIDES = {
    '18228': { lat:36.09834491, lng:-115.1061869 },
    '18507': { lat:36.02241113, lng:-115.0497763 },
    '18690': { lat:36.12264745, lng:-115.244173 },
    '19117': { lat:36.05645598, lng:-115.084989 }
  };

  var MATERIAL_COLORS = {
    'FIBERGLASS': ['Black','Grey'],
    'ALUMINUM': ['Brite'],
    'PET': ['Black'],
    'VIMCO 20x30': ['Black'],
    'SOLAR 70': ['Black'],
    'SUNTEX 80': ['Black','Brown','Grey','Dark Bronze','Stucco','Beige'],
    'SUNTEX 90': ['Black','Brown','Grey','Dark Bronze','Stucco','Beige'],
    'SOLAR 90': ['Black','Brown']
  };

  var PRICING_WINDOW = [
    ['FIBERGLASS','5/16 x 3/4',0.53],['FIBERGLASS','7/16 x 3/4',0.53],['FIBERGLASS','3/8 x 3/4',0.53],['FIBERGLASS','STANDOFF',0.60],['FIBERGLASS','3/8 x KE',0.53],
    ['ALUMINUM','5/16 x 3/4',0.73],['ALUMINUM','7/16 x 3/4',0.73],['ALUMINUM','3/8 x 3/4',0.73],['ALUMINUM','STANDOFF',0.79],['ALUMINUM','3/8 x KE',0.73],
    ['PET','5/16 x 3/4',0.92],['PET','7/16 x 3/4',0.92],['PET','3/8 x 3/4',0.92],['PET','STANDOFF',1.00],['PET','3/8 x KE',0.92],
    ['VIMCO 20x30','5/16 x 3/4',0.92],['VIMCO 20x30','7/16 x 3/4',0.92],['VIMCO 20x30','3/8 x 3/4',0.92],['VIMCO 20x30','STANDOFF',0.92],['VIMCO 20x30','3/8 x KE',0.92],
    ['SOLAR 70','5/16 x 3/4',0.92],['SOLAR 70','7/16 x 3/4',0.92],['SOLAR 70','3/8 x 3/4',0.92],['SOLAR 70','STANDOFF',1.00],['SOLAR 70','3/8 x KE',0.92],
    ['SUNTEX 80','5/16 x 3/4',0.92],['SUNTEX 80','7/16 x 3/4',0.92],['SUNTEX 80','3/8 x 3/4',0.92],['SUNTEX 80','STANDOFF',1.00],['SUNTEX 80','3/8 x KE',0.92],
    ['SUNTEX 90','5/16 x 3/4',0.92],['SUNTEX 90','7/16 x 3/4',0.92],['SUNTEX 90','3/8 x 3/4',0.92],['SUNTEX 90','STANDOFF',1.00],['SUNTEX 90','3/8 x KE',0.92],
    ['SOLAR 90','5/16 x 3/4',0.92],['SOLAR 90','7/16 x 3/4',0.92],['SOLAR 90','3/8 x 3/4',0.92],['SOLAR 90','STANDOFF',1.00],['SOLAR 90','3/8 x KE',0.92]
  ].map(function(r){ return { materialId:r[0], frameId:r[1], retailPerInch:r[2] }; });

  var PRICING_DOOR = [
    ['FIBERGLASS','Standard Aluminum',1.25],['FIBERGLASS','Premium Aluminum',1.44],['FIBERGLASS','Rolled Form Steel',0.80],
    ['ALUMINUM','Standard Aluminum',1.35],['ALUMINUM','Premium Aluminum',1.55],['ALUMINUM','Rolled Form Steel',0.87],
    ['PET','Standard Aluminum',1.70],['PET','Premium Aluminum',1.93],['PET','Rolled Form Steel',1.10],
    ['VIMCO 20x30','Standard Aluminum',1.85],['VIMCO 20x30','Premium Aluminum',2.15],['VIMCO 20x30','Rolled Form Steel',1.25],
    ['SOLAR 70','Standard Aluminum',1.47],['SOLAR 70','Premium Aluminum',1.66],['SOLAR 70','Rolled Form Steel',1.00],
    ['SUNTEX 80','Standard Aluminum',1.70],['SUNTEX 80','Premium Aluminum',1.93],['SUNTEX 80','Rolled Form Steel',1.10],
    ['SUNTEX 90','Standard Aluminum',1.82],['SUNTEX 90','Premium Aluminum',2.02],['SUNTEX 90','Rolled Form Steel',1.17],
    ['SOLAR 90','Standard Aluminum',1.82],['SOLAR 90','Premium Aluminum',2.02],['SOLAR 90','Rolled Form Steel',1.17]
  ].map(function(r){ return { materialId:r[0], frameId:r[1], retailPerInch:r[2] }; });

  function byId(id){ return document.getElementById(id); }
  function colorId(label){ return String(label||'').toLowerCase().replace(/\s+/g,'_'); }
  function colorObj(label){ return { id:colorId(label), label:label }; }
  function normalizeMaterialKey(value){ return String(value||'').trim().toUpperCase(); }

  function applyWorkbookConfigUpdates(){
    if(typeof AppState==='undefined' || !AppState.config) return false;
    var cfg = AppState.config;
    cfg.stores = STORE_OVERRIDES.map(function(store){ return Object.assign({}, store); });
    cfg.pricingWindow = PRICING_WINDOW.map(function(row){ return Object.assign({}, row); });
    cfg.pricingDoor = PRICING_DOOR.map(function(row){ return Object.assign({}, row); });

    ['window','door'].forEach(function(screenType){
      var list = cfg.materialOptions && Array.isArray(cfg.materialOptions[screenType]) ? cfg.materialOptions[screenType] : [];
      list.forEach(function(material){
        var key = normalizeMaterialKey(material.id || material.label);
        if(MATERIAL_COLORS[key]) material.colors = MATERIAL_COLORS[key].map(colorObj);
      });
    });

    try{
      if(typeof STORE_COORDS!=='undefined'){
        Object.keys(STORE_COORD_OVERRIDES).forEach(function(id){ STORE_COORDS[id] = STORE_COORD_OVERRIDES[id]; });
      }
    }catch(e){}

    var select = byId('storeSelect');
    var selectedId = select && select.value ? select.value : (AppState.store && AppState.store.id);
    if(typeof populateStores==='function') populateStores();
    if(select && selectedId){
      select.value = selectedId;
      var selectedStore = cfg.stores.find(function(store){ return String(store.id)===String(selectedId); });
      if(selectedStore) AppState.store = selectedStore;
    }
    if(typeof populateStaticOptions==='function') populateStaticOptions();
    return true;
  }

  function wrapLoadConfig(){
    if(typeof loadConfig!=='function' || loadConfig.__betaWorkbookWrapped) return;
    var originalLoadConfig = loadConfig;
    loadConfig = async function(){
      var result = await originalLoadConfig.apply(this, arguments);
      applyWorkbookConfigUpdates();
      return result;
    };
    loadConfig.__betaWorkbookWrapped = true;
  }

  function installSwatchLayoutFixes(){
    if(byId('betaSwatchDisplayStyles')) return;
    var style = document.createElement('style');
    style.id = 'betaSwatchDisplayStyles';
    style.textContent = [
      '#frameColor,#materialColor{display:none!important}',
      '#frameColorSwatchPreview,#materialColorSwatchPreview{display:none!important}',
      '.swatch-tile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:.75rem;margin-top:.75rem}',
      '.swatch-tile-grid .swatch-tile{min-width:0}',
      '.lineitems-table th.crossbar-handle-header,.lineitems-table td.crossbar-handle-cell{white-space:nowrap}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function measureShort(value){
    var raw = String(value||'').trim();
    if(!raw) return '';
    var cleaned = raw.replace(/[“”]/g,'"').replace(/\s+/g,' ');
    var match = cleaned.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)/);
    var base = match ? match[1] : cleaned.split(/\s+/)[0].replace(/"/g,'');
    return base ? base.replace(/"/g,'') + '"' : '';
  }

  function compactCrossbarHandle(item){
    var type = String((item && item.screenType) || (item && item.type) || '').toLowerCase();
    if(type==='door'){
      var sideRaw = String(item.handleOrientation || item.handle_orientation || '').toLowerCase();
      var side = (sideRaw.indexOf('left')>=0 || sideRaw==='xo' || sideRaw.indexOf('xo')>=0) ? 'L' : 'R';
      var measurement = measureShort(item.handleHeightDisplay || item.handle_height_display);
      return measurement ? side + ':' + measurement : side;
    }
    var needed = item && (item.crossbarNeeded===true || item.crossbar_needed===true || item.crossbar_needed==='true');
    if(!needed) return 'None';
    var orientationRaw = String(item.crossbarOrientation || item.crossbar_orientation || '').toLowerCase();
    var orientation = orientationRaw.charAt(0)==='v' ? 'V' : 'H';
    var distance = measureShort(item.crossbarDistance || item.crossbar_distance_display);
    return distance ? orientation + ':' + distance : orientation;
  }

  function refreshHeaders(){
    document.querySelectorAll('.lineitems-table thead tr').forEach(function(row){
      Array.from(row.children).forEach(function(th){
        var text = th.textContent.trim().toLowerCase().replace(/\s+/g,' ');
        if(text==='crossbar' || text==='crossbar / handle'){
          th.innerHTML = 'Crossbar /<br>Handle';
          th.classList.add('crossbar-handle-header');
        }
      });
    });
  }

  function patchTable(bodyId, items){
    var tbody = byId(bodyId);
    if(!tbody || !Array.isArray(items)) return;
    Array.from(tbody.querySelectorAll('tr')).forEach(function(row,index){
      var cell = row.children[7];
      if(cell && items[index]){
        cell.textContent = compactCrossbarHandle(items[index]);
        cell.classList.add('crossbar-handle-cell');
      }
    });
  }

  function installCompactQuoteSummaryRendering(){
    if(typeof renderLineItems==='function' && !renderLineItems.__betaCompactWrapped){
      var baseRenderLineItems = renderLineItems;
      renderLineItems = function(){
        var result = baseRenderLineItems.apply(this, arguments);
        patchTable('lineItemsBody', (typeof AppState!=='undefined' && AppState.lineItems) || []);
        refreshHeaders();
        return result;
      };
      renderLineItems.__betaCompactWrapped = true;
    }
    if(typeof renderSuccessLineItems==='function' && !renderSuccessLineItems.__betaCompactWrapped){
      var baseRenderSuccessLineItems = renderSuccessLineItems;
      renderSuccessLineItems = function(){
        var result = baseRenderSuccessLineItems.apply(this, arguments);
        patchTable('successLineItemsBody', (typeof AppState!=='undefined' && AppState.lineItems) || []);
        refreshHeaders();
        return result;
      };
      renderSuccessLineItems.__betaCompactWrapped = true;
    }
    refreshHeaders();
  }

  function init(){
    installSwatchLayoutFixes();
    wrapLoadConfig();
    applyWorkbookConfigUpdates();
    installCompactQuoteSummaryRendering();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  init();
})();
