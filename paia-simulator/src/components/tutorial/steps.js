const tutorialSteps = [
    {
      title: 'Quick Start',
      description: 'A quick guide: add actors, create connections, and start the simulation.',
      // opcional: image: '/tutorial/step1.png', alt: 'Quick start modal'
    },
    {
      title: 'Add Actors',
      description: 'Use the right sidebar to add a Simple Human or Simple AI actor to the canvas.',
      selector: '[data-tour="add-actors"]',
      placement: 'left',
    },
    {
      title: 'Create PAIA Agent',
      description: 'Open "Create PAIA agent" to customize name, description, personality and make it public.',
      selector: '[data-tour="create-paia-agent"]',
      placement: 'left',
    },
    {
      title: 'Connect Actors',
      description: 'Drag from one node to another to create connections between actors.',
      selector: '[data-tour="connect-actors"]',
      placement: 'left',
    },
    {
      title: 'Save Your Flow',
      description: 'Use the Save Flow button to save your work and access it later from the library.',
      selector: '[data-tour="save-flow"]',
      placement: 'right',
    },
    {
      title: 'Start the Simulation',
      description: 'Click Run Once to execute your flow. Conversation messages and flow appear at the bottom.',
      selector: '[data-tour="start-simulation"]',
      placement: 'right',
    },
  {
    title: 'Create a Flow',
    description: 'Use this button to create your first intelligent agent flow.',
    selector: '[data-tour="create-flow"]',
    placement: 'right',
  },
  {
    title: 'My Saved Flows',
    description: 'Here you can see and manage your saved flows.',
    selector: '[data-tour="flows-section"]',
    placement: 'bottom',
  },
  {
    title: 'My Agents Tab',
    description: 'Switch to this tab to view or create your custom agents.',
    selector: '[data-tour="agents-tab"]',
    placement: 'top',
  },
  {
    title: 'Connect with Friends',
    description: 'Click here to add and collaborate with your friends.',
    selector: '[data-tour="connect-friend"]',
    placement: 'left',
  },
  {
    title: 'Show Tutorial Again',
    description: 'You can reopen this tutorial anytime using this button.',
    selector: '[data-tour="show-tutorial"]',
    placement: 'left',
  },
];

export default tutorialSteps;