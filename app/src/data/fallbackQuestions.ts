export type McqQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  is_offline_fallback?: boolean;
};

export const FALLBACK_QUESTIONS: Record<string, McqQuestion[]> = {
  default: [
    {
      question: "Which data structure uses the First-In, First-Out (FIFO) principle?",
      options: ["Stack", "Queue", "Binary Search Tree", "Max Heap"],
      correct_answer: "Queue",
      explanation: "A Queue operates on the First-In, First-Out (FIFO) principle where elements are inserted at the rear and removed from the front.",
      is_offline_fallback: true,
    },
    {
      question: "What is the worst-case time complexity of QuickSort?",
      options: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
      correct_answer: "O(n^2)",
      explanation: "QuickSort exhibits O(n^2) time complexity in the worst case (e.g., when the pivot chosen is consistently the smallest or largest element on an already sorted list).",
      is_offline_fallback: true,
    },
    {
      question: "In computer networking, which layer of the OSI model does TCP operate on?",
      options: ["Network Layer", "Transport Layer", "Data Link Layer", "Session Layer"],
      correct_answer: "Transport Layer",
      explanation: "Transmission Control Protocol (TCP) operates at Layer 4 (Transport Layer) of the OSI model, providing reliable, connection-oriented data transfer.",
      is_offline_fallback: true,
    },
    {
      question: "Which of the following is an immutable data type in Python?",
      options: ["List", "Dictionary", "Tuple", "Set"],
      correct_answer: "Tuple",
      explanation: "Tuples are immutable sequences in Python; their contents cannot be modified after creation.",
      is_offline_fallback: true,
    },
    {
      question: "What is the primary function of an operating system's Virtual Memory?",
      options: [
        "Increase CPU clock speed",
        "Allow execution of processes larger than physical RAM",
        "Prevent malware execution",
        "Accelerate secondary storage access",
      ],
      correct_answer: "Allow execution of processes larger than physical RAM",
      explanation: "Virtual Memory gives processes the illusion of contiguous memory, allowing programs exceeding physical RAM capacity to execute using paging and swapping.",
      is_offline_fallback: true,
    },
  ],
  aptitude: [
    {
      question: "If a train travels 360 km at a uniform speed in 4 hours, what is its speed in m/s?",
      options: ["20 m/s", "25 m/s", "30 m/s", "35 m/s"],
      correct_answer: "25 m/s",
      explanation: "Speed = 360 km / 4 hr = 90 km/hr. Converting to m/s: 90 * (5/18) = 25 m/s.",
      is_offline_fallback: true,
    },
    {
      question: "A can finish a work in 10 days and B in 15 days. How many days will they take working together?",
      options: ["5 days", "6 days", "7.5 days", "8 days"],
      correct_answer: "6 days",
      explanation: "Combined 1-day work = (1/10) + (1/15) = (3+2)/30 = 5/30 = 1/6. Thus, together they complete it in 6 days.",
      is_offline_fallback: true,
    },
  ],
};

export function getFallbackQuestions(topic = '', _difficulty = ''): McqQuestion {
  const lower = topic.toLowerCase();
  const pool = lower.includes('aptitude') || lower.includes('math')
    ? FALLBACK_QUESTIONS.aptitude
    : FALLBACK_QUESTIONS.default;

  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
