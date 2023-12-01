// Author: Patrick Lundquist
// Date:   2023-12-01
// 
// Example for localStorage and flushing localStorage to a file on disk.
//
// Writing to disk is triggered by reaching a threshold in localStorage, 
// or by user clicking the "dump" button.
// Items written to localStorage and dump file are json. 
//
// 1. Events triggered by the user are written to localStorage.
// 2. Periodically timestamp values are accumulated.
//   a. After reaching a threshold, timestamp values are written to 
//      localStorage and cleared.
//   b. After reaching a threshold, localStorage entries are written to a 
//      file on disk and cleared.

// TODO: add option to use sessionStorage instead.
// TODO: probe localStorage to get the configured size. 
// TODO: add field to name session and add it to keys and dump file name.
// TODO: add button to start new session (clear all localStorage keys).
// TODO: add checkbox to enable autodump, and notification to click allow
//       on any browser prompt warning for multiple downloads.

const maxTsVals = 30;
const maxEventItems= 30;
const maxLocalStorageItems = 30;
const localStorageEventCountKey = "eventCount";
const localStorageTsValCountKey = "tsValCount";

let autoDumpEnabled = true;
let tsVals = [];
let dumpCount = 0;

// ===========================================================================
// Setup 
// ===========================================================================

// Handle event.
let userInput = document.querySelector("#event");
let eventButton = document.getElementById("eventButton");
eventButton.addEventListener("click", function(e){
  e.preventDefault();
  logEvent(userInput.value)
  updatePage()
});

// Handle dump button.
let dumpButton = document.getElementById("dumpButton");
dumpButton.addEventListener("click", function(e){
  e.preventDefault();
  console.log("User triggered dump")
  dumpLocalStorageToDisk((new Date()).getTime())
  updatePage()
});

setInterval(myHandler, 500 /* period in ms */); // once every half second. 

// ===========================================================================
// Functions
// ===========================================================================

function updatePage() {
  document.querySelector("#events").textContent = getLocalStorageEventCount();
  document.querySelector("#vals").textContent = tsVals.length
  document.querySelector("#valsStored").textContent = getLocalStorageTsValCount();
  document.querySelector("#dumps").textContent = dumpCount;
}

// download creates a temporary anchor link to facilitate dumping to disk.
const download = (path, filename) => {
    // Create a new link
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.download = filename;

    // Append to the DOM
    document.body.appendChild(anchor);

    // Trigger `click` event
    anchor.click();

    // Remove element from DOM
    document.body.removeChild(anchor);
};

function getTsValLocalStorageKey(num) {
    return "ts-" + String(num)
}

function getEventLocalStorageKey(num) {
    return "event-" + String(num)
}

function getLocalStorageEventCount() {
  count = parseInt(localStorage.getItem(localStorageEventCountKey))
  if (isNaN(count)) {
    return 0;
  }
  return count;
}

function getLocalStorageTsValCount() {
  count = parseInt(localStorage.getItem(localStorageTsValCountKey))
  if (isNaN(count)) {
    return 0;
  }
  return count;
}

function incrementLocalStorageEventCount() {
  count = getLocalStorageEventCount();
  count += 1;
  setLocalStorageEventCount(count)
}

function incrementLocalStorageTsValCount() {
  count = getLocalStorageTsValCount();
  count += 1;
  setLocalStorageTsValCount(count)
}

function setLocalStorageEventCount(val) {
  return localStorage.setItem(localStorageEventCountKey, val)
}

function setLocalStorageTsValCount(val) {
  return localStorage.setItem(localStorageTsValCountKey, val)
}

// Set item in localStorage and 
function AddItemToLocalStorage(key, val) {
  // TODO: check if localStorage is full and we need to roll out old value(s).
  localStorage.setItem(key, val)
}

// Log event. 
function logEvent(val) {
  console.log("Logging event to local storage...")
  var item = {
    ts : (new Date()).getTime(),
    value : val
  }
  key = getLocalStorageEventCount()
  AddItemToLocalStorage(
    getEventLocalStorageKey(key), JSON.stringify(item));
  incrementLocalStorageEventCount();
  if (getLocalStorageEventCount() >= maxEventItems) {
    // TODO: if events are full, dump localStorage to file and clear it.
    console.log("Events exceed max threshold")
  }
}

function myHandler() {
  try {
    tsVal = (new Date()).getTime()
    var entry = {
      ts : tsVal,
      value : Math.random() // Mock value. TODO: replace with real value.
    }
    tsVals.push(entry);

    if (tsVals.length < maxTsVals) {
      return;
    }
    // tsVals is full, so flush to localStorage.
    flushTsValsToLocalStorage()

    if (getLocalStorageTsValCount() + getLocalStorageEventCount() < maxLocalStorageItems) {
      return; 
    }

    // localStorage is at max capacity, so dump it all to disk, if automatic dump is enabled.
    if (autoDumpEnabled) {
      dumpLocalStorageToDisk(tsVal)
    }
  }
  catch(err) {
    console.log(err)
  }
  finally {
   updatePage() 
  }
}

function flushTsValsToLocalStorage() {
  console.log("Flushing ts val entries to local storage...")
  var item = {
    value : tsVals
  }
  key = getLocalStorageTsValCount()
  AddItemToLocalStorage(getTsValLocalStorageKey(key), JSON.stringify(item))
  incrementLocalStorageTsValCount();
  tsVals = [];
}

function dumpLocalStorageToDisk(tsVal) {
  console.log("Dumping to disk...")
  // Read all localStorage entries and create a json blob.
  var jsonData = {
    events : [],
    tsVals : [],
  }
  // Add ts vals from localStorage.
  for (let i = 0; i < getLocalStorageTsValCount(); i++) {
    let item = localStorage.getItem(getTsValLocalStorageKey(i))
    jsonData.tsVals.push(item)
  }

  // Add events from localStorage.
  for (let i = 0; i < getLocalStorageEventCount(); i++) {
    let item = localStorage.getItem(getEventLocalStorageKey(i))
    jsonData.events.push(item)
  }

  // Convert JSON to string.
  const data = JSON.stringify(jsonData);

  // Create a Blob object.
  const blob = new Blob([data], { type: 'application/json' });

  // Create an object URL.
  const url = URL.createObjectURL(blob);

  // Download it. File format: 
  // dump_<dumpCount>_events_<numEvents>_tsVals_<numTsVals>_<ts>.json
  dumpFileName = "dump_" + dumpCount +
    "_events_" + getLocalStorageEventCount() + 
    "_tsVals_" + getLocalStorageTsValCount() +
    "_ts_" + tsVal + ".json"
  download(url, dumpFileName);

  dumpCount += 1;

  // Release oject URL.
  URL.revokeObjectURL(url);

  // Clear localStorage for ts vals.
  for (let i = 0; i < getLocalStorageTsValCount(); i++) {
    localStorage.removeItem(getTsValLocalStorageKey(i))
  }
  setLocalStorageTsValCount(0);

  // Clear localStorage for events.
  for (let i = 0; i < getLocalStorageEventCount(); i++) {
    localStorage.removeItem(getEventLocalStorageKey(i))
  }
  setLocalStorageEventCount(0);
}
