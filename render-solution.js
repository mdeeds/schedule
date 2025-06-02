// From script.js:
// let allTimeSlots = []; // { id, day, startHour, label }
// const solutionsDisplayEl = document.getElementById('solutionsDisplay');
// let allrooms = [];  // string


// A scheduled class:
// currentSolution.push({
//   classId: classId,
//   className: classInfo.name,
//   teacherName,
//   roomName: roomFound, // Using roomId as roomName
//   timeSlotIndex: slotIndex,
//   timeSlotLabel: allTimeSlots[slotIndex].label,
//   duration: classInfo.duration // Useful for verifying/displaying
// });

// Renders a solution as a simple HTML table.
function renderSolutionAsHtmlTable(solution) {
  const solutionCard = document.createElement('div');
  solutionCard.className = 'card';

  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold text-indigo-600 mb-3';
  title.textContent = `Schedule`;
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
}


// Renders a solution as a visual schedule using HTML elements.
function renderSolutionAsHtmlElements(solution) {
  const solutionsDisplayEl = document.getElementById('solutionsDisplay');
  solutionsDisplayEl.innerHTML = '';

  const PIXELS_PER_QUARTER_HOUR = 25;

  const solutionsDiv = document.createElement('div');
  solutionsDiv.style.display = 'grid';
  // Create a grid template for 6 days, each with a time column and room columns
  const gridTemplateColumns = DAYS_OF_WEEK.map(() => '100px repeat(2, 1fr)').join(' ');
  solutionsDiv.style.gridTemplateColumns = gridTemplateColumns;
  solutionsDiv.style.gap = '10px'; // Add some space between days

  // Group time slots by day
  const timeSlotsByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = allTimeSlots.filter(slot => slot.day === day);
    return acc;
  }, {});

  DAYS_OF_WEEK.forEach(day => {
    const dayTimeSlots = timeSlotsByDay[day];
    if (dayTimeSlots.length === 0) return; // Skip days with no defined time slots

    // Time Slot Column for the Day
    const timeSlotColumn = document.createElement('div');
    timeSlotColumn.classList.add('time-column');
    timeSlotColumn.style.borderLeft = '1px solid #ccc';
    timeSlotColumn.style.gridColumn = `span 1`; // Occupy one column in the grid
    timeSlotColumn.innerHTML = `<h4 class="day-header">${day}</h4>`;

    dayTimeSlots.forEach(timeSlot => {
      const timeSlotDiv = document.createElement('div');
      timeSlotDiv.innerText = timeSlot.label.split(' ')[1]; // Show only the time
      timeSlotDiv.style.height = `${PIXELS_PER_QUARTER_HOUR - 1}px`;
      timeSlotDiv.style.fontSize = '0.75em';
      timeSlotDiv.style.borderBottom = '1px dotted #eee';
      timeSlotColumn.appendChild(timeSlotDiv);
    });
    solutionsDiv.appendChild(timeSlotColumn);

    // Room Columns for the Day
    for (const room of allRooms) {
      const roomColumn = document.createElement('div');
      roomColumn.classList.add('room-column');
      roomColumn.innerHTML = `<h4 class="">${room}</h4>`;

      let currentTimeSlotIndex = dayTimeSlots[0].index; // Start from the first slot of the day
      const classesInRoomOnDay = solution.filter(item =>
        item.roomName === room && allTimeSlots[item.timeSlotIndex].day === day
      ).sort((a, b) => a.timeSlotIndex - b.timeSlotIndex); // Sort by time

      for (const scheduledClass of classesInRoomOnDay) {
        const startSlotIndex = scheduledClass.timeSlotIndex;
        const numSlots = Math.round(scheduledClass.duration * 4);

        // Add "free" space before the class
        const freeSlotCount = startSlotIndex - currentTimeSlotIndex;
        if (freeSlotCount > 0) {
          const freeDiv = document.createElement('div');
          freeDiv.style.height = `${freeSlotCount * PIXELS_PER_QUARTER_HOUR}px`;
          roomColumn.appendChild(freeDiv);
        }

        // Add the scheduled class block
        const classDiv = document.createElement('div');
        classDiv.classList.add('scheduled-class');
        classDiv.innerText = `${scheduledClass.className} (${scheduledClass.teacherName})`;
        classDiv.style.height = `${numSlots * PIXELS_PER_QUARTER_HOUR}px`;
        classDiv.style.border = '1px solid #333';
        classDiv.style.fontSize = '0.8em';
        classDiv.style.overflow = 'hidden';
        classDiv.style.padding = '2px';
        classDiv.style.boxSizing = 'border-box';
        classDiv.style.background = scheduledClass.color;
        classDiv.style.borderRadius = '4px';

        roomColumn.appendChild(classDiv);

        currentTimeSlotIndex = startSlotIndex + numSlots;
      }

      // Add remaining "free" space at the end of the day
      const endOfDayIndex = dayTimeSlots[dayTimeSlots.length - 1].index + 1;
      const remainingFreeSlotCount = endOfDayIndex - currentTimeSlotIndex;
      if (remainingFreeSlotCount > 0) {
        const freeDiv = document.createElement('div');
        freeDiv.style.height = `${remainingFreeSlotCount * PIXELS_PER_QUARTER_HOUR}px`;
        roomColumn.appendChild(freeDiv);
      }
      solutionsDiv.appendChild(roomColumn);
    }
  });

  solutionsDisplayEl.appendChild(solutionsDiv);
}


function renderSolution(solution) {
  // Decide which rendering function to use
  // renderSolutionAsHtmlTable(solution); // Option 1: Simple Table
  renderSolutionAsHtmlElements(solution); // Option 2: Visual Schedule
}

// Function to render the schedule in a table format (similar to the HTML elements view)
function renderScheduleTable(solution) {
  const scheduleTableEl = document.getElementById('scheduleTable');
  scheduleTableEl.innerHTML = ''; // Clear previous table

  // This function would need to be implemented to create the table structure
  // based on days, time slots, and rooms, similar to renderSolutionAsHtmlElements
  // but using table elements (<table>, <thead>, <tbody>, <tr>, <th>, <td>).
  // For now, we'll just log a message.
  console.log("Rendering schedule as table (implementation needed):", solution);

  // Example basic table structure (needs full implementation)
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Time</th><th>Mon Room 1</th><th>Mon Room 2</th>...</tr></thead><tbody></tbody>';
  scheduleTableEl.appendChild(table);
}