// Legacy loader retained so existing staff.html deployments continue to work.
// Durable staff dashboard behavior now lives in staff-dashboard.js.
(function(){
  var script=document.createElement('script');
  script.src='staff-dashboard.js?v=20260521';
  script.defer=false;
  document.currentScript.parentNode.insertBefore(script,document.currentScript.nextSibling);
})();
