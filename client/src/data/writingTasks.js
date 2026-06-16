/**
 * Preset IELTS Writing tasks for Academic and General Training.
 * Academic Task 1 prompts describe the figure in text (a "[Figure: …]" block) so
 * the student has concrete data to write about without needing a rendered chart.
 *
 * Shape: { id, module: 'academic'|'general', task: 1|2, topic, title, text }
 */
const writingTasks = [
  // ─────────────── ACADEMIC · TASK 1 (describe visual data) ───────────────
  {
    id: 'a1-housing',
    module: 'academic',
    task: 1,
    topic: 'Housing',
    title: 'Owned vs rented homes',
    text:
      'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.\n\n[Figure: Line graph. OWNED homes rise from about 23% in 1918 to a peak of roughly 69% in 2001, then dip slightly to about 64% in 2011. RENTED homes mirror this: about 77% in 1918, falling steadily to roughly 31% in 2001, before edging up to about 36% in 2011. The two lines cross at around 50% near 1971.]',
  },
  {
    id: 'a1-transport',
    module: 'academic',
    task: 1,
    topic: 'Transport',
    title: 'Commuting methods',
    text:
      'The table below shows the main method of commuting to work in a European city in 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.\n\n[Figure: Table of percentages — 2005 → 2020. Car: 55% → 38%. Bus: 18% → 16%. Train/metro: 14% → 22%. Cycling: 6% → 16%. Walking: 7% → 8%.]',
  },

  // ─────────────── ACADEMIC · TASK 2 (essay) ───────────────
  {
    id: 'a2-technology',
    module: 'academic',
    task: 2,
    topic: 'Technology',
    title: 'Screens and children',
    text:
      'Some people believe that children should be allowed unrestricted access to the internet and digital devices, while others think their use should be strictly limited.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.',
  },
  {
    id: 'a2-environment',
    module: 'academic',
    task: 2,
    topic: 'Environment',
    title: 'Who fixes climate change',
    text:
      'Some argue that protecting the environment is the responsibility of governments, not individuals.\n\nTo what extent do you agree or disagree?\n\nWrite at least 250 words.',
  },

  // ─────────────── GENERAL TRAINING · TASK 1 (letter) ───────────────
  {
    id: 'g1-complaint',
    module: 'general',
    task: 1,
    topic: 'Complaint',
    title: 'Faulty product letter',
    text:
      'You recently bought a piece of equipment for your home, but it did not work properly.\n\nWrite a letter to the shop. In your letter:\n• describe the problem with the equipment\n• explain what happened when you tried to use it\n• say what you would like the shop to do\n\nWrite at least 150 words. Begin "Dear Sir or Madam,".',
  },
  {
    id: 'g1-friend',
    module: 'general',
    task: 1,
    topic: 'Invitation',
    title: 'Invite a friend to visit',
    text:
      'A friend from another country is planning to visit you next month.\n\nWrite a letter to your friend. In your letter:\n• say how you feel about the visit\n• suggest some things you could do together\n• give your friend some practical advice for the trip\n\nWrite at least 150 words. Begin "Dear …,".',
  },

  // ─────────────── GENERAL TRAINING · TASK 2 (essay) ───────────────
  {
    id: 'g2-work',
    module: 'general',
    task: 2,
    topic: 'Work',
    title: 'Changing jobs often',
    text:
      'In many countries, people now change jobs several times during their working lives, rather than staying with one employer.\n\nDo the advantages of this trend outweigh the disadvantages?\n\nWrite at least 250 words.',
  },
  {
    id: 'g2-community',
    module: 'general',
    task: 2,
    topic: 'Community',
    title: 'Neighbours today',
    text:
      'Some people say that people today are less friendly with their neighbours than in the past.\n\nWhy might this be the case? What can be done to improve the situation?\n\nWrite at least 250 words.',
  },
];

export default writingTasks;
