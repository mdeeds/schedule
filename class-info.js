/*

Example classInfo:

[
    {
      "name": "creative Thursday",
      "levels": [
        "creative"
      ],
      "dayOfWeek": [
        "Thu"
      ],
      "start": [
        15.5
      ],
      "duration": 0.75
      "teachers": ["Christine", "Jasmine"]
    },
    {
      "name": "creative Saturday",
      "levels": [
        "pro 2", "pro 3"
      ],
      "dayOfWeek": [
        "Sat"
      ],
      "duration": 0.75,
      "start": [
        8.75
      ]
      "teachers": ["Jasmine"]
    }
 ]

*/

// Given a classInfo object, finds all unique levels and returns them as an array of objects
// Example output: [ "creative", "pro 2", "pro 3" } ]
function getAllLevels(classInfo) {
  const levels = new Set();
  for (const classObj of classInfo) {
    for (const level of classObj.levels) {
      levels.add(level);
    }
  }
  return Array.from(levels);
}

// Given a classInfo object, finds all unique teachers and returns them as an array.
// Example output: [ "Christine", "Jasmine" ]
function getAllTeachers(classInfo) {
  const teachers = new Set();
  for (const classObj of classInfo) {
    if (classObj.potentialTeachers) { // Check if teachers property exists
      for (const teacher of classObj.potentialTeachers) {
        teachers.add(teacher);
      }
    }
  }
  return Array.from(teachers);
}
