export type ExampleGrade =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";

export type ExampleStyle = "simple" | "normal" | "advanced";

export type ExampleSubject =
  | "math"
  | "reading"
  | "writing"
  | "science"
  | "history"
  | "general";

export type ExampleQuestion = {
  emoji: string;
  text: string;
};

type GradeBand = "early" | "elementary" | "middle" | "hs-early" | "hs-late";

type TopicSeed = {
  emoji: string;
  simple: string;
  normal: string;
  advanced: string;
};

function getGradeBand(grade: ExampleGrade): GradeBand {
  const value = Number(grade);
  if (value <= 2) return "early";
  if (value <= 5) return "elementary";
  if (value <= 8) return "middle";
  if (value <= 10) return "hs-early";
  return "hs-late";
}

const TOPICS: Record<
  ExampleSubject,
  Record<GradeBand, [TopicSeed, TopicSeed, TopicSeed, TopicSeed]>
> = {
  math: {
    early: [
      {
        emoji: "➕",
        simple: "Can you help me add 8 + 7 with clear steps?",
        normal: "How do I add 8 + 7?",
        advanced:
          "Why does counting on work when I add 8 + 7, and how else could I solve it?",
      },
      {
        emoji: "➖",
        simple: "Show me a simple way to subtract 15 − 6.",
        normal: "How do I subtract 15 − 6?",
        advanced:
          "Explain different strategies for 15 − 6 and when each one is useful.",
      },
      {
        emoji: "🔢",
        simple: "Can you make place value easier to understand with an example?",
        normal: "What does place value mean with the number 47?",
        advanced:
          "How does place value help me compare 47 and 74, and why does the digit position matter?",
      },
      {
        emoji: "📐",
        simple: "Explain shapes like triangles and squares in really clear steps.",
        normal: "How can I tell a triangle apart from a square?",
        advanced:
          "What properties make a triangle different from a square, and how do those properties help me classify shapes?",
      },
    ],
    elementary: [
      {
        emoji: "✖️",
        simple:
          "Can you explain multi-digit multiplication in really clear steps?",
        normal: "How do I multiply 36 × 4?",
        advanced:
          "Why does the standard algorithm for 36 × 4 work, and how is it connected to place value?",
      },
      {
        emoji: "➗",
        simple: "Show me a simple example of dividing with a remainder.",
        normal: "How do I solve 53 ÷ 4?",
        advanced:
          "What does the remainder mean in 53 ÷ 4, and how can I check that my answer is reasonable?",
      },
      {
        emoji: "🧩",
        simple: "Can you make fractions easier to understand with a clear example?",
        normal: "How do I compare 3/4 and 2/3?",
        advanced:
          "Explain how to compare 3/4 and 2/3 using equivalent fractions and why that method works.",
      },
      {
        emoji: "📏",
        simple: "Help me find the area of a rectangle with clear steps.",
        normal: "How do I find the area of a 7 by 5 rectangle?",
        advanced:
          "Why is area length × width for a rectangle, and how does that connect to counting unit squares?",
      },
    ],
    middle: [
      {
        emoji: "➗",
        simple: "Can you help me solve 3x + 7 = 22 with clear steps?",
        normal: "How do I solve 3x + 7 = 22?",
        advanced:
          "Solve 3x + 7 = 22 and explain the inverse operations and why each step preserves equality.",
      },
      {
        emoji: "📐",
        simple: "Explain the Pythagorean theorem with a simple example.",
        normal: "How do I use the Pythagorean theorem to find a missing side?",
        advanced:
          "When can I use the Pythagorean theorem, and how does it connect to right triangles and distance?",
      },
      {
        emoji: "📈",
        simple: "Can you make slope easier to understand with clear steps?",
        normal: "What does slope mean in a linear equation?",
        advanced:
          "How does slope describe rate of change in a linear relationship, and how do I interpret it from a graph and an equation?",
      },
      {
        emoji: "🎲",
        simple: "Show me a simple probability example with a clear explanation.",
        normal: "What is the probability of rolling an even number on a fair die?",
        advanced:
          "How do I calculate the probability of rolling an even number, and what assumptions make that calculation valid?",
      },
    ],
    "hs-early": [
      {
        emoji: "ƒ",
        simple: "Can you explain functions in really clear steps with an example?",
        normal: "What is a function, and how do I tell if a relation is a function?",
        advanced:
          "How do domain and range relate to whether a relation is a function, and why does the vertical line test work?",
      },
      {
        emoji: "📐",
        simple: "Help me with right-triangle trigonometry using clear steps.",
        normal: "How do I use sine, cosine, and tangent in a right triangle?",
        advanced:
          "When should I use sine, cosine, or tangent, and how do those ratios connect to similar triangles?",
      },
      {
        emoji: "➗",
        simple: "Can you make quadratic equations easier to understand?",
        normal: "How do I solve x² − 5x + 6 = 0?",
        advanced:
          "Solve x² − 5x + 6 = 0 using factoring and explain how the solutions relate to the graph of the parabola.",
      },
      {
        emoji: "📊",
        simple: "Explain systems of equations with a simple example.",
        normal: "How do I solve a system of two linear equations?",
        advanced:
          "Compare substitution and elimination for linear systems and explain when each method is more efficient.",
      },
    ],
    "hs-late": [
      {
        emoji: "ƒ",
        simple: "Can you explain inverse functions in clear steps?",
        normal: "How do I find the inverse of a function?",
        advanced:
          "How do I determine whether a function has an inverse, and what does invertibility mean graphically and algebraically?",
      },
      {
        emoji: "📈",
        simple: "Make exponential functions easier to understand with an example.",
        normal: "How do exponential growth and decay work?",
        advanced:
          "How do growth rate and initial value shape an exponential model, and how does that differ from linear change?",
      },
      {
        emoji: "∑",
        simple: "Can you walk through sequences and series with clear steps?",
        normal: "What is the difference between an arithmetic and a geometric sequence?",
        advanced:
          "How can I derive formulas for arithmetic and geometric sequences, and when is each model appropriate?",
      },
      {
        emoji: "📉",
        simple: "Explain limits in really clear, simple language.",
        normal: "What does a limit mean in precalculus?",
        advanced:
          "How do limits describe end behavior and continuity, and how can I reason about a limit from a graph and a table?",
      },
    ],
  },
  reading: {
    early: [
      {
        emoji: "📖",
        simple: "Can you help me find the main idea with clear steps?",
        normal: "How do I find the main idea of a short story?",
        advanced:
          "How can details in a story help me decide which idea is the main idea and which ones are just supporting?",
      },
      {
        emoji: "🧠",
        simple: "Show me a simple way to make an inference from a story.",
        normal: "What is an inference in reading?",
        advanced:
          "How do readers combine text clues and background knowledge to make a strong inference?",
      },
      {
        emoji: "🔤",
        simple: "Can you make vocabulary-in-context easier to understand?",
        normal: "How can I figure out a hard word from the sentence around it?",
        advanced:
          "What context clues help me determine a word’s meaning, and how do I check that my guess makes sense?",
      },
      {
        emoji: "👤",
        simple: "Help me understand a character’s feelings with a clear example.",
        normal: "How can I tell how a character is feeling?",
        advanced:
          "What evidence in a character’s words and actions reveals motivation and feelings?",
      },
    ],
    elementary: [
      {
        emoji: "📖",
        simple: "Can you explain main idea and supporting details clearly?",
        normal: "How do I tell the main idea from supporting details?",
        advanced:
          "How do authors structure paragraphs so supporting details build toward a main idea?",
      },
      {
        emoji: "🎭",
        simple: "Make character motivation easier to understand with an example.",
        normal: "Why might a character make a certain choice in a story?",
        advanced:
          "How can I use dialogue, actions, and conflict to analyze a character’s motivation?",
      },
      {
        emoji: "🎯",
        simple: "Explain author’s purpose in really clear steps.",
        normal: "How do I figure out an author’s purpose?",
        advanced:
          "How do word choice and text structure help reveal whether an author wants to persuade, inform, or entertain?",
      },
      {
        emoji: "🔍",
        simple: "Show me a simple way to use text evidence.",
        normal: "How do I use evidence from the text to support my answer?",
        advanced:
          "What makes textual evidence strong, and how should I explain how a quote supports my claim?",
      },
    ],
    middle: [
      {
        emoji: "🌟",
        simple: "Can you explain theme with a clear, simple example?",
        normal: "How do I find the theme of a story?",
        advanced:
          "How is theme different from the plot summary, and how do repeated ideas reveal theme?",
      },
      {
        emoji: "🧠",
        simple: "Help me practice inference with clear steps.",
        normal: "How do I make an inference about a character’s decision?",
        advanced:
          "How can I evaluate whether an inference is well supported or too much of a stretch?",
      },
      {
        emoji: "🗣️",
        simple: "Make point of view easier to understand.",
        normal: "How does point of view change the way a story feels?",
        advanced:
          "How does first-person versus third-person narration affect reliability and reader perspective?",
      },
      {
        emoji: "📚",
        simple: "Explain figurative language with a simple example.",
        normal: "What is the difference between a simile and a metaphor?",
        advanced:
          "How do simile and metaphor create different effects on tone and imagery?",
      },
    ],
    "hs-early": [
      {
        emoji: "🎭",
        simple: "Can you explain symbolism in clear steps?",
        normal: "How do I identify symbolism in a passage?",
        advanced:
          "How can I analyze how a symbol develops meaning across a text rather than just naming it?",
      },
      {
        emoji: "🎵",
        simple: "Make tone easier to understand with an example.",
        normal: "How do I determine the tone of a passage?",
        advanced:
          "Which diction and syntax choices create tone, and how can tone shift within a text?",
      },
      {
        emoji: "🧾",
        simple: "Help me use textual evidence more clearly.",
        normal: "How should I embed a quote to support a claim?",
        advanced:
          "How do I select the most precise evidence and analyze it instead of only summarizing?",
      },
      {
        emoji: "🧭",
        simple: "Explain author’s purpose and audience in simple language.",
        normal: "How do purpose and audience shape an informational text?",
        advanced:
          "How do rhetorical choices change when an author writes for different audiences and purposes?",
      },
    ],
    "hs-late": [
      {
        emoji: "🧠",
        simple: "Can you explain literary analysis in really clear steps?",
        normal: "How do I write a strong literary analysis claim?",
        advanced:
          "How can I craft a nuanced claim that links literary devices to a text’s larger meaning?",
      },
      {
        emoji: "⚖️",
        simple: "Make comparing two texts easier to understand.",
        normal: "How do I compare themes across two passages?",
        advanced:
          "How should I compare authors’ methods and perspectives without forcing a shallow similarity?",
      },
      {
        emoji: "🗣️",
        simple: "Explain rhetorical appeals with a simple example.",
        normal: "What are ethos, pathos, and logos in an argument?",
        advanced:
          "How do ethos, pathos, and logos interact in a persuasive text, and how can I evaluate their effectiveness?",
      },
      {
        emoji: "🔎",
        simple: "Help me analyze ambiguous meaning more clearly.",
        normal: "How do I interpret an ambiguous passage?",
        advanced:
          "How can I weigh competing interpretations and justify the stronger reading with evidence?",
      },
    ],
  },
  writing: {
    early: [
      {
        emoji: "✏️",
        simple: "Can you help me fix this sentence with clear steps: “me and him goed to the park”?",
        normal: "How can I improve the sentence “me and him goed to the park”?",
        advanced:
          "What grammar and clarity problems are in “me and him goed to the park,” and how should I revise it?",
      },
      {
        emoji: "📝",
        simple: "Show me a simple way to organize a short paragraph.",
        normal: "How do I start a paragraph about my favorite animal?",
        advanced:
          "How can a topic sentence and supporting details make a paragraph about my favorite animal clearer?",
      },
      {
        emoji: "🔗",
        simple: "Can you explain transitions in a really clear way?",
        normal: "What words can help me connect two sentences?",
        advanced:
          "How do transition words change the relationship between two ideas in neighboring sentences?",
      },
      {
        emoji: "💬",
        simple: "Help me add details to my writing with a simple example.",
        normal: "How can I make my story more interesting with details?",
        advanced:
          "Which sensory and specific details strengthen a narrative without making it confusing?",
      },
    ],
    elementary: [
      {
        emoji: "✏️",
        simple: "Can you help me revise a weak sentence clearly?",
        normal: "How can I make the sentence “The trip was fun” stronger?",
        advanced:
          "How can precise nouns and verbs turn “The trip was fun” into a more vivid sentence?",
      },
      {
        emoji: "🧱",
        simple: "Explain how to organize a paragraph with clear steps.",
        normal: "What should go in a well-organized informative paragraph?",
        advanced:
          "How do topic sentences, evidence, and concluding sentences work together in an informative paragraph?",
      },
      {
        emoji: "🎯",
        simple: "Make thesis statements easier to understand.",
        normal: "What is a thesis statement in an opinion essay?",
        advanced:
          "What makes a thesis arguable and specific enough to guide an entire opinion essay?",
      },
      {
        emoji: "🔁",
        simple: "Show me a simple revision checklist.",
        normal: "How should I revise a draft for clarity?",
        advanced:
          "How do I prioritize revision for ideas, organization, and wording instead of only fixing spelling?",
      },
    ],
    middle: [
      {
        emoji: "🎯",
        simple: "Can you explain thesis statements with a clear example?",
        normal: "How do I write a thesis for an argument essay?",
        advanced:
          "How can I strengthen a thesis so it takes a clear position and previews the reasoning?",
      },
      {
        emoji: "🔗",
        simple: "Help me use transitions more clearly between paragraphs.",
        normal: "What transitions work well between body paragraphs?",
        advanced:
          "How do transitions signal logical relationships like contrast, cause, and emphasis across paragraphs?",
      },
      {
        emoji: "🧾",
        simple: "Explain how to support a claim with evidence in simple steps.",
        normal: "How do I explain evidence after I include a quote?",
        advanced:
          "How should commentary connect evidence back to the claim without repeating the quote?",
      },
      {
        emoji: "✍️",
        simple: "Can you make grammar revision easier to understand?",
        normal: "How do I fix run-on sentences?",
        advanced:
          "What strategies can I use to revise run-ons while preserving my intended emphasis and rhythm?",
      },
    ],
    "hs-early": [
      {
        emoji: "🎯",
        simple: "Walk me through writing a clearer thesis step by step.",
        normal: "How do I write a stronger literary analysis thesis?",
        advanced:
          "How can a literary thesis move beyond plot summary to make an interpretive argument?",
      },
      {
        emoji: "🧱",
        simple: "Can you explain argument structure in simple language?",
        normal: "How should I organize a persuasive essay?",
        advanced:
          "How do claim, counterclaim, and rebuttal strengthen an argument’s structure?",
      },
      {
        emoji: "🔁",
        simple: "Show me a simple way to revise for concision.",
        normal: "How can I cut wordiness from my essay?",
        advanced:
          "Which revision techniques improve precision and concision without losing necessary nuance?",
      },
      {
        emoji: "🔗",
        simple: "Help me improve sentence variety with clear examples.",
        normal: "How can I vary my sentence structure?",
        advanced:
          "How does intentional sentence variety affect emphasis, pacing, and tone in academic writing?",
      },
    ],
    "hs-late": [
      {
        emoji: "🧠",
        simple: "Can you explain synthesis writing in clear steps?",
        normal: "How do I write a synthesis paragraph using two sources?",
        advanced:
          "How can I put two sources in conversation so my synthesis creates a new insight rather than a summary?",
      },
      {
        emoji: "⚖️",
        simple: "Make counterarguments easier to understand.",
        normal: "How should I address a counterargument in my essay?",
        advanced:
          "How do I fairly represent an opposing view and then refute it with stronger reasoning and evidence?",
      },
      {
        emoji: "🎯",
        simple: "Help me refine a thesis with a simple revision process.",
        normal: "How can I revise a broad thesis into a more precise claim?",
        advanced:
          "What qualities distinguish a sophisticated claim from a vague or obvious thesis?",
      },
      {
        emoji: "✍️",
        simple: "Explain stylistic revision in really clear language.",
        normal: "How do I improve voice and clarity in academic writing?",
        advanced:
          "How can diction, syntax, and hedging language be revised to create a more authoritative academic voice?",
      },
    ],
  },
  science: {
    early: [
      {
        emoji: "🌱",
        simple: "Can you explain what plants need to grow in clear steps?",
        normal: "What do plants need to grow?",
        advanced:
          "How do water, light, and soil each help a plant survive, and what happens if one is missing?",
      },
      {
        emoji: "🌤️",
        simple: "Make weather easier to understand with a simple example.",
        normal: "What is the difference between weather and a season?",
        advanced:
          "How can I tell short-term weather patterns apart from longer seasonal changes?",
      },
      {
        emoji: "🧲",
        simple: "Show me a simple way to understand magnets.",
        normal: "How do magnets attract and repel?",
        advanced:
          "Why do magnets attract or repel, and how can I test that with a fair investigation?",
      },
      {
        emoji: "🐾",
        simple: "Explain animal habitats in really clear steps.",
        normal: "How does a habitat help an animal survive?",
        advanced:
          "How do habitat features meet an animal’s needs for food, water, shelter, and safety?",
      },
    ],
    elementary: [
      {
        emoji: "🍃",
        simple: "Can you explain photosynthesis with clear, simple steps?",
        normal: "What is photosynthesis?",
        advanced:
          "How do plants use light, water, and carbon dioxide in photosynthesis, and why does that matter for animals?",
      },
      {
        emoji: "🪨",
        simple: "Make the water cycle easier to understand.",
        normal: "How does the water cycle work?",
        advanced:
          "How are evaporation, condensation, and precipitation connected as a system?",
      },
      {
        emoji: "🔬",
        simple: "Help me understand variables in an experiment clearly.",
        normal: "What is an independent variable in a science experiment?",
        advanced:
          "How do independent, dependent, and controlled variables work together in a fair test?",
      },
      {
        emoji: "🌍",
        simple: "Explain why seasons happen in really clear steps.",
        normal: "Why do seasons happen?",
        advanced:
          "How does Earth’s tilt and orbit cause seasonal changes in sunlight and temperature?",
      },
    ],
    middle: [
      {
        emoji: "⚛️",
        simple: "Can you explain atoms and molecules with a simple example?",
        normal: "What is the difference between an atom and a molecule?",
        advanced:
          "How do atoms form molecules, and how does that connect to chemical versus physical change?",
      },
      {
        emoji: "🔋",
        simple: "Make kinetic and potential energy easier to understand.",
        normal: "What is the difference between kinetic and potential energy?",
        advanced:
          "How can energy transform between kinetic and potential forms in a real-world system?",
      },
      {
        emoji: "🧬",
        simple: "Explain cells in clear steps with a simple example.",
        normal: "What are the main parts of an animal cell?",
        advanced:
          "How do key organelles work together as a system inside an animal cell?",
      },
      {
        emoji: "🌋",
        simple: "Help me understand plate tectonics more clearly.",
        normal: "How do plate tectonics cause earthquakes?",
        advanced:
          "How do different plate boundaries produce different geologic events, and what evidence supports that?",
      },
    ],
    "hs-early": [
      {
        emoji: "⚗️",
        simple: "Can you explain balancing chemical equations with clear steps?",
        normal: "How do I balance a chemical equation?",
        advanced:
          "Why must chemical equations be balanced, and how does that connect to conservation of mass?",
      },
      {
        emoji: "⚡",
        simple: "Make Newton’s laws easier to understand with an example.",
        normal: "What is Newton’s second law?",
        advanced:
          "How does F = ma describe the relationship among force, mass, and acceleration in real situations?",
      },
      {
        emoji: "🧬",
        simple: "Explain DNA and traits in really clear language.",
        normal: "How does DNA relate to inherited traits?",
        advanced:
          "How do genes, alleles, and DNA base sequences connect to variation in traits?",
      },
      {
        emoji: "🌌",
        simple: "Help me understand scientific models with a simple example.",
        normal: "Why do scientists use models?",
        advanced:
          "What makes a scientific model useful, and what limitations should I watch for when using one?",
      },
    ],
    "hs-late": [
      {
        emoji: "⚛️",
        simple: "Can you explain equilibrium in chemistry with clear steps?",
        normal: "What is chemical equilibrium?",
        advanced:
          "How does a system at equilibrium respond to changes, and how does Le Chatelier’s principle help explain that?",
      },
      {
        emoji: "🔋",
        simple: "Make energy in reactions easier to understand.",
        normal: "What is the difference between endothermic and exothermic reactions?",
        advanced:
          "How do energy diagrams help me compare endothermic and exothermic processes?",
      },
      {
        emoji: "🧲",
        simple: "Explain electric fields in really clear language.",
        normal: "What is an electric field?",
        advanced:
          "How do electric fields describe forces on charges, and how can I reason about field direction and strength?",
      },
      {
        emoji: "🧪",
        simple: "Help me design a stronger scientific explanation step by step.",
        normal: "How do I write a claim-evidence-reasoning answer in science?",
        advanced:
          "How can I strengthen a CER explanation by choosing better evidence and linking it tightly to the claim?",
      },
    ],
  },
  history: {
    early: [
      {
        emoji: "🗓️",
        simple: "Can you explain timelines with a simple example?",
        normal: "How do I put events in order on a timeline?",
        advanced:
          "Why does chronological order matter when we study history, and how can a timeline help?",
      },
      {
        emoji: "🏛️",
        simple: "Make community helpers easier to understand.",
        normal: "How do leaders and community helpers support a town?",
        advanced:
          "How do different community roles work together, and what problems might happen if one role is missing?",
      },
      {
        emoji: "🗺️",
        simple: "Explain maps in really clear steps.",
        normal: "How can a map help me learn about a place’s history?",
        advanced:
          "What information can historical maps reveal that a written story alone might miss?",
      },
      {
        emoji: "📜",
        simple: "Show me a simple way to understand an old photograph as evidence.",
        normal: "How can a photograph be used as historical evidence?",
        advanced:
          "What can a historical photograph tell us, and what questions should we still ask about it?",
      },
    ],
    elementary: [
      {
        emoji: "⚖️",
        simple: "Can you explain cause and effect in history clearly?",
        normal: "What is an example of cause and effect in U.S. history?",
        advanced:
          "How can one historical event have multiple causes and multiple effects?",
      },
      {
        emoji: "🏛️",
        simple: "Make the American Revolution easier to understand.",
        normal: "Why did the American Revolution happen?",
        advanced:
          "Which political, economic, and social tensions most strongly contributed to the American Revolution?",
      },
      {
        emoji: "🧾",
        simple: "Help me use historical evidence with clear steps.",
        normal: "How do historians use primary sources?",
        advanced:
          "How should I evaluate a primary source’s perspective, purpose, and reliability?",
      },
      {
        emoji: "🗺️",
        simple: "Explain exploration and settlement in simple language.",
        normal: "Why did European explorers travel to the Americas?",
        advanced:
          "How did different motives for exploration lead to different consequences for Indigenous peoples and settlers?",
      },
    ],
    middle: [
      {
        emoji: "⚔️",
        simple: "Can you explain the Civil War’s causes in clear steps?",
        normal: "What caused the Civil War?",
        advanced:
          "How did slavery, sectionalism, and political conflict interact as causes of the Civil War?",
      },
      {
        emoji: "📜",
        simple: "Make the Constitution easier to understand with an example.",
        normal: "Why was the Constitution created?",
        advanced:
          "How did the Constitution attempt to balance power, and what problems from the Articles of Confederation was it trying to solve?",
      },
      {
        emoji: "🧭",
        simple: "Explain chronology with a simple historical example.",
        normal: "How do I put Reconstruction events in chronological order?",
        advanced:
          "How does understanding sequence change the way I explain causes and effects during Reconstruction?",
      },
      {
        emoji: "👥",
        simple: "Help me compare two historical perspectives clearly.",
        normal: "How can two groups view the same event differently?",
        advanced:
          "How do I compare historical perspectives without treating one side’s account as automatically complete?",
      },
    ],
    "hs-early": [
      {
        emoji: "🌍",
        simple: "Can you explain imperialism in really clear steps?",
        normal: "What were the main causes of imperialism in the late 1800s?",
        advanced:
          "How did economic, political, and ideological motives reinforce one another in late-19th-century imperialism?",
      },
      {
        emoji: "🏭",
        simple: "Make industrialization easier to understand.",
        normal: "How did industrialization change daily life?",
        advanced:
          "Which social and economic transformations from industrialization had the longest-lasting effects, and why?",
      },
      {
        emoji: "🧾",
        simple: "Help me analyze a primary source with clear steps.",
        normal: "How do I analyze a political speech as a primary source?",
        advanced:
          "How should I evaluate audience, purpose, and bias when analyzing a political speech?",
      },
      {
        emoji: "⚖️",
        simple: "Explain checks and balances in simple language.",
        normal: "How do checks and balances work in the U.S. government?",
        advanced:
          "How do checks and balances both prevent tyranny and create political tension between branches?",
      },
    ],
    "hs-late": [
      {
        emoji: "🌐",
        simple: "Can you explain the Cold War in clear, simple steps?",
        normal: "What caused the Cold War?",
        advanced:
          "How did ideology, security concerns, and postwar power vacuums combine to produce the Cold War?",
      },
      {
        emoji: "🗳️",
        simple: "Make civil rights strategies easier to understand.",
        normal: "What strategies did civil rights activists use?",
        advanced:
          "How did different civil rights strategies complement or conflict with one another, and what trade-offs did they involve?",
      },
      {
        emoji: "📉",
        simple: "Explain economic history with a simple example.",
        normal: "What caused the Great Depression?",
        advanced:
          "Which economic and policy factors most convincingly explain the onset and severity of the Great Depression?",
      },
      {
        emoji: "🔍",
        simple: "Help me compare historical interpretations clearly.",
        normal: "Why do historians disagree about the same event?",
        advanced:
          "How do different frames, evidence selections, and questions lead historians to competing interpretations?",
      },
    ],
  },
  general: {
    early: [
      {
        emoji: "🧠",
        simple: "Can you explain how to study for a quiz in clear steps?",
        normal: "How should I study for a quiz?",
        advanced:
          "Which study strategies work better than rereading, and why do they help memory?",
      },
      {
        emoji: "📚",
        simple: "Make school routines easier to understand with an example.",
        normal: "How can I keep my homework organized?",
        advanced:
          "What habits help students stay organized, and how do those habits reduce stress before deadlines?",
      },
      {
        emoji: "🗣️",
        simple: "Help me ask better questions in class with a simple example.",
        normal: "How can I ask a clearer question when I’m confused?",
        advanced:
          "How can I turn confusion into a precise question that helps a teacher know exactly what I need?",
      },
      {
        emoji: "⏱️",
        simple: "Explain time management for homework in really clear steps.",
        normal: "How can I finish homework without rushing?",
        advanced:
          "How should I prioritize homework tasks when I have several subjects due soon?",
      },
    ],
    elementary: [
      {
        emoji: "🧠",
        simple: "Can you explain note-taking in clear steps?",
        normal: "What is a good way to take notes in class?",
        advanced:
          "How can note-taking methods help me notice main ideas instead of copying everything?",
      },
      {
        emoji: "📖",
        simple: "Make reading for homework easier to understand.",
        normal: "How should I read a textbook section so I remember it?",
        advanced:
          "Which active reading strategies improve comprehension and long-term memory?",
      },
      {
        emoji: "🧪",
        simple: "Help me prepare for a science test with clear steps.",
        normal: "How should I review vocabulary before a science test?",
        advanced:
          "How can I study science vocabulary so I can explain ideas, not just memorize definitions?",
      },
      {
        emoji: "✍️",
        simple: "Explain how to check my writing before I turn it in.",
        normal: "What should I look for when editing a paragraph?",
        advanced:
          "How do I use a revision checklist that covers ideas, organization, and conventions?",
      },
    ],
    middle: [
      {
        emoji: "🧠",
        simple: "Can you explain spaced practice in really clear steps?",
        normal: "What is spaced practice, and why does it help studying?",
        advanced:
          "How does spaced practice compare with cramming for long-term understanding?",
      },
      {
        emoji: "📊",
        simple: "Make test anxiety strategies easier to understand.",
        normal: "What can I do if I get nervous during a test?",
        advanced:
          "Which strategies reduce test anxiety while still helping me think clearly about the content?",
      },
      {
        emoji: "🧭",
        simple: "Help me plan a research project with clear steps.",
        normal: "How do I start a research project without getting overwhelmed?",
        advanced:
          "How should I break a research project into stages from question to outline to draft?",
      },
      {
        emoji: "💬",
        simple: "Explain how to participate better in class discussions.",
        normal: "How can I contribute thoughtfully in a class discussion?",
        advanced:
          "How can I build on classmates’ ideas while still adding evidence and a clear point of my own?",
      },
    ],
    "hs-early": [
      {
        emoji: "🎯",
        simple: "Can you explain exam review planning with clear steps?",
        normal: "How should I plan a week of review before finals?",
        advanced:
          "How can I design a review plan that prioritizes weak areas without ignoring core concepts?",
      },
      {
        emoji: "🧾",
        simple: "Make annotating sources easier to understand.",
        normal: "How do I annotate an article for class?",
        advanced:
          "Which annotation habits help me track claims, evidence, and questions for later writing?",
      },
      {
        emoji: "🧠",
        simple: "Help me use retrieval practice with a simple example.",
        normal: "What is retrieval practice?",
        advanced:
          "Why is retrieval practice more effective than passive review, and how should I apply it across subjects?",
      },
      {
        emoji: "✍️",
        simple: "Explain how to turn notes into a study guide clearly.",
        normal: "How can I turn class notes into a useful study guide?",
        advanced:
          "How do I transform notes into a study guide that emphasizes relationships among ideas, not isolated facts?",
      },
    ],
    "hs-late": [
      {
        emoji: "🎓",
        simple: "Can you explain college-prep study habits in clear steps?",
        normal: "What study habits transfer well to college classes?",
        advanced:
          "Which independent learning habits matter most in advanced high school and early college courses, and why?",
      },
      {
        emoji: "🧠",
        simple: "Make metacognition easier to understand with an example.",
        normal: "What is metacognition in studying?",
        advanced:
          "How can metacognitive monitoring help me detect illusions of knowing before a major exam?",
      },
      {
        emoji: "📚",
        simple: "Help me balance multiple hard classes with a simple plan.",
        normal: "How should I manage time across several AP or advanced classes?",
        advanced:
          "How can I build a weekly system that balances deep work, review, and recovery across demanding courses?",
      },
      {
        emoji: "🔍",
        simple: "Explain how to evaluate online sources in clear language.",
        normal: "How do I tell if an online source is trustworthy for school research?",
        advanced:
          "What criteria should I use to evaluate authority, evidence quality, and bias in online sources?",
      },
    ],
  },
};

export function getExampleQuestions(
  subject: ExampleSubject,
  grade: ExampleGrade,
  explanationStyle: ExampleStyle
): ExampleQuestion[] {
  const band = getGradeBand(grade);
  const seeds = TOPICS[subject][band];

  return seeds.map((seed) => ({
    emoji: seed.emoji,
    text: seed[explanationStyle],
  }));
}
