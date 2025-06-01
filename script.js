// --- DATA STORAGE ---
let definedClasses = []; // { id, name, duration, levels: [], potentialTeachers: [] }
let allTimeSlots = []; // { id, day, startHour, label }
let allLevels = []; // string
let allTeachers = []; // string

let solutions = []; // Array of solution objects, each solution is an array of assignment objects { classId, teacherName, roomId, timeSlotIndex }
const MAX_SOLUTIONS_DEFAULT = 10;

const solverControlsSectionEl = document.getElementById('solver-controls-section');
const solveBtn = document.getElementById('solveBtn');
const maxSolutionsEl = document.getElementById('maxSolutions');

const solutionsDisplayEl = document.getElementById('solutionsDisplay');
const scheduleTableEl = document.getElementById('scheduleTable');
const loadingModalEl = document.getElementById('loadingModal');

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- UTILITY FUNCTIONS ---
function generateId() {
  return crypto.randomUUID();
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
    timeSlots.push({
      day: day,
      startHour: hour,
      label: makeTimeSlotName(day, hour)
    });
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
    allTeachers = getAllTeachers(data.definedClasses);
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

let shownDomains = new Set();

function getDomain(classToSchedule, currentAssignmentsMap) {
  const domain = []; // Stores { classId, teacherName, roomId, timeSlotIndex }
  const classInfo = definedClasses.find(c => c.id === classToSchedule.id);

  for (const teacher of classInfo.potentialTeachers) {
    for (const room of allRooms) { // room is a string
      const numSlots = Math.round(classInfo.duration * 4);
      for (let i = 0; i < allTimeSlots.length - numSlots + 1; i++) {
        // timeSlot is {id, day, startHour, label}
        const firstTimeSlot = allTimeSlots[i];
        let conflict = false;
        for (let j = 0; j < numSlots; j++) {
          const timeSlot = allTimeSlots[i + j];
          // Make sure this timeSlot is the same day as firstTimeSlot.
          if (firstTimeSlot.label.slice(0, 3) !== timeSlot.label.slice(0, 3)) {
            break;
          }
          // 1. Teacher conflict
          if (currentAssignmentsMap.teacher[teacher] && currentAssignmentsMap.teacher[teacher][timeSlot.index]) {
            conflict = true;
            break;
          }
          // 2. Room conflict
          if (!conflict && currentAssignmentsMap.room[room] && currentAssignmentsMap.room[room][timeSlot.index]) {
            conflict = true;
            break;
          }
          // 3. Level conflict
          if (!conflict) {
            for (const levelId of classInfo.levels) {
              if (currentAssignmentsMap.level[levelId] && currentAssignmentsMap.level[levelId][timeSlot.index]) {
                conflict = true;
                break;
              }
            }
          }
        }
        if (!conflict) {
          domain.push({
            classId: classToSchedule.id, teacherName: teacher, room,
            timeSlotIndex: firstTimeSlot.index, duration: classInfo.duration
          });
        }
      }
    }
  }
  if (!shownDomains.has(classToSchedule.id)) {
    shownDomains.add(classToSchedule.id);
    console.log(`Class: ${classInfo.name} ${domain.length}`);
  }

  return domain;
}

function buildSolution() {
  const currentSolution = [];
  // Iterate through all classes that were *supposed* to be scheduled.
  // The global `definedClasses` holds the original list of all classes.
  for (const classDef of definedClasses) {
    const classId = classDef.id;
    let teacherNameFound = null;
    let startTimeSlotIndexFound = -1;
    let roomIdFound = null;

    // Find this class's assignment in the assignmentsMap.
    // We need its teacher, room, and *start* timeSlotIndex.
    teacherSearchLoop:
    for (const teacherName in assignmentsMap.teacher) {
      for (const slotKey in assignmentsMap.teacher[teacherName]) {
        if (assignmentsMap.teacher[teacherName][slotKey] === classId) {
          const currentSlotIndex = parseInt(slotKey);
          // Check if this is the start slot for this class taught by this teacher
          const isStartSlot = (currentSlotIndex === 0) ||
            !assignmentsMap.teacher[teacherName][currentSlotIndex - 1] ||
            (assignmentsMap.teacher[teacherName][currentSlotIndex - 1] !== classId);

          if (isStartSlot) {
            teacherNameFound = teacherName;
            startTimeSlotIndexFound = currentSlotIndex;
            // Find the room for this classId at its start timeSlotIndex
            for (const roomName in assignmentsMap.room) {
              if (assignmentsMap.room[roomName][startTimeSlotIndexFound] === classId) {
                roomIdFound = roomName;
                break; // Found room
              }
            }
            break teacherSearchLoop; // Found all details for this class
          }
        }
      }
    }

    if (teacherNameFound && startTimeSlotIndexFound !== -1) {
      currentSolution.push({
        classId: classId,
        className: classDef.name,
        teacherName: teacherNameFound,
        roomId: roomIdFound, // This will be the room name/ID string
        roomName: roomIdFound, // Using roomId as roomName
        timeSlotIndex: startTimeSlotIndexFound,
        timeSlotLabel: allTimeSlots[startTimeSlotIndexFound].label,
        duration: classDef.duration // Useful for verifying/displaying
      });
    } else {
      // This indicates a discrepancy if unscheduledClasses.length was 0.
      // It means a class from the original set was not found in the assignmentsMap.
      console.warn(`Solution Inconsistency: Class ${classDef.name} (ID: ${classId}) was expected but not found in the final assignmentsMap for a complete solution.`);
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

function solveRecursive(unscheduledClasses, assignmentsMap) {
  const MAX_SOLUTIONS = parseInt(maxSolutionsEl.value) || MAX_SOLUTIONS_DEFAULT;
  if (solutions.length >= MAX_SOLUTIONS) {
    return true; // Stop if max solutions found
  }

  // logEvery10Seconds(`Unscheduled: ${unscheduledClasses.length}`);

  if (unscheduledClasses.length === 0) {
    // All classes scheduled, found a solution
    const currentSolution = buildSolution();
    solutions.push(currentSolution);
    console.log('Found a solution!');
    return solutions.length >= MAX_SOLUTIONS; // Stop if max solutions found
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

  const nextUnscheduledClasses = unscheduledClasses.filter(c => c.id !== bestClassToSchedule.id);

  for (const assignment of smallestDomain) { // assignment = { classId, teacherName, roomId, timeSlotIndex }
    // Apply assignment
    const numSlots = Math.round(assignment.duration * 4);

    const classInfo = definedClasses.find(c => c.id === assignment.classId);
    for (let i = 0; i < numSlots; i++) {
      const timeSlotIndex = assignment.timeSlotIndex + i;
      assignmentsMap.teacher[assignment.teacherName][timeSlotIndex] = assignment.classId;
      assignmentsMap.room[assignment.room][timeSlotIndex] = assignment.classId;
      for (const levelId of classInfo.levels) {
        assignmentsMap.level[levelId] = assignmentsMap.level[levelId] || {}; // Ensure levelId entry exists
        assignmentsMap.level[levelId][timeSlotIndex] = assignment.classId;
      }
    }

    if (solveRecursive(nextUnscheduledClasses, assignmentsMap)) {
      return true; // Propagate stop signal
    }

    for (let i = 0; i < numSlots; ++i) {
      // Backtrack: Remove assignment
      const timeSlotIndex = assignment.timeSlotIndex + i;
      assignmentsMap.teacher[assignment.teacherName][timeSlotIndex] = null;
      assignmentsMap.room[assignment.room][timeSlotIndex] = null;
      for (const levelId of classInfo.levels) {
        if (assignmentsMap.level[levelId]) { // Check if levelId entry exists before deleting
          assignmentsMap.level[levelId][timeSlotIndex] = null;
        }
      }
    }
  }
  // logEvery10Seconds(`Backtracking`);
  return false; // Exhausted this branch without reaching max solutions
}

function renderSolutions() {
  solutionsDisplayEl.innerHTML = '';
  if (solutions.length === 0) {
    solutionsDisplayEl.innerHTML = '<p class="text-gray-500">No valid schedules found with the current constraints and classes.</p>';
    return;
  }

  solutions.forEach((solution, index) => {
    const solutionCard = document.createElement('div');
    solutionCard.className = 'card';

    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold text-indigo-600 mb-3';
    title.textContent = `Schedule Option ${index + 1}`;
    solutionCard.appendChild(title);

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200 text-sm';
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    thead.innerHTML = `
                    <tr>
                        <th class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Room</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    solution.forEach(item => {
      const row = tbody.insertRow();
      row.innerHTML = `
                        <td class="px-3 py-2 whitespace-nowrap">${item.className}</td>
                        <td class="px-3 py-2 whitespace-nowrap">${item.teacherName}</td>
                        <td class="px-3 py-2 whitespace-nowrap">${item.roomName}</td>
                        <td class="px-3 py-2 whitespace-nowrap">${item.timeSlotLabel}</td>
                    `;
    });
    table.appendChild(tbody);
    solutionCard.appendChild(table);
    solutionsDisplayEl.appendChild(solutionCard);
  });

  // Add a button to view the first solution in the table format
  const viewTableBtn = document.createElement('button');
  viewTableBtn.textContent = 'View First Schedule as Table';
  viewTableBtn.className = 'btn btn-primary mt-4';
  viewTableBtn.onclick = () => renderScheduleTable(solutions[0]);
  solutionsDisplayEl.appendChild(viewTableBtn);
}

// --- INITIALIZATION ---
async function init() {
  await loadClassInfo(); // Load data on startup
}

init();