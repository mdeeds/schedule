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


function renderSolutionAsHtmlElements(solution) {
  const solutionsDisplayEl = document.getElementById('solutionsDisplay');
  solutionsDisplayEl.innerHTML = '';


  const PIXELS_PER_QUARTER_HOUR = 25;

  const solutionsDiv = document.createElement('div');
  solutionsDiv.style.display = 'flex'; // Arrange columns horizontally

  // Column 1: Time Slots
  const timeSlotColumn = document.createElement('div');
  timeSlotColumn.style.width = '100px'; // Adjust width as needed
  timeSlotColumn.style.borderRight = '1px solid #ccc';
  for (const timeSlot of allTimeSlots) {
    const timeSlotDiv = document.createElement('div');
    timeSlotDiv.innerText = timeSlot.label;
    timeSlotDiv.style.height = `${PIXELS_PER_QUARTER_HOUR}px`;
    timeSlotDiv.style.fontSize = '0.75em';
    timeSlotDiv.style.borderBottom = '1px dotted #eee';
    timeSlotColumn.appendChild(timeSlotDiv);
  }
  solutionsDiv.appendChild(timeSlotColumn);

  // Columns 2 onwards: Rooms
  for (const room of allRooms) {
    const roomColumn = document.createElement('div');
    roomColumn.classList.add('room');


    let currentTimeSlotIndex = 0;
    const classesInRoom = solution.filter(item => item.roomName === room);

    for (const scheduledClass of classesInRoom) {
      const startSlotIndex = scheduledClass.timeSlotIndex;
      const numSlots = Math.round(scheduledClass.duration * 4);

      // Add "free" space before the class
      const freeSpaceHeight = (startSlotIndex - currentTimeSlotIndex) * PIXELS_PER_QUARTER_HOUR;
      if (freeSpaceHeight > 0) {
        const freeDiv = document.createElement('div');
        freeDiv.style.height = `${freeSpaceHeight}px`;
        roomColumn.appendChild(freeDiv);
      }

      const classDiv = document.createElement('div');
      classDiv.classList.add('scheduled-class');
      classDiv.innerText = `${scheduledClass.className} (${scheduledClass.teacherName})`;
      classDiv.style.height = `${numSlots * PIXELS_PER_QUARTER_HOUR}px`;
      classDiv.style.border = '1px solid #333';
      roomColumn.appendChild(classDiv);

      currentTimeSlotIndex = startSlotIndex + numSlots;
    }

    // Add remaining "free" space at the end
    const remainingFreeSpaceHeight = (allTimeSlots.length - currentTimeSlotIndex) * PIXELS_PER_QUARTER_HOUR;
    if (remainingFreeSpaceHeight > 0) {
      const freeDiv = document.createElement('div');
      freeDiv.style.height = `${remainingFreeSpaceHeight}px`;
      roomColumn.appendChild(freeDiv);
    }

    solutionsDiv.appendChild(roomColumn);
  }

  solutionsDisplayEl.appendChild(solutionsDiv);
}


function renderSolution(solution) {
  renderSolutionAsHtmlElements(solution);
}