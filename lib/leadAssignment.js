// utils/leadAssignment.js
import { ObjectId } from "mongodb";

export function getLeadAssignment(course) {
  if (!course) return null;

  const normalizedCourse = course.trim().toLowerCase();

  const assignmentRules = [
  {
    keywords: ["digital marketing", "digital marekting"], // typo support
    assignedTo: {
      _id: new ObjectId("6a33c7bc3d699a93dd2287f2"),
      name: "Bhavya",
    },
  },
  {
    keywords: ["azure", "azure devops", "azure + azure devops", "genai"],
    assignedTo: {
      _id: new ObjectId("6a4792af5d4c50b6bec00f64"),
      name: "Urvashi",
    },
  },
  {
    keywords: [
      "openshift",
      "kubernetes",
      "openshift + kubernetes",
      "openshift and kubernetes",
    ],
    assignedTo: {
      _id: new ObjectId("6a4507369c0b2c7d69a99ab9"),
      name: "Deepanshu",
    },
  },
];

  const rule = assignmentRules.find((item) =>
    item.keywords.some((keyword) => normalizedCourse.includes(keyword))
  );

  return rule?.assignedTo || null;
}