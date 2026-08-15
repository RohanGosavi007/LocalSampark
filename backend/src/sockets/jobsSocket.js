// Jobs Real-Time Socket Handler
// Powers: Application status updates, interview notifications, referral tracking

module.exports = function jobsSocket(io, socket) {
  // ═══ APPLICATION STATUS UPDATES ═══
  socket.on('jobs:join_applications', () => {
    if (socket.user?.id) {
      socket.join(`jobs_user_${socket.user.id}`);
    }
  });

  // Employer updates application stage
  socket.on('jobs:update_stage', (data) => {
    const { application_id, candidate_id, new_stage, job_title } = data;
    io.to(`jobs_user_${candidate_id}`).emit('jobs:stage_updated', {
      application_id, new_stage, job_title,
      updated_by: socket.user?.id,
      timestamp: Date.now()
    });
  });

  // ═══ INTERVIEW SCHEDULING ═══
  socket.on('jobs:interview_scheduled', (data) => {
    const { candidate_id, job_title, interview_date, interview_time, meeting_link } = data;
    io.to(`jobs_user_${candidate_id}`).emit('jobs:interview_invite', {
      job_title, interview_date, interview_time, meeting_link,
      employer_id: socket.user?.id,
      timestamp: Date.now()
    });
  });

  // ═══ JOB ALERTS ═══
  socket.on('jobs:new_posting_match', (data) => {
    const { user_ids, job } = data;
    if (Array.isArray(user_ids)) {
      user_ids.forEach(uid => {
        io.to(`jobs_user_${uid}`).emit('jobs:new_match', {
          job_id: job.id, title: job.title,
          company: job.company_name, salary: job.salary_range,
          match_score: job.match_score,
          timestamp: Date.now()
        });
      });
    }
  });

  // ═══ EMPLOYER DASHBOARD LIVE ═══
  socket.on('jobs:join_employer', (data) => {
    const { job_id } = data;
    if (job_id) socket.join(`employer_job_${job_id}`);
  });

  socket.on('jobs:new_application', (data) => {
    const { job_id, applicant_name, match_score } = data;
    io.to(`employer_job_${job_id}`).emit('jobs:application_received', {
      job_id, applicant_name, match_score,
      timestamp: Date.now()
    });
  });

  // ═══ REFERRAL TRACKING ═══
  socket.on('jobs:referral_converted', (data) => {
    const { referrer_id, job_title, bounty_amount } = data;
    io.to(`jobs_user_${referrer_id}`).emit('jobs:referral_success', {
      job_title, bounty_amount, timestamp: Date.now()
    });
  });
};
