import React from 'react';
import ManagerLayout from './components/ManagerLayout';

export default function EducationEventsManager() {
  const tabs = [
    { name: 'Course Listing' },
    { name: 'Attendee Roster' },
    { name: 'Ticket Sales' },
    { name: 'Batch Scheduling' },
    { name: 'Payments' },
    { name: 'Announcements' }
  ];

  return <ManagerLayout title="Education/Events" icon="school" tabs={tabs} />;
}
