import { UserAccount, MatchingInterviewer, MatchingCandidate, InterviewSession } from '@/types';

export const INITIAL_USER_ACCOUNT: UserAccount = {
  id: 'usr_me_001',
  name: 'Alex Rivera',
  email: 'alex.rivera@sutradhar.dev',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  activeRole: 'interviewer',
  candidateProfile: {
    headline: 'Senior Distributed Systems Engineer targeting Staff / Principal Roles',
    targetRoles: [
      'Staff Distributed Systems Engineer',
      'Principal Infrastructure Architect',
      'Lead Storage Engine Developer'
    ],
    domains: [
      'Distributed Consensus',
      'High-Throughput Streaming',
      'Multi-Region Cloud Architecture',
      'LSM-Tree Storage Engines'
    ],
    context: {
      careerObjectives: 'Transitioning from Senior to Staff level at top-tier distributed data infrastructure companies. Honing deep system design trade-offs, catastrophic failure scenarios, and multi-tenant partitioning strategies.',
      preferredTimezone: 'America/New_York (UTC-5)',
      weeklyAvailabilityHours: 8,
      targetCompanies: ['Databricks', 'Stripe', 'Anthropic', 'OpenAI', 'Snowflake'],
      interviewFocus: [
        'Staff-Level System Design',
        'Distributed Consensus & Fault Tolerance',
        'Concurrency & Lock-free Data Structures',
        'Staff Behavioral Leadership'
      ],
      portfolioUrl: 'https://github.com/alexrivera-eng',
      resumeNotes: 'Built multi-region active-active metadata service handling 850k ops/sec with p99 < 12ms. Authored RFCs for zero-downtime consensus partition recovery.'
    },
    skills: [
      {
        id: 'sk_c1',
        name: 'Distributed Consensus (Raft / Paxos)',
        category: 'Distributed Consensus',
        proficiency: 'Expert',
        yearsOfExperience: 6
      },
      {
        id: 'sk_c2',
        name: 'High-Throughput Storage & LSM Trees',
        category: 'Storage',
        proficiency: 'Expert',
        yearsOfExperience: 5
      },
      {
        id: 'sk_c3',
        name: 'Go & Rust Systems Programming',
        category: 'Architecture',
        proficiency: 'Expert',
        yearsOfExperience: 7
      },
      {
        id: 'sk_c4',
        name: 'Concurrency & Lock-Free Structures',
        category: 'Concurrency',
        proficiency: 'Advanced',
        yearsOfExperience: 5
      },
      {
        id: 'sk_c5',
        name: 'Kubernetes & Service Mesh Internals',
        category: 'DevOps',
        proficiency: 'Advanced',
        yearsOfExperience: 4
      }
    ],
    experience: [
      {
        id: 'exp_c1',
        title: 'Senior Distributed Systems Engineer',
        company: 'ScaleCloud Infrastructure',
        period: '2022 - Present (3+ yrs)',
        highlights: [
          'Architected global replication protocol reducing cross-datacenter latency by 42%.',
          'Spearheaded transition to Raft consensus state machine serving 10M+ daily transactions.',
          'Mentored 6 engineers and standardized system architecture review RFCs across 4 squads.'
        ]
      },
      {
        id: 'exp_c2',
        title: 'Backend Infrastructure Engineer',
        company: 'Veloce Data Systems',
        period: '2019 - 2022 (3 yrs)',
        highlights: [
          'Engineered custom time-series ingestion pipeline handling 1.2M metrics/sec on Apache Kafka.',
          'Reduced p99 GC pause times from 140ms to 8ms by refactoring memory allocations in Go runtime.'
        ]
      }
    ]
  },
  interviewerProfile: {
    headline: 'Senior Distributed Systems Engineer targeting Staff / Principal Roles',
    objectives: 'Transitioning from Senior to Staff level at top-tier distributed data infrastructure companies. Honing deep system design trade-offs, catastrophic failure scenarios, and multi-tenant partitioning strategies.',
    targetRoles: [
      'Staff Distributed Systems Engineer',
      'Principal Infrastructure Architect',
      'Lead Storage Engine Developer'
    ],
    timezone: 'America/New_York (UTC-5)',
    weeklyAvailability: '8 hours / week',
    domains: [
      'High-Scale Distributed Systems',
      'Fault-Tolerant Architecture',
      'Event-Driven Systems',
      'Technical Leadership & RFC Ownership'
    ],
    context: {
      interviewPhilosophy: 'Transitioning from Senior to Staff level at top-tier distributed data infrastructure companies. Honing deep system design trade-offs, catastrophic failure scenarios, and multi-tenant partitioning strategies.',
      sessionFormats: [
        '60m Staff System Design Deep-Dive',
        '45m Concurrency & Failure Recovery Coding',
        '45m Cross-Functional Staff Behavioral'
      ],
      availabilitySchedule: '8 hours / week (Tues & Thurs 6:00 PM – 9:30 PM EST)',
      preferredTimezone: 'America/New_York (UTC-5)',
      maxSessionsPerWeek: 4,
      hourlyHonorarium: 'Free Barter / Community Credits'
    },
    skills: [
      {
        id: 'sk_i1',
        name: 'Distributed Consensus (Raft / Paxos)',
        proficiency: 'Expert',
        category: 'Consensus',
        level: 'Staff Bar Raiser',
        interviewsConducted: 84
      },
      {
        id: 'sk_i2',
        name: 'High-Throughput Storage & LSM Trees',
        proficiency: 'Expert',
        category: 'Storage',
        level: 'Staff Bar Raiser',
        interviewsConducted: 65
      },
      {
        id: 'sk_i3',
        name: 'Go & Rust Systems Programming',
        proficiency: 'Expert',
        category: 'Architecture',
        level: 'Staff Bar Raiser',
        interviewsConducted: 52
      },
      {
        id: 'sk_i4',
        name: 'Concurrency & Lock-Free Structures',
        proficiency: 'Intermediate',
        category: 'Concurrency',
        level: 'Senior Assessor',
        interviewsConducted: 42
      },
      {
        id: 'sk_i5',
        name: 'Kubernetes & Service Mesh Internals',
        proficiency: 'Intermediate',
        category: 'DevOps',
        level: 'Senior Assessor',
        interviewsConducted: 30
      },
      {
        id: 'sk_i6',
        name: 'Catastrophic Failure Drills',
        proficiency: 'Beginner',
        category: 'Reliability',
        level: 'Domain Specialist',
        interviewsConducted: 14
      }
    ],
    experience: {
      totalInterviewsConducted: 182,
      averageRating: 4.97,
      primaryCompany: 'ScaleCloud Infrastructure',
      yearsInterviewing: 5,
      certifications: [
        'Certified Principal Interview Bar Raiser',
        'Distributed Architecture Hiring Committee Member'
      ]
    },
    jobDescriptions: [
      {
        id: 'jd_1',
        roleTitle: 'Staff Distributed Systems Engineer (Storage & Consensus)',
        note: 'Candidate will be evaluated on Raft partition recovery, zero-copy I/O throughput trade-offs, and communication during live architecture grilling.',
        timingAvailable: 'Tues & Thurs: 6:00 PM – 9:30 PM EST',
        createdAt: '2026-10-15',
        skills: [
          { id: 'jd_s1', name: 'Raft / Paxos Consensus', classification: 'Important' },
          { id: 'jd_s2', name: 'LSM-Tree Storage Engines', classification: 'Important' },
          { id: 'jd_s3', name: 'Go / Rust Concurrency', classification: 'Additional' },
          { id: 'jd_s4', name: 'Linux Kernel eBPF & Zero-Copy', classification: 'Bonus' }
        ]
      }
    ]
  }
};

export const MATCHING_INTERVIEWERS: MatchingInterviewer[] = [
  {
    id: 'int_001',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    currentTitle: 'Principal Distributed Systems Architect',
    company: 'Stripe',
    yearsExperience: 12,
    rating: 4.99,
    interviewsCount: 210,
    domains: ['Distributed Consensus', 'Financial Ledger Consistency', 'Global Multi-Region Architecture'],
    keySkills: ['Raft/Paxos', 'Idempotency Engines', 'Fault Injection', 'Capacity Planning'],
    formats: ['60m Staff System Design Deep-Dive', '45m High-Throughput Resilience'],
    availability: 'Next slot: Tomorrow at 5:00 PM EST',
    compatibilityScore: 98,
    compatibilityReason: 'Exact match on Distributed Consensus, Raft state machines, and Stripe interview rubric.',
    bio: 'Former AWS core systems engineer. Deeply passionate about distributed data consistency and helping senior candidates articulate complex consensus trade-offs.'
  },
  {
    id: 'int_002',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    currentTitle: 'Staff Infrastructure Engineer & Bar Raiser',
    company: 'Databricks',
    yearsExperience: 9,
    rating: 4.94,
    interviewsCount: 145,
    domains: ['High-Throughput Streaming', 'LSM-Tree Storage Engines', 'Kafka Internals'],
    keySkills: ['Storage Engines', 'Zero-Copy I/O', 'Memory Layout', 'Go/C++ Systems'],
    formats: ['60m Data Engine Architecture', '45m Concurrency & Lock-Free Code'],
    availability: 'Next slot: Wednesday at 6:30 PM EST',
    compatibilityScore: 95,
    compatibilityReason: 'Strong overlap in LSM storage engines, low-latency queues, and Databricks target company criteria.',
    bio: 'Runs hiring committee debriefs for Distributed Compute teams. Focuses heavily on backpressure propagation and tail latency bounds.'
  },
  {
    id: 'int_003',
    name: 'Dev Patel',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    currentTitle: 'Staff Reliability & Platform Architect',
    company: 'Netflix',
    yearsExperience: 11,
    rating: 4.92,
    interviewsCount: 168,
    domains: ['Chaos Engineering', 'Multi-Region Failover', 'Kubernetes Control Plane'],
    keySkills: ['Service Meshes', 'Circuit Breakers', 'Partition Tolerance', 'Staff Behavioral'],
    formats: ['60m Multi-Region Disaster Recovery', '45m Staff Behavioral Leadership'],
    availability: 'Next slot: Thursday at 4:00 PM EST',
    compatibilityScore: 91,
    compatibilityReason: 'Matches your focus on catastrophic resilience and cross-functional staff engineering influence.',
    bio: '11 years building global edge tier routing and chaos orchestration. Specializes in testing candidate composure when architectures degrade.'
  },
  {
    id: 'int_004',
    name: 'Sarah Lin',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    currentTitle: 'Head of Infrastructure Engineering',
    company: 'Figma',
    yearsExperience: 14,
    rating: 4.98,
    interviewsCount: 320,
    domains: ['Real-Time Collaborative Systems', 'Operational Transformation / CRDTs', 'Staff Calibration'],
    keySkills: ['CRDTs', 'WebSocket Fanout', 'Hiring Bar Calibration', 'System Design'],
    formats: ['60m Real-Time Collaborative Architecture', '45m Executive & Staff Calibration'],
    availability: 'Next slot: Friday at 2:00 PM EST',
    compatibilityScore: 87,
    compatibilityReason: 'High rating in algorithmic consistency and calibrating senior candidates for high-bar startups.',
    bio: 'Built real-time syncing engines for multiplayer canvas editors. Experienced hiring manager calibrated across tier-1 Silicon Valley firms.'
  }
];

export const MATCHING_CANDIDATES: MatchingCandidate[] = [
  {
    id: 'can_001',
    name: 'Kenji Sato',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
    headline: 'Senior Distributed Systems Engineer targeting Staff / Principal Roles',
    targetRole: 'Staff Distributed Systems Engineer',
    objective: 'Transitioning from Senior to Staff level at top-tier distributed data infrastructure companies. Honing deep system design trade-offs, catastrophic failure scenarios, and multi-tenant partitioning strategies.',
    currentCompany: 'Snowflake',
    yearsExperience: 7,
    availability: 'Weekdays: 6:00 PM – 9:00 PM EST (8 hrs/wk)',
    domains: ['Distributed Consensus', 'High-Scale Storage', 'Query Optimization'],
    keySkills: ['Raft State Machines', 'C++ / Rust', 'Distributed Locking', 'Metadata Services'],
    skills: [
      { name: 'Raft State Machines', proficiency: 'Expert' },
      { name: 'C++ / Rust', proficiency: 'Expert' },
      { name: 'Distributed Locking', proficiency: 'Intermediate' },
      { name: 'Metadata Services', proficiency: 'Intermediate' }
    ],
    preferredFormat: '60m Staff System Design Deep-Dive',
    compatibilityScore: 97,
    compatibilityReason: 'Strong alignment with your Raft consensus expertise and Staff Bar Raiser rubric.',
    careerGoals: 'Interviewing for Staff Level roles at high-throughput cloud database infrastructure teams next month.'
  },
  {
    id: 'can_002',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    headline: 'Staff Infrastructure Engineer targeting Principal Architect Panels',
    targetRole: 'Principal Cloud Platform Engineer',
    objective: 'Targeting multi-region zero-downtime failover and global transaction coordination for tier-1 hyperscale platforms.',
    currentCompany: 'Uber',
    yearsExperience: 9,
    availability: 'Evenings: 7:00 PM – 10:00 PM EST (10 hrs/wk)',
    domains: ['Event-Driven Systems', 'Multi-Region Cloud Architecture', 'Kubernetes Internals'],
    keySkills: ['Kafka', 'Service Mesh', 'Disaster Recovery', 'Golang'],
    skills: [
      { name: 'Kafka', proficiency: 'Expert' },
      { name: 'Service Mesh', proficiency: 'Expert' },
      { name: 'Disaster Recovery', proficiency: 'Intermediate' },
      { name: 'Golang', proficiency: 'Expert' }
    ],
    preferredFormat: '60m Multi-Region Resiliency Mock',
    compatibilityScore: 94,
    compatibilityReason: 'Overlaps directly with your event streaming and catastrophic failover assessment strengths.',
    careerGoals: 'Preparing for upcoming Principal Architect panels at Databricks and Anthropic.'
  },
  {
    id: 'can_003',
    name: 'David Chen',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',
    headline: 'Senior Backend Engineer targeting Staff Systems Track',
    targetRole: 'Senior Backend Engineer -> Staff Track',
    objective: 'Deepening low-level lock contention debugging, high-throughput caching consistency, and distributed lock-free architecture.',
    currentCompany: 'Shopify',
    yearsExperience: 6,
    availability: 'Weekends: 10:00 AM – 4:00 PM EST (6 hrs/wk)',
    domains: ['High-Throughput Transactions', 'Concurrency & Deadlocks', 'Distributed Caching'],
    keySkills: ['Redis Cluster', 'Lock-Free Queues', 'PostgreSQL Internals', 'Ruby/Go'],
    skills: [
      { name: 'Redis Cluster', proficiency: 'Expert' },
      { name: 'Lock-Free Queues', proficiency: 'Intermediate' },
      { name: 'PostgreSQL Internals', proficiency: 'Intermediate' },
      { name: 'Ruby/Go', proficiency: 'Beginner' }
    ],
    preferredFormat: '45m Concurrency & Lock-Free Code',
    compatibilityScore: 89,
    compatibilityReason: 'Seeking feedback on concurrency edge cases, matching your assessment specialty.',
    careerGoals: 'Needs practice identifying subtle race conditions and explaining lock contention bottlenecks under pressure.'
  },
  {
    id: 'can_004',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    headline: 'Lead Storage Architect targeting Principal Storage Engine Roles',
    targetRole: 'Principal Storage Architect',
    objective: 'Refining disk I/O kernel bottlenecks, zero-copy socket fanout, and LSM-tree write amplification trade-offs.',
    currentCompany: 'Databricks',
    yearsExperience: 11,
    availability: 'Flexible: Weekdays & Weekends (12 hrs/wk)',
    domains: ['Storage Engines', 'Zero-Copy I/O', 'Linux Kernel'],
    keySkills: ['LSM-Trees', 'Linux Kernel & eBPF', 'Storage Engines', 'Go / C++'],
    skills: [
      { name: 'LSM-Trees', proficiency: 'Expert' },
      { name: 'Linux Kernel & eBPF', proficiency: 'Expert' },
      { name: 'Storage Engines', proficiency: 'Expert' },
      { name: 'Go / C++', proficiency: 'Intermediate' }
    ],
    preferredFormat: '60m Storage Engine Deep-Dive',
    compatibilityScore: 92,
    compatibilityReason: 'Direct overlap with storage engines, LSM trees, and zero-copy performance evaluation.',
    careerGoals: 'Looking for harsh critique on storage tiering, compaction bottlenecks, and WAL durability mechanisms.'
  },
  {
    id: 'can_005',
    name: 'Ananya Patel',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=250&q=80',
    headline: 'Staff Site Reliability Engineer targeting Principal Resilience Lead',
    targetRole: 'Staff Site Reliability Engineer',
    objective: 'Practicing catastrophic cross-region partition drills, cascading circuit breaker recovery, and SLO budget negotiations.',
    currentCompany: 'Cloudflare',
    yearsExperience: 8,
    availability: 'Weekdays: 5:00 PM – 8:00 PM EST (6 hrs/wk)',
    domains: ['Reliability & Chaos', 'Service Meshes', 'Circuit Breakers'],
    keySkills: ['Chaos Engineering', 'Kubernetes Internals', 'Distributed Tracing', 'Circuit Breakers'],
    skills: [
      { name: 'Chaos Engineering', proficiency: 'Expert' },
      { name: 'Kubernetes Internals', proficiency: 'Intermediate' },
      { name: 'Distributed Tracing', proficiency: 'Intermediate' },
      { name: 'Circuit Breakers', proficiency: 'Beginner' }
    ],
    preferredFormat: '45m Chaos & Failure Injections Mock',
    compatibilityScore: 86,
    compatibilityReason: 'Seeking calibration on catastrophic failure triage and live post-mortem defense.',
    careerGoals: 'Preparing for Principal SRE evaluation panels across multi-cloud infrastructure companies.'
  }
];

export const INITIAL_SESSIONS: InterviewSession[] = [
  {
    id: 'ses_001',
    candidateId: 'can_002',
    candidateName: 'Priya Sharma',
    candidateAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    candidateRole: 'Principal Cloud Platform Engineer @ Uber',
    interviewerId: 'usr_me_001',
    interviewerName: 'Alex Rivera',
    interviewerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    interviewerCompany: 'ScaleCloud Infrastructure',
    format: '60m Staff System Design Deep-Dive',
    scheduledAt: 'Tomorrow, 5:00 PM EST',
    status: 'accepted',
    originatorRole: 'interviewer',
    meetingUrl: 'https://meet.sutradhar.dev/room/staff-system-design-priya-alex',
    candidateNotes: 'Would love to focus on designing a globally distributed, idempotent ledger with Raft leader election during network partitions.',
    interviewerNotes: 'Confirmed. I have prepared a real-world multi-datacenter partition scenario with asymmetric network packet drop.'
  },
  {
    id: 'ses_002',
    candidateId: 'can_001',
    candidateName: 'Kenji Sato',
    candidateAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
    candidateRole: 'Staff Distributed Systems Engineer @ Snowflake',
    interviewerId: 'usr_me_001',
    interviewerName: 'Alex Rivera',
    interviewerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    interviewerCompany: 'ScaleCloud Infrastructure',
    format: '60m Data Engine Architecture',
    scheduledAt: 'In 3 days, 6:30 PM EST',
    status: 'pending',
    originatorRole: 'interviewer',
    candidateNotes: 'Targeting storage engine scaling; want to drill into compaction algorithms and write amplification trade-offs.'
  },
  {
    id: 'ses_003',
    candidateId: 'can_001',
    candidateName: 'Kenji Sato',
    candidateAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
    candidateRole: 'Senior Backend Engineer @ Snowflake',
    interviewerId: 'usr_me_001',
    interviewerName: 'Alex Rivera',
    interviewerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    interviewerCompany: 'ScaleCloud Infrastructure',
    format: '60m Staff System Design Deep-Dive',
    scheduledAt: 'Friday, 7:00 PM EST',
    status: 'pending',
    originatorRole: 'interviewer',
    candidateNotes: 'Hi Alex! I saw your experience with distributed consensus and LSM storage engines. I would really appreciate your evaluation on an active-active cross-region catalog service.'
  },
  {
    id: 'ses_004',
    candidateId: 'can_002',
    candidateName: 'Priya Sharma',
    candidateAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    candidateRole: 'Principal Cloud Platform Engineer @ Uber',
    interviewerId: 'usr_me_001',
    interviewerName: 'Alex Rivera',
    interviewerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    interviewerCompany: 'ScaleCloud Infrastructure',
    format: '45m Cross-Functional Staff Behavioral',
    scheduledAt: 'Saturday, 11:00 AM EST',
    status: 'accepted',
    originatorRole: 'interviewer',
    meetingUrl: 'https://meet.sutradhar.dev/room/staff-behavioral-priya-alex',
    candidateNotes: 'Excited for this! Looking to refine my storytelling for multi-quarter cross-organization infrastructure migrations.'
  },
  {
    id: 'ses_005',
    candidateId: 'can_003',
    candidateName: 'David Chen',
    candidateAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',
    candidateRole: 'Senior Backend Engineer @ Shopify',
    interviewerId: 'usr_me_001',
    interviewerName: 'Alex Rivera',
    interviewerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    interviewerCompany: 'ScaleCloud Infrastructure',
    format: '45m Concurrency & Lock-Free Code',
    scheduledAt: 'Completed 2 days ago',
    status: 'completed',
    originatorRole: 'interviewer',
    questionnaire: {
      problemSolvingRating: 4,
      technicalDepthRating: 5,
      communicationRating: 4,
      systemArchitectureRating: 5,
      overallRecommendation: 'Strong Hire',
      strengths: 'Exceptional grasp of cache line bouncing and lock-free CAS primitives. Swiftly identified potential memory reordering issues on ARM architectures.',
      areasForGrowth: 'Could articulate high-level business risk before plunging directly into byte-level optimization trade-offs.',
      detailedFeedback: 'David demonstrated staff-caliber execution when writing atomic queue implementations. He proactively walked through ABA problems and suggested double-word CAS or generation tags without prompting.',
      submittedAt: '2026-10-17T16:45:00Z'
    }
  }
];
