
function checkBroadConstraints(assignmentsMap) {
  // A level cannot have classes on more than 4 different days.
  const levelDayCount = {}; // { levelId: Set<day> }
  for (const levelId of allLevels) {
    levelDayCount[levelId] = new Set();
  }

  for (const [levelId, levelSchedule] of Object.entries(assignmentsMap.level)) {
    for (let slotIndex = 0; slotIndex < levelSchedule.length; slotIndex++) {
      if (!levelSchedule[slotIndex]) continue;
      const day = allTimeSlots[slotIndex].day;
      levelDayCount[levelId].add(day);
    }
  }
  for (const levelId in levelDayCount) {
    if (levelDayCount[levelId].size > 4) {
      logFirstN(`Constraint violation: Level ${levelId} has classes on more than 5 days.`);
      return false;
    }
  }

  // A day can't have the same class name twice.
  const dayClassCount = {}; // { day: Set<className> }
  const seenClassIds = new Set();
  for (const [room, roomSchedule] of Object.entries(assignmentsMap.room)) {
    for (let slotIndex = 0; slotIndex < roomSchedule.length; slotIndex++) {
      if (!roomSchedule[slotIndex]) {
        // No class in this slot.
        continue;
      }
      const classId = roomSchedule[slotIndex];
      if (seenClassIds.has(classId)) {
        // Same class continuing into another slot.
        continue;
      }
      seenClassIds.add(classId);
      const classInfo = definedClasses.find(c => c.id === classId);
      const timeSlot = allTimeSlots[slotIndex];
      const day = timeSlot.day;
      if (!dayClassCount[day]) {
        dayClassCount[day] = new Set();
      }
      if (dayClassCount[day].has(classInfo.name)) {
        logFirstN(`Constraint violation: Class ${classInfo.name} is scheduled more than once on ${day}.`)
        return false;
      }
      dayClassCount[day].add(classInfo.name);
    }
  }

  // Add other broad constraints here if needed
  // For example, check if any teacher is scheduled for more than X consecutive hours, etc.

  return true; // All broad constraints passed
}


const SCHOOL_DAYS = new Set(["Mon", "Tue", "Thu", "Fri"]);
const SHORT_SCHOOL_DAYS = new Set(["Wed"]);
const SCHOOL_LEVELS = new Set(["level 2", "level 3", "level 4", "level 5", "level 6"]);

function getDomain(classToSchedule, currentAssignmentsMap) {
  const domain = []; // Stores { classId, teacherName, roomId, timeSlotIndex }
  const classInfo = definedClasses.find(c => c.id === classToSchedule.id);

  const allowedDays = classInfo.dayOfWeek ? new Set(classInfo.dayOfWeek) : null;

  const isSchoolAge = classInfo.levels.some(level => SCHOOL_LEVELS.has(level));

  for (const teacher of classInfo.potentialTeachers) {
    for (const room of allRooms) { // room is a string
      const numSlots = Math.round(classInfo.duration * 4);
      for (let i = 0; i < allTimeSlots.length - numSlots + 1; i++) {
        // timeSlot is {id, day, startHour, label}
        const firstTimeSlot = allTimeSlots[i];

        // For school age levels, don't schedule them too early.
        if (isSchoolAge) {
          if (SHORT_SCHOOL_DAYS.has(firstTimeSlot.day) && firstTimeSlot.startHour < 16.00) {
            continue;
          } else if (SCHOOL_DAYS.has(firstTimeSlot.day) && firstTimeSlot.startHour < 16.50) {
            continue;
          }
        }

        const lastTimeSlot = allTimeSlots[i + numSlots - 1];
        if (lastTimeSlot.day !== firstTimeSlot.day) {
          // Classes can't go to the next day!
          continue;
        }
        if (allowedDays && !allowedDays.has(firstTimeSlot.day)) {
          continue;
        }
        if (classInfo.minStartTime && firstTimeSlot.startHour < classInfo.minStartTime) {
          continue;
        }
        if (classInfo.maxEndTime &&
          firstTimeSlot.startHour + classInfo.duration > classInfo.maxEndTime) {
          continue;
        }
        let conflict = false;
        for (let j = 0; j < numSlots; j++) {
          if (conflict) break;
          const timeSlotIndex = i + j;
          // 1. Teacher conflict
          if (currentAssignmentsMap.teacher[teacher][timeSlotIndex]) {
            conflict = true;
            break;
          }
          // 2. Room conflict
          if (currentAssignmentsMap.room[room][timeSlotIndex]) {
            conflict = true;
            break;
          }
          // 3. Level conflict
          for (const levelId of classInfo.levels) {
            if (currentAssignmentsMap.level[levelId][timeSlotIndex]) {
              conflict = true;
              break;
            }
          }
        }
        if (!conflict) {
          domain.push({
            classId: classToSchedule.id, teacherName: teacher, room,
            timeSlotIndex: firstTimeSlot.index, duration: classInfo.duration,
            className: classInfo.name, timeSlotLabel: firstTimeSlot.label
          });
        }
      }
    }
  }
  return domain;
}
