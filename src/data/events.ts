export type EventCategory = "tournament" | "practice" | "workshop" | "selection";

export interface DebateEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  location: {
    label: string;
    isOnline: boolean;
    link?: string;
  };
  category: EventCategory;
  description: string;
  registrationUrl?: string;
  reminderOffsetMinutes?: number;
  organizers?: string;
  featured?: boolean;
}

export const debateEvents: DebateEvent[] = [
  {
    id: "nsu-pre-worlds",
    title: "NSU Pre-Worlds BP",
    start: "2025-02-08T09:00:00",
    end: "2025-02-09T18:00:00",
    category: "tournament",
    location: {
      label: "NSU Campus, Dhaka",
      isOnline: false,
    },
    description:
      "Two-day British Parliamentary tournament. 5 pre-elim rounds + break to open & novice semis. Adjudication core from SAU & NSU alumni.",
    registrationUrl: "https://example.com/register/nsu-pre-worlds",
    reminderOffsetMinutes: 24 * 60,
    organizers: "NSUDC ExCom",
    featured: true,
  },
  {
    id: "weekly-practice",
    title: "Weekly Practice Round",
    start: "2025-01-31T19:00:00",
    end: "2025-01-31T21:00:00",
    category: "practice",
    location: {
      label: "Zoom Room A",
      isOnline: true,
      link: "https://example.com/zoom/practice-a",
    },
    description:
      "Impromptu BP practice. 15 mins prep, 5 teams cap, WUDC speaker timings. Feedback led by seniors with flows shared after rounds.",
    registrationUrl: "https://example.com/rsvp/practice",
    reminderOffsetMinutes: 60,
    organizers: "Training Dept.",
  },
  {
    id: "equity-workshop",
    title: "Equity & Adjudication Workshop",
    start: "2025-02-04T17:00:00",
    end: "2025-02-04T19:00:00",
    category: "workshop",
    location: {
      label: "Hybrid — Room 203 + Zoom",
      isOnline: true,
      link: "https://example.com/zoom/workshop",
    },
    description:
      "Deep-dive on equity policy, clash calls, and chairing best practices. Includes mock panels and live ballot writing.",
    registrationUrl: "https://example.com/register/workshop-equity",
    reminderOffsetMinutes: 6 * 60,
    organizers: "Equity Team",
    featured: true,
  },
  {
    id: "freshers-selection",
    title: "Freshers' Selection Scrims",
    start: "2025-02-11T10:30:00",
    end: "2025-02-11T14:00:00",
    category: "selection",
    location: {
      label: "Room 104, Humanities Building",
      isOnline: false,
    },
    description:
      "Scrimmages to select freshers roster for intra-varsity. APDA format, 7-minute speeches, feedback with individual action items.",
    registrationUrl: "https://example.com/signup/freshers",
    reminderOffsetMinutes: 180,
    organizers: "Coaches",
  },
  {
    id: "regional-open",
    title: "Regional Open Prep Session",
    start: "2025-02-06T18:00:00",
    end: "2025-02-06T20:00:00",
    category: "practice",
    location: {
      label: "Google Meet",
      isOnline: true,
      link: "https://example.com/meet/prep",
    },
    description:
      "Prep lab for teams heading to the Regional Open. Motion drilling, POI strategy, and panel Q&A.",
    registrationUrl: "https://example.com/rsvp/prep",
    reminderOffsetMinutes: 90,
    organizers: "Coaches",
  },
  {
    id: "judge-recruit",
    title: "Judge Recruitment & Onboarding",
    start: "2025-02-02T16:00:00",
    end: "2025-02-02T17:30:00",
    category: "workshop",
    location: {
      label: "Hybrid — Room 210 + Zoom",
      isOnline: true,
      link: "https://example.com/zoom/judges",
    },
    description:
      "Crash course for new judges. Covers role fulfillment, note-taking frameworks, and efficient RFD structuring.",
    reminderOffsetMinutes: 24 * 60,
    organizers: "Adjudication Core",
  },
];
