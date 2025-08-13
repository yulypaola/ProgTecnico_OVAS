
var API = null;
function findAPI(win) {
  var maxTries = 500;
  while ((win.API == null) && (win.parent != null) && (win.parent != win) && maxTries > 0) {
    maxTries--;
    win = win.parent;
  }
  return win.API;
}
function getAPI() {
  if (API == null) {
    API = findAPI(window);
    if ((API == null) && (window.opener != null) && (typeof(window.opener) != "undefined")) {
      API = findAPI(window.opener);
    }
  }
  return API;
}
var scormConnected=false;
function scormInit(){
  var api=getAPI();
  if(api){
    var ok=api.LMSInitialize("");
    scormConnected=(ok=="true");
    if(scormConnected){
      api.LMSSetValue("cmi.core.lesson_status","incomplete");
      api.LMSCommit("");
    }
  }
}
function scormSetScore(score){
  var api=getAPI();
  if(api&&scormConnected){
    api.LMSSetValue("cmi.core.score.raw", String(score));
    api.LMSCommit("");
  }
}
function scormComplete(passed){
  var api=getAPI();
  if(api&&scormConnected){
    api.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "completed");
    api.LMSCommit("");
  }
}
function scormFinish(){
  var api=getAPI();
  if(api&&scormConnected){
    api.LMSCommit("");
    api.LMSFinish("");
    scormConnected=false;
  }
}
window.addEventListener("load", scormInit);
window.addEventListener("beforeunload", scormFinish);
