// --- DATA STORAGE ---
let levels = []; // { id, name }
let teachers = []; // { id, name }
let rooms = []; // { id, name }
let definedClasses = []; // { id, name, duration, eligibleLevelIds: [], potentialTeacherIds: [] }
let timeSlots = []; // { id, day, startHour, label }

let solutions = [];
const MAX_SOLUTIONS_DEFAULT = 10;

// --- DOM ELEMENTS ---
const numLevelsEl = document.getElementById('numLevels');
const numTeachersEl = document.getElementById('numTeachers');
const numRoomsEl = document.getElementById('numRooms');
const confirmSetupCountsBtn = document.getElementById('confirmSetupCounts');
const namesSetupEl = document.getElementById('names-setup');
const levelsNamesSetupEl = document.getElementById('levels-names-setup');
const teachersNamesSetupEl = document.getElementById('teachers-names-setup');
const roomsNamesSetupEl = document.getElementById('rooms-names-setup');
const saveNamesBtn = document.getElementById('saveNames');

const classesSectionEl = document.getElementById('classes-section');
const classNameEl = document.getElementById('className');
const classDurationEl = document.getElementById('classDuration');
const classLevelsEl = document.getElementById('classLevels');
const classTeachersEl = document.getElementById('classTeachers');
const addClassBtn = document.getElementById('addClassBtn');
const classesListEl = document.getElementById('classesList');

const scheduleConfigSectionEl = document.getElementById('schedule-config-section');
const operatingDaysEl = document.getElementById('operatingDays');
const startTimeEl = document.getElementById('startTime');
const endTimeEl = document.getElementById('endTime');
const saveScheduleConfigBtn = document.getElementById('saveScheduleConfig');

const solverControlsSectionEl = document.getElementById('solver-controls-section');
const solveBtn = document.getElementById('solveBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const maxSolutionsEl = document.getElementById('maxSolutions');

const solutionsDisplayEl = document.getElementById('solutionsDisplay');
const loadingModalEl = document.getElementById('loadingModal');

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- UTILITY FUNCTIONS ---
function generateId() {
  return crypto.randomUUID();
}

function showElement(el) { el.classList.remove('hidden'); }
function hideElement(el) { el.classList.add('hidden'); }

function showAlert(message, type = 'info') {
  // Simple alert for now, can be replaced with a styled modal
  console.log(`ALERT (${type}): ${message}`);
  const tempAlert = document.createElement('div');
  tempAlert.className = `fixed top-5 right-5 p-4 rounded-md shadow-lg text-white ${type === 'error' ? 'bg-red-500' : (type === 'success' ? 'bg-green-500' : 'bg-blue-500')}`;
  tempAlert.textContent = message;
  document.body.appendChild(tempAlert);
  setTimeout(() => tempAlert.remove(), 3000);
}

// --- SETUP FUNCTIONS ---
function populateTimeDropdowns() {
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    const optionStart = new Option(`${hour}:00`, i);
    const optionEnd = new Option(`${hour}:00`, i);
    startTimeEl.add(optionStart);
    endTimeEl.add(optionEnd);
  }
  startTimeEl.value = "16"; // Default 4 PM
  endTimeEl.value = "21";   // Default 9 PM
}

function populateDayCheckboxes() {
  operatingDaysEl.innerHTML = '';
  DAYS_OF_WEEK.forEach((day, index) => {
    const div = document.createElement('div');
    div.className = 'flex items-center';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `day-${day}`;
    input.value = day;
    input.className = 'h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500';
    if (index < 5) input.checked = true; // Default Mon-Fri
    const label = document.createElement('label');
    label.htmlFor = `day-${day}`;
    label.className = 'ml-2 block text-sm text-gray-900';
    label.textContent = day;
    div.appendChild(input);
    div.appendChild(label);
    operatingDaysEl.appendChild(div);
  });
}

confirmSetupCountsBtn.addEventListener('click', () => {
  const numL = parseInt(numLevelsEl.value);
  const numT = parseInt(numTeachersEl.value);
  const numR = parseInt(numRoomsEl.value);

  if (isNaN(numL) || isNaN(numT) || isNaN(numR) || numL <= 0 || numT <= 0 || numR <= 0) {
    showAlert("Please enter valid positive numbers for counts.", "error");
    return;
  }
  createNameInputs('levels', numL, levelsNamesSetupEl, "Level");
  createNameInputs('teachers', numT, teachersNamesSetupEl, "Teacher");
  createNameInputs('rooms', numR, roomsNamesSetupEl, "Room");
  showElement(namesSetupEl);
});

function createNameInputs(type, count, container, placeholderPrefix) {
  container.innerHTML = `<h3 class="text-lg font-medium text-gray-700 mb-2">Define ${type.charAt(0).toUpperCase() + type.slice(1)} Names:</h3>`;
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field mb-2';
    input.placeholder = `${placeholderPrefix} ${i + 1} Name`;
    input.dataset.type = type;
    input.dataset.index = i;
    container.appendChild(input);
  }
}

saveNamesBtn.addEventListener('click', () => {
  levels = []; teachers = []; rooms = []; // Reset
  let allNamesFilled = true;

  document.querySelectorAll('#levels-names-setup input').forEach(input => {
    if (!input.value.trim()) allNamesFilled = false;
    levels.push({ id: generateId(), name: input.value.trim() || `Level ${parseInt(input.dataset.index) + 1}` });
  });
  document.querySelectorAll('#teachers-names-setup input').forEach(input => {
    if (!input.value.trim()) allNamesFilled = false;
    teachers.push({ id: generateId(), name: input.value.trim() || `Teacher ${parseInt(input.dataset.index) + 1}` });
  });
  document.querySelectorAll('#rooms-names-setup input').forEach(input => {
    if (!input.value.trim()) allNamesFilled = false;
    rooms.push({ id: generateId(), name: input.value.trim() || `Room ${parseInt(input.dataset.index) + 1}` });
  });

  if (!allNamesFilled) {
    showAlert("Some names are empty. Default names will be used if left blank.", "info");
  }

  populateClassDefinitionDropdowns();
  showElement(classesSectionEl);
  showElement(scheduleConfigSectionEl);
  showAlert("Names saved. Proceed to define classes and operating hours.", "success");
});

function populateClassDefinitionDropdowns() {
  classLevelsEl.innerHTML = '';
  levels.forEach(level => {
    const option = new Option(level.name, level.id);
    classLevelsEl.add(option);
  });

  classTeachersEl.innerHTML = '';
  teachers.forEach(teacher => {
    const option = new Option(teacher.name, teacher.id);
    classTeachersEl.add(option);
  });
}

// --- CLASS DEFINITION FUNCTIONS ---
addClassBtn.addEventListener('click', () => {
  const name = classNameEl.value.trim();
  const duration = parseInt(classDurationEl.value); // Fixed at 1 for now
  const eligibleLevelIds = Array.from(classLevelsEl.selectedOptions).map(opt => opt.value);
  const potentialTeacherIds = Array.from(classTeachersEl.selectedOptions).map(opt => opt.value);

  if (!name) {
    showAlert("Class name cannot be empty.", "error");
    return;
  }
  if (eligibleLevelIds.length === 0) {
    showAlert("Please select at least one eligible level.", "error");
    return;
  }
  if (potentialTeacherIds.length === 0) {
    showAlert("Please select at least one potential teacher.", "error");
    return;
  }

  definedClasses.push({ id: generateId(), name, duration, eligibleLevelIds, potentialTeacherIds });
  renderClassesList();
  classNameEl.value = '';
  classLevelsEl.selectedIndex = -1;
  classTeachersEl.selectedIndex = -1;
  showAlert("Class added successfully.", "success");
});

function renderClassesList() {
  classesListEl.innerHTML = '<h3 class="text-lg font-medium text-gray-700 mb-2">Defined Classes:</h3>';
  if (definedClasses.length === 0) {
    classesListEl.innerHTML += '<p class="text-sm text-gray-500">No classes added yet.</p>';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'divide-y divide-gray-200';
  definedClasses.forEach(cls => {
    const li = document.createElement('li');
    li.className = 'list-item';

    const classInfo = document.createElement('span');
    const levelNames = cls.eligibleLevelIds.map(id => levels.find(l => l.id === id)?.name).join(', ');
    const teacherNames = cls.potentialTeacherIds.map(id => teachers.find(t => t.id === id)?.name).join(', ');
    classInfo.textContent = `${cls.name} (Levels: ${levelNames || 'N/A'}; Teachers: ${teacherNames || 'N/A'})`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'btn btn-secondary btn-sm py-1 px-2';
    removeBtn.onclick = () => {
      definedClasses = definedClasses.filter(c => c.id !== cls.id);
      renderClassesList();
    };
    li.appendChild(classInfo);
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
  classesListEl.appendChild(ul);
}

// --- SCHEDULE CONFIG FUNCTIONS ---
saveScheduleConfigBtn.addEventListener('click', () => {
  const selectedDays = Array.from(operatingDaysEl.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  const startH = parseInt(startTimeEl.value);
  const endH = parseInt(endTimeEl.value);

  if (selectedDays.length === 0) {
    showAlert("Please select at least one operating day.", "error");
    return;
  }
  if (startH >= endH) {
    showAlert("Start time must be before end time.", "error");
    return;
  }

  timeSlots = [];
  selectedDays.forEach(day => {
    for (let hour = startH; hour < endH; hour++) { // Assuming 1-hour slots
      timeSlots.push({
        id: `${day}${hour}`,
        day: day,
        startHour: hour,
        label: `${day} ${hour}:00-${hour + 1}:00`
      });
    }
  });

  if (timeSlots.length === 0) {
    showAlert("No time slots generated. Check operating hours.", "error");
    return;
  }

  showElement(solverControlsSectionEl);
  showAlert("Operating hours saved. You can now find schedules.", "success");
  console.log("Generated Time Slots:", timeSlots);
});


// --- SOLVER LOGIC ---
solveBtn.addEventListener('click', () => {
  if (levels.length === 0 || teachers.length === 0 || rooms.length === 0) {
    showAlert("Please complete studio setup (levels, teachers, rooms) first.", "error");
    return;
  }
  if (definedClasses.length === 0) {
    showAlert("Please define at least one class to schedule.", "error");
    return;
  }
  if (timeSlots.length === 0) {
    showAlert("Please configure studio operating hours to generate time slots.", "error");
    return;
  }

  solutions = [];
  solutionsDisplayEl.innerHTML = '<p class="text-gray-500">Searching for schedules...</p>';
  showElement(loadingModalEl);

  // Use a timeout to allow the UI to update before starting the heavy computation
  setTimeout(() => {
    const initialAssignmentsMap = { teacher: {}, room: {}, level: {} };
    // Initialize map structure for all known entities to avoid checking for key existence later
    teachers.forEach(t => initialAssignmentsMap.teacher[t.id] = {});
    rooms.forEach(r => initialAssignmentsMap.room[r.id] = {});
    levels.forEach(l => initialAssignmentsMap.level[l.id] = {});

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

function getDomain(classToSchedule, currentAssignmentsMap) {
  const domain = []; // Stores { classId, teacherId, roomId, timeSlotId }
  const classInfo = definedClasses.find(c => c.id === classToSchedule.id);

  for (const teacherId of classInfo.potentialTeacherIds) {
    for (const room of rooms) { // room is {id, name}
      for (const timeSlot of timeSlots) { // timeSlot is {id, day, startHour, label}
        let conflict = false;

        // 1. Teacher conflict
        if (currentAssignmentsMap.teacher[teacherId] && currentAssignmentsMap.teacher[teacherId][timeSlot.id]) {
          conflict = true;
        }
        // 2. Room conflict
        if (!conflict && currentAssignmentsMap.room[room.id] && currentAssignmentsMap.room[room.id][timeSlot.id]) {
          conflict = true;
        }
        // 3. Level conflict
        if (!conflict) {
          for (const levelId of classInfo.eligibleLevelIds) {
            if (currentAssignmentsMap.level[levelId] && currentAssignmentsMap.level[levelId][timeSlot.id]) {
              conflict = true;
              break;
            }
          }
        }

        if (!conflict) {
          domain.push({ classId: classToSchedule.id, teacherId, roomId: room.id, timeSlotId: timeSlot.id });
        }
      }
    }
  }
  return domain;
}

function solveRecursive(unscheduledClasses, assignmentsMap) {
  const MAX_SOLUTIONS = parseInt(maxSolutionsEl.value) || MAX_SOLUTIONS_DEFAULT;
  if (solutions.length >= MAX_SOLUTIONS) {
    return true; // Stop if max solutions found
  }

  if (unscheduledClasses.length === 0) {
    // All classes scheduled, found a solution
    const currentSolution = [];
    // Reconstruct solution from assignmentsMap
    // Iterate through assigned class slots to build the solution entry
    const scheduledClassIds = new Set();

    // Iterate teachers to find their assignments
    for (const teacherId in assignmentsMap.teacher) {
      for (const timeSlotId in assignmentsMap.teacher[teacherId]) {
        const classId = assignmentsMap.teacher[teacherId][timeSlotId];
        if (classId && !scheduledClassIds.has(`${classId}-${timeSlotId}`)) { // Ensure each class assignment is added once
          const classInfo = definedClasses.find(c => c.id === classId);
          const roomEntry = Object.entries(assignmentsMap.room).find(([rId, slots]) => slots[timeSlotId] === classId);
          const roomId = roomEntry ? roomEntry[0] : null;

          currentSolution.push({
            classId: classId,
            className: classInfo.name,
            teacherId: teacherId,
            teacherName: teachers.find(t => t.id === teacherId).name,
            roomId: roomId,
            roomName: rooms.find(r => r.id === roomId)?.name || 'Unknown Room',
            timeSlotId: timeSlotId,
            timeSlotLabel: timeSlots.find(ts => ts.id === timeSlotId).label
          });
          scheduledClassIds.add(`${classId}-${timeSlotId}`);
        }
      }
    }
    solutions.push(currentSolution);
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
    return false;
  }

  const nextUnscheduledClasses = unscheduledClasses.filter(c => c.id !== bestClassToSchedule.id);

  for (const assignment of smallestDomain) { // assignment = { classId, teacherId, roomId, timeSlotId }
    // Apply assignment
    assignmentsMap.teacher[assignment.teacherId][assignment.timeSlotId] = assignment.classId;
    assignmentsMap.room[assignment.roomId][assignment.timeSlotId] = assignment.classId;
    const classInfo = definedClasses.find(c => c.id === assignment.classId);
    for (const levelId of classInfo.eligibleLevelIds) {
      assignmentsMap.level[levelId] = assignmentsMap.level[levelId] || {}; // Ensure levelId entry exists
      assignmentsMap.level[levelId][assignment.timeSlotId] = assignment.classId;
    }

    if (solveRecursive(nextUnscheduledClasses, assignmentsMap)) {
      return true; // Propagate stop signal
    }

    // Backtrack: Remove assignment
    delete assignmentsMap.teacher[assignment.teacherId][assignment.timeSlotId];
    delete assignmentsMap.room[assignment.roomId][assignment.timeSlotId];
    for (const levelId of classInfo.eligibleLevelIds) {
      if (assignmentsMap.level[levelId]) { // Check if levelId entry exists before deleting
        delete assignmentsMap.level[levelId][assignment.timeSlotId];
      }
    }
  }
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
}

clearDataBtn.addEventListener('click', () => {
  // Basic confirmation, could be a modal
  if (confirm("Are you sure you want to reset all data and start over?")) {
    levels = []; teachers = []; rooms = []; definedClasses = []; timeSlots = []; solutions = [];

    numLevelsEl.value = "3";
    numTeachersEl.value = "2";
    numRoomsEl.value = "1";

    hideElement(namesSetupEl);
    levelsNamesSetupEl.innerHTML = '';
    teachersNamesSetupEl.innerHTML = '';
    roomsNamesSetupEl.innerHTML = '';

    hideElement(classesSectionEl);
    classNameEl.value = '';
    renderClassesList();

    hideElement(scheduleConfigSectionEl);
    populateDayCheckboxes(); // Resets to default
    populateTimeDropdowns(); // Resets to default

    hideElement(solverControlsSectionEl);
    solutionsDisplayEl.innerHTML = '<p class="text-gray-500">No schedules generated yet. Configure and run the solver.</p>';
    showAlert("All data has been reset.", "info");
  }
});

// --- INITIALIZATION ---
function init() {
  populateDayCheckboxes();
  populateTimeDropdowns();
  // Initially hide sections that depend on prior steps
  hideElement(namesSetupEl);
  hideElement(classesSectionEl);
  hideElement(scheduleConfigSectionEl);
  hideElement(solverControlsSectionEl);
}

init();