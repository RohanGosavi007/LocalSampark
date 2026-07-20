import React from 'react';
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function QueueReceptionDesk() {
  return (
    <div className="space-y-6">
      <div className="bg-cat-booking/10 p-6 rounded-2xl border border-cat-booking/20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cat-booking flex items-center gap-2">
            <Users className="w-6 h-6" /> Reception & Queue Desk
          </h1>
          <p className="text-text-muted text-sm mt-1">Manage walk-ins and appointments</p>
        </div>
        <Button className="bg-cat-booking hover:bg-cat-booking-dark">
          + New Walk-in Token
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Queue */}
        <div className="col-span-1 bg-background-alt p-6 rounded-2xl border border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cat-booking" /> Live Token Queue
          </h3>
          <div className="text-center p-6 border-2 border-dashed border-border rounded-xl mb-6 bg-background">
            <p className="text-text-muted text-sm font-bold uppercase mb-2">Currently Serving</p>
            <p className="text-6xl font-black text-cat-booking">#14</p>
            <Button variant="outline" className="mt-4 w-full border-cat-booking text-cat-booking">Call Next Token</Button>
          </div>
          <div className="space-y-3">
            {[15, 16, 17].map(t => (
              <div key={t} className="flex justify-between items-center p-3 rounded-lg border border-border">
                <span className="font-bold text-lg">#{t}</span>
                <span className="text-xs text-text-muted">Waiting ~10m</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments Calendar */}
        <div className="col-span-2 bg-background-alt p-6 rounded-2xl border border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cat-booking" /> Today's Appointments
          </h3>
          <div className="space-y-4">
            {['10:00 AM', '11:30 AM', '02:00 PM', '04:15 PM'].map((time, i) => (
              <div key={time} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-cat-booking/50 transition-all">
                <div className="w-20 text-center font-bold text-sm text-cat-booking bg-cat-booking/10 p-2 rounded-lg">
                  {time}
                </div>
                <div className="flex-1">
                  <p className="font-bold">Patient / Client {i + 1}</p>
                  <p className="text-sm text-text-muted">General Consultation</p>
                </div>
                <Button variant={i === 0 ? "primary" : "secondary"} className={i===0 ? "bg-cat-booking" : ""}>
                  {i === 0 ? "Check-in" : "Mark Arrived"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
