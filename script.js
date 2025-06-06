// --- DATA STORAGE ---
let definedClasses = []; // { id, name, duration, levels: [], potentialTeachers: [] }
let allTimeSlots = []; // { id, day, startHour, label }
let allLevels = []; // string
let allTeachers = []; // string
let allrooms = [];  // string

let solutions = []; // Array of solution objects, each solution is an array of assignment objects { classId, teacherName, roomId, timeSlotIndex }

const solverControlsSectionEl = document.getElementById('solver-controls-section');
const solveBtn = document.getElementById('solveBtn');

const solutionsDisplayEl = document.getElementById('solutionsDisplay');
const scheduleTableEl = document.getElementById('scheduleTable');
const loadingModalEl = document.getElementById('loadingModal');

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const colorMap = new Map([
  ["creative", "pink"],
  ["primary", "white"],
  ["preparatory", "orchid"],
  ["level 1a", "lightskyblue"],
  ["level 1b", "lightskyblue"],
  ["level 2", "maroon"], // "burgundy"],
  ["level 3", "purple"], // "aubergine"],
  ["level 4", "mediumblue"], // "royal blue"],
  ["level 5", "#888"], // "black"],
  ["level 6", "#666"]
]);

// --- UTILITY FUNCTIONS ---
function generateId() {
  return crypto.randomUUID();
}


class TimeSlot {
  constructor(day, startHour) {
    this.day = day;
    this.startHour = startHour;
    this.label = makeTimeSlotName(day, startHour);
  }
}

/** 
 * Constructs label names like 'Mon 16:45'
 * Day is a three letter string, and startHour is a number.  16.75 = 16:45.
 */
function makeTimeSlotName(day, startHour) {
  const hour = Math.floor(startHour);
  const minute = (startHour - hour) * 60;
  const formattedMinute = minute < 10 ? '0' + minute : minute;
  return `${day} ${hour}:${formattedMinute}`;
}

function makeTimeSlotsForDay(day, fromHour, toHour) {
  const timeSlots = [];
  for (let hour = fromHour; hour <= toHour; hour += 0.25) {
    timeSlots.push(new TimeSlot(day, hour));
  }
  return timeSlots;
}

function makeTimeSlots(days, fromHour, toHour) {
  let combinedSlots = [];
  for (const day of days) {
    const daySlots = makeTimeSlotsForDay(day, fromHour, toHour); // Returns array of {day, startHour, label}
    combinedSlots = combinedSlots.concat(daySlots);
  }
  return combinedSlots;
}

function showAlert(message, type) {
  const messageString = `${type}: ${message}`
  console.log(messageString);
  const div = document.createElement('div');
  div.innerText = messageString;
  document.body.appendChild(div);
  hideElement(loadingModalEl);
}

function showElement(element) {
  element.classList.remove('hidden');
}

function hideElement(element) {
  element.classList.add('hidden');
}

async function loadClassInfo() {
  try {
    const response = await fetch('classInfo.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Assign loaded data, ensuring IDs are generated if not present
    allLevels = getAllLevels(data.definedClasses);
    console.log(`All levels: ${allLevels.join(', ')}`);
    allTeachers = getAllTeachers(data.definedClasses);
    console.log(`All teachers: ${allTeachers.join(',')}`)
    allRooms = data.rooms;
    const timeSlotConfigs = data.timeSlots;
    allTimeSlots = [];
    timeSlotConfigs.forEach(config => {
      allTimeSlots = allTimeSlots.concat(
        makeTimeSlots(config.days, config.startHour, config.endHour));
    });
    for (let i = 0; i < allTimeSlots.length; i++) {
      allTimeSlots[i].index = i;
    }

    definedClasses = data.definedClasses.map(item => ({
      ...item,
      id: item.id || generateId(),
      potentialTeachers: item.potentialTeachers || allTeachers,
      rooms: item.rooms || allRooms,
      levels: item.levels || allLevels,
      duration: item.duration || 1.0,
    }));
    for (let i = 0; i < definedClasses.length; i++) {
      if (definedClasses[i].start) {
        definedClasses[i].minStartTime = definedClasses[i].start;
        definedClasses[i].maxEndTime = definedClasses[i].start + definedClasses[i].duration;
        // console.log(JSON.stringify(definedClasses[i], null, 2));
      }
      for (const level of definedClasses[i].levels) {
        if (colorMap.has(level)) {
          definedClasses[i].color = colorMap.get(level);
        }
      }
    }

    console.log("Loaded Data:", { allLevels, allTeachers, allRooms, definedClasses });

    renderClassesList();
    showAlert("Class information loaded successfully.", "success");

  } catch (error) {
    console.error("Error loading class info:", error);
    showAlert(`Failed to load class information: ${error.message}`, "error");
    // Keep the UI in a state where manual input might be possible or show an error message
  }
  return;
}

function renderClassesList() {
  const classesListEl = document.getElementById('classes-list-section');
  classesListEl.innerHTML = '<h3 class="text-lg font-medium text-gray-700 mb-2">Defined Classes:</h3>';
  if (definedClasses.length === 0) {
    classesListEl.innerHTML += '<p class="text-sm text-gray-500">No classes added yet.</p>';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'divide-y divide-gray-200';

  for (const classInfo of definedClasses) {
    const li = document.createElement('li');
    li.className = 'list-item';
    const classInfoSpan = document.createElement('span');
    const levelNames = classInfo.levels.join(', ');
    const teacherNames = classInfo.potentialTeachers.join(', ');
    classInfoSpan.textContent = `${classInfo.name} (Levels: ${levelNames || 'N/A'}; Teachers: ${teacherNames || 'N/A'})`;
    li.appendChild(classInfoSpan);
    ul.appendChild(li);
  }
  classesListEl.appendChild(ul);
}


// --- SOLVER LOGIC ---
solveBtn.addEventListener('click', () => {
  if (definedClasses.length === 0) {
    showAlert("Please define at least one class to schedule.", "error");
    return;
  }
  if (allTimeSlots.length === 0) {
    showAlert("Please configure studio operating hours to generate time slots.", "error");
    return;
  }

  solutions = [];
  solutionsDisplayEl.innerHTML = '<p class="text-gray-500">Searching for schedules...</p>';
  showElement(loadingModalEl);
  // The assignments map is a mapping between resources (teachers, rooms, and student levels) and
  // the time slots they are occupy.
  // { teacher: { Karena: ["a", "a", null,  null, "c"] }, room: { ... } }
  const initialAssignmentsMap = { teacher: {}, room: {}, level: {} };
  // Initialize map structure for all known entities to avoid checking for key existence later
  // allFoo are arrays of strings. 
  allTeachers.forEach(t => initialAssignmentsMap.teacher[t] = []);
  allRooms.forEach(r => initialAssignmentsMap.room[r] = []);
  allLevels.forEach(l => initialAssignmentsMap.level[l] = []);

  console.log(`Total time slots: ${allTimeSlots.length * allRooms.length / 4} hours`);
  console.log(`Total time to schedule: ${definedClasses.reduce((sum, classObj) => sum + classObj.duration, 0)} hours`);

  // Use a timeout to allow the UI to update before starting the heavy computation
  setTimeout(() => {

    solveRecursive([...definedClasses], initialAssignmentsMap); // Pass a copy of definedClasses

    hideElement(loadingModalEl);
    renderSolutions();
    if (solutions.length === 0) {
      showAlert("No valid schedules found with the current constraints.", "info");
    } else {
      showAlert(`Found ${solutions.length} schedule(s).`, "success");
    }
  }, 100); // Small delay
});


function findTeacherName(assignmentsMap, timeSlotIndex, classId) {
  for (const teacherName in assignmentsMap.teacher) {
    if (assignmentsMap.teacher[teacherName][timeSlotIndex] === classId) {
      return teacherName;
    }
  }
  return null;
}

function findClassInfo(classId) {
  return definedClasses.find(c => c.id === classId);
}

function buildSolution(assignmentsMap) {
  const currentSolution = [];
  let lastClassId = "";
  for (const [roomFound, roomSchedule] of Object.entries(assignmentsMap.room)) {
    for (let slotIndex = 0; slotIndex < roomSchedule.length; slotIndex++) {
      const classId = roomSchedule[slotIndex];
      if (classId === lastClassId) {
        continue;
      }
      lastClassId = classId;
      if (classId) {
        const teacherName = findTeacherName(assignmentsMap, slotIndex, classId);
        const classInfo = findClassInfo(classId);
        if (teacherName && classInfo) {
          currentSolution.push({
            classId: classId,
            className: classInfo.name,
            teacherName,
            roomName: roomFound, // Using roomId as roomName
            timeSlotIndex: slotIndex,
            timeSlotLabel: allTimeSlots[slotIndex].label,
            color: classInfo.color,
            duration: classInfo.duration // Useful for verifying/displaying
          });
        }
      }
    }
  }
  return currentSolution;
}

let lastLogTime = -1;
function logEvery10Seconds(message) {
  const nowTime = Date.now();
  if (nowTime - lastLogTime > 10000) {
    console.log(message);
    lastLogTime = nowTime;
  }
}

let numLogged = 0;
function logFirstN(message) {
  if (numLogged < 100) {
    console.log(message);
    numLogged++;
  }
}


// Returns 0 if this domain is at the beginning of the day.
// Returns 0 if this domain is immediately after something in the same room at the same level
// Returns 1 if this domain is immediately after something else at the same level (in a different room)
// Returns 2 if this domain is immediately after something else in the same room
// Returns 3 otherwise.
function domainQuality(domain, assignmentsMap) {
  if (domain.timeSlotIndex === 0) return 0;
  // Check the slot immediately preceding the start of this domain
  const firstTimeSlotIndex = domain.timeSlotIndex;
  const previousTimeSlotIndex = firstTimeSlotIndex - 1;
  const previousTimeSlot = allTimeSlots[previousTimeSlotIndex];
  const previousDay = previousTimeSlot.day;
  const currentDay = allTimeSlots[firstTimeSlotIndex].day;
  if (previousDay != currentDay) return 0;

  const roomAssignments = assignmentsMap.room[domain.room];
  const isSameRoom = !!roomAssignments[previousTimeSlotIndex];

  const previousClassId = assignmentsMap.room[domain.room] ? assignmentsMap.room[domain.room][previousTimeSlotIndex] : null;
  const previousClassInfo = definedClasses.find(c => c.id === previousClassId);
  const classInfo = definedClasses.find(c => c.id === domain.classId);

  let isSameLevel = false;
  if (previousClassInfo) {
    for (let i = 0; i < previousClassInfo.levels.length; i++) {
      for (let j = 0; j < classInfo.levels.length; j++) {
        if (previousClassInfo.levels[i] === classInfo.levels[j]) {
          hasSameLevel = true;
          break;
        }
      }
    }
  }
  if (isSameRoom && isSameLevel) {
    return 0; // Immediately after something in the same room at the same level
  } else if (isSameLevel) {
    return 1; // Immediately after something else at the same level (in a different room)
  } else if (isSameRoom) {
    return 2; // Immediately after something else in the same room
  }

  return 3; // Otherwise
}

// Sort domains so that options the immediately follow another class in the same room and same level are first.
function improveDomainOrder(smallestDomain, assignmentsMap) {
  smallestDomain.sort((a, b) => {
    const aQuality = domainQuality(a, assignmentsMap);
    const bQuality = domainQuality(b, assignmentsMap);
    return bQuality - aQuality;
  });
}


let smallestRemaining = Infinity;
function solveRecursive(unscheduledClasses, assignmentsMap) {
  if (unscheduledClasses.length < smallestRemaining) {
    smallestRemaining = unscheduledClasses.length;
    // console.log(`Remaining classes to schedule: ${smallestRemaining}`);
  }

  logEvery10Seconds(`Unscheduled: ${unscheduledClasses.length}`);

  if (unscheduledClasses.length === 0) {
    // All classes scheduled, found a solution
    const currentSolution = buildSolution(assignmentsMap);
    solutions.push(currentSolution);
    console.log('Found a solution!');
    return true;
  }

  // MRV Heuristic: Select the class with the fewest valid assignments (smallest domain)
  let bestClassToSchedule = null;
  let smallestDomain = null;
  let minDomainSize = Infinity;

  // Create a new array for iteration to avoid modification issues if unscheduledClasses is directly modified
  const classesToConsider = [...unscheduledClasses];

  for (const classObj of classesToConsider) {
    const currentDomain = getDomain(classObj, assignmentsMap);
    if (currentDomain.length < minDomainSize) {
      minDomainSize = currentDomain.length;
      bestClassToSchedule = classObj;
      smallestDomain = currentDomain;
    }
  }

  if (!bestClassToSchedule || minDomainSize === Infinity) { // Should not happen if classesToConsider is not empty
    console.warn("No best class to schedule or infinite domain size, backtracking.");
    return false;
  }

  if (minDomainSize === 0) { // If the chosen class has no valid assignments, this path is a dead end
    logEvery10Seconds(`Cannot schedule ${bestClassToSchedule.name}`);
    return false;
  }

  logFirstN(`Scheduling ${bestClassToSchedule.name}`);

  const nextUnscheduledClasses = unscheduledClasses.filter(c => c.id !== bestClassToSchedule.id);

  // // Shuffle the domain to explore different possibilities
  // // Fisher-Yates (aka Knuth) Shuffle
  // for (let i = smallestDomain.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1));
  //   [smallestDomain[i], smallestDomain[j]] = [smallestDomain[j], smallestDomain[i]]; // Swap elements
  // }
  // Sort domains so that options the immediately follow another class in the same room and same level are first.
  improveDomainOrder(smallestDomain, assignmentsMap);

  for (const assignment of smallestDomain) { // assignment = { classId, teacherName, roomId, timeSlotIndex }
    // Apply assignment
    const numSlots = Math.round(assignment.duration * 4);

    const classInfo = definedClasses.find(c => c.id === assignment.classId);
    for (let i = 0; i < numSlots; i++) {
      const timeSlotIndex = assignment.timeSlotIndex + i;
      assignmentsMap.teacher[assignment.teacherName][timeSlotIndex] = assignment.classId;
      assignmentsMap.room[assignment.room][timeSlotIndex] = assignment.classId;
      for (const levelId of classInfo.levels) {
        assignmentsMap.level[levelId] = assignmentsMap.level[levelId] || []; // Ensure levelId entry exists
        assignmentsMap.level[levelId][timeSlotIndex] = assignment.classId;
      }
    }

    if (assignment.timeSlotIndex === 0) {
      logFirstN(`Unscheduled: ${nextUnscheduledClasses.length} Assignment:
${JSON.stringify(assignment, null, 2)}`);
    }

    if (checkBroadConstraints(assignmentsMap)) {
      if (solveRecursive(nextUnscheduledClasses, assignmentsMap)) {
        return true; // Propagate stop signal
      }
    }

    logFirstN(`Backtracking: ${assignment.className} can't be at ${assignment.timeSlotLabel}`);
    for (let i = 0; i < numSlots; ++i) {
      // Backtrack: Remove assignment
      const timeSlotIndex = assignment.timeSlotIndex + i;
      assignmentsMap.teacher[assignment.teacherName][timeSlotIndex] = null;
      assignmentsMap.room[assignment.room][timeSlotIndex] = null;
      for (const levelId of classInfo.levels) {
        assignmentsMap.level[levelId][timeSlotIndex] = null;
      }
    }
  }
  return false; // Exhausted this branch without reaching a solution
}

function renderSolutions() {
  solutionsDisplayEl.innerHTML = '';
  if (solutions.length === 0) {
    return;
  }
  for (const solution of solutions) {
    renderSolution(solution);
    break;
  };
}

// --- INITIALIZATION ---
async function init() {
  await loadClassInfo(); // Load data on startup
}

init();