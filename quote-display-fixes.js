// quote-display-fixes.js
// Beta display-only corrections for quote line-item summaries.
(function(){
  function byId(id){return document.getElementById(id);}

  function measureShort(value){
    var raw=String(value||'').trim();
    if(!raw)return '';
    var cleaned=raw.replace(/[“”]/g,'"').replace(/\s+/g,' ');
    var match=cleaned.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)/);
    var base=match?match[1]:cleaned.split(/\s+/)[0].replace(/"/g,'');
    return base?base.replace(/"/g,'')+'"':'';
  }

  function compactCrossbarHandle(item){
    var type=String((item&&item.screenType)||(item&&item.type)||'').toLowerCase();
    if(type==='door'){
      var sideRaw=String(item.handleOrientation||item.handle_orientation||'').toLowerCase();
      var side=(sideRaw.indexOf('left')>=0||sideRaw==='xo'||sideRaw.indexOf('xo')>=0)?'L':'R';
      var measurement=measureShort(item.handleHeightDisplay||item.handle_height_display);
      return measurement?side+':'+measurement:side;
    }

    var needed=item&&(
      item.crossbarNeeded===true||
      item.crossbar_needed===true||
      item.crossbar_needed==='true'
    );
    if(!needed)return 'None';
    var orientationRaw=String(item.crossbarOrientation||item.crossbar_orientation||'').toLowerCase();
    var orientation=orientationRaw.charAt(0)==='v'?'V':'H';
    var distance=measureShort(item.crossbarDistance||item.crossbar_distance_display);
    return distance?orientation+':'+distance:orientation;
  }

  function refreshHeaders(){
    document.querySelectorAll('.lineitems-table thead tr').forEach(function(row){
      Array.from(row.children).forEach(function(th){
        if(th.textContent.trim().toLowerCase()==='crossbar'){
          th.innerHTML='Crossbar /<br>Handle';
          th.classList.add('crossbar-handle-header');
        }
      });
    });
  }

  function patchTable(bodyId,items){
    var tbody=byId(bodyId);
    if(!tbody||!Array.isArray(items))return;
    Array.from(tbody.querySelectorAll('tr')).forEach(function(row,index){
      var cell=row.children[7];
      if(cell&&items[index]){
        cell.textContent=compactCrossbarHandle(items[index]);
        cell.classList.add('crossbar-handle-cell');
      }
    });
  }

  function install(){
    refreshHeaders();

    if(typeof window.renderLineItems==='function'){
      var baseRenderLineItems=window.renderLineItems;
      window.renderLineItems=function(){
        var result=baseRenderLineItems();
        patchTable('lineItemsBody',window.AppState&&window.AppState.lineItems);
        refreshHeaders();
        return result;
      };
    }

    if(typeof window.renderSuccessLineItems==='function'){
      var baseRenderSuccessLineItems=window.renderSuccessLineItems;
      window.renderSuccessLineItems=function(){
        var result=baseRenderSuccessLineItems();
        patchTable('successLineItemsBody',window.AppState&&window.AppState.lineItems);
        refreshHeaders();
        return result;
      };
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
