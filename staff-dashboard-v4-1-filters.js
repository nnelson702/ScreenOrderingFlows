// Legacy loader retained so existing staff.html deployments continue to work.
// This loads the last validated dashboard enhancement bundle while the durable file is rebuilt.
(function(){
  var script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/gh/nnelson702/ScreenOrderingFlows@4681910a24841f202546b09bf7503b19addd81ee/staff-dashboard-v4-1-filters.js?v=20260521b';
  script.defer=false;
  document.currentScript.parentNode.insertBefore(script,document.currentScript.nextSibling);
})();
